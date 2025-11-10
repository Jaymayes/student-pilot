# Rollback & Refund Runbook
**Application:** student_pilot  
**Maintained By:** student_pilot DRI  
**Last Updated:** 2025-11-10T22:30:00Z  
**Version:** 1.0

---

## Quick Reference

| Scenario | Runbook Section | SLA | Automation Level |
|----------|----------------|-----|------------------|
| Full refund (unused credits) | [Section 1](#section-1-full-refund-unused-credits) | <24h | Automated |
| Partial refund (some credits used) | [Section 2](#section-2-partial-refund-credits-partially-used) | <24h | Automated |
| Credit-only refund | [Section 3](#section-3-credit-only-refund-edge-cases) | <2h | Automated |
| Stripe failure | [Section 4](#section-4-stripe-failure-fallback) | <1h | Semi-automated |
| Manual override | [Section 5](#section-5-manual-admin-override) | <4h | Manual |

---

## Architecture Overview

### Refund Service Location
- **File:** `server/services/refundService.ts` (438 lines)
- **Entry Point:** `RefundService.processRefund(purchaseId, reason, adminOverride?)`
- **Database Tables:**
  - `purchases` - Transaction records
  - `credit_ledger` - Credit movements
  - `credit_balances` - User balances

### Refund Strategy Decision Tree

```
Purchase Refund Request
│
├─ Credits Used = 0 → FULL STRIPE REFUND + Full Credit Deduction
│
├─ 0 < Credits Used < Total Credits → PARTIAL STRIPE REFUND + Partial Credit Deduction
│
├─ Credits Used ≥ Total Credits → CREDIT-ONLY (no cash refund)
│
├─ Purchase Age > 90 days → CREDIT-ONLY (Stripe time limit)
│
└─ Stripe API Failure → CREDIT-ONLY + Manual Review Queue
```

---

## Section 1: Full Refund (Unused Credits)

### When to Use
- User requests refund immediately after purchase
- No credits spent on AI services
- Purchase within 90 days
- Stripe payment completed successfully

### Automated Process

**Step 1: Verify Eligibility**
```sql
SELECT 
  p.id,
  p.user_id,
  p.total_credits,
  cb.balance_millicredits,
  p.created_at,
  NOW() - p.created_at as purchase_age
FROM purchases p
JOIN credit_balances cb ON cb.user_id = p.user_id
WHERE p.id = :purchase_id
  AND p.status = 'paid';
```

**Eligibility Criteria:**
- ✅ Purchase status = 'paid'
- ✅ Purchase age ≤ 90 days
- ✅ User balance ≥ total_credits (no credits spent)

**Step 2: Process Stripe Refund**
```typescript
const refund = await stripe.refunds.create({
  payment_intent: purchase.stripe_payment_intent_id,
  amount: purchase.price_usd_cents, // Full amount
  reason: 'requested_by_customer',
  metadata: {
    purchase_id: purchase.id,
    user_id: purchase.user_id,
    app: 'student_pilot'
  }
});
```

**Step 3: Deduct Credits**
```typescript
await billingService.applyLedgerEntry({
  userId: purchase.user_id,
  type: 'refund',
  amountMillicredits: -(purchase.total_credits * 1000),
  referenceType: 'purchase',
  referenceId: purchase.id,
  metadata: {
    refund_type: 'full',
    stripe_refund_id: refund.id,
    reason: reason
  }
});
```

**Step 4: Update Purchase Record**
```sql
UPDATE purchases
SET 
  status = 'refunded',
  updated_at = NOW()
WHERE id = :purchase_id;
```

### Manual Verification
```sql
-- Check refund completion
SELECT 
  p.id,
  p.status,
  cl.type,
  cl.amount_millicredits,
  cl.created_at
FROM purchases p
LEFT JOIN credit_ledger cl ON cl.reference_id = p.id AND cl.type = 'refund'
WHERE p.id = :purchase_id;
```

**Expected Output:**
- purchases.status = 'refunded'
- credit_ledger entry: type='refund', amount=-X,000 millicredits
- credit_balances updated: balance decreased by X,000

---

## Section 2: Partial Refund (Credits Partially Used)

### When to Use
- User has spent some credits but not all
- Requesting refund for unused portion
- Purchase within 90 days

### Calculation Logic

**Step 1: Calculate Unused Credits**
```typescript
const totalCredits = purchase.total_credits;
const currentBalance = await billingService.getBalance(purchase.user_id);

// Calculate credits used
const creditsUsed = totalCredits - (currentBalance.balance_millicredits / 1000);
const creditsUnused = totalCredits - creditsUsed;

// Calculate proportional refund
const refundRatio = creditsUnused / totalCredits;
const refundAmountCents = Math.floor(purchase.price_usd_cents * refundRatio);
```

**Example:**
```
Purchase: $9.99 (999 cents) for 100 credits
Credits Used: 30
Credits Unused: 70

Refund Ratio: 70 / 100 = 0.70
Refund Amount: 999 × 0.70 = 699 cents ($6.99)
Credits to Deduct: 70,000 millicredits
```

**Step 2: Process Partial Stripe Refund**
```typescript
const refund = await stripe.refunds.create({
  payment_intent: purchase.stripe_payment_intent_id,
  amount: refundAmountCents,
  reason: 'requested_by_customer',
  metadata: {
    credits_unused: creditsUnused,
    credits_total: totalCredits,
    refund_ratio: refundRatio.toFixed(2)
  }
});
```

**Step 3: Deduct Unused Credits**
```typescript
await billingService.applyLedgerEntry({
  userId: purchase.user_id,
  type: 'refund',
  amountMillicredits: -(creditsUnused * 1000),
  referenceType: 'purchase',
  referenceId: purchase.id,
  metadata: {
    refund_type: 'partial',
    credits_unused: creditsUnused,
    credits_used: creditsUsed,
    refund_amount_usd: (refundAmountCents / 100).toFixed(2),
    stripe_refund_id: refund.id
  }
});
```

### Verification
```sql
SELECT 
  p.id as purchase_id,
  p.total_credits,
  p.price_usd_cents / 100.0 as original_price_usd,
  cl.amount_millicredits / 1000.0 as credits_refunded,
  cl.metadata->>'refund_amount_usd' as cash_refunded_usd,
  cl.metadata->>'credits_used' as credits_used
FROM purchases p
JOIN credit_ledger cl ON cl.reference_id = p.id AND cl.type = 'refund'
WHERE p.id = :purchase_id;
```

---

## Section 3: Credit-Only Refund (Edge Cases)

### When to Use
1. **All credits spent:** `creditsUsed >= totalCredits`
2. **Purchase >90 days old:** Stripe refund window expired
3. **Stripe API unavailable:** Fallback mechanism
4. **Goodwill gesture:** Admin override for customer satisfaction

### Process

**Step 1: Calculate Refund Credits**
```typescript
// For goodwill/admin cases
const refundCredits = adminOverride?.refundCredits || purchase.total_credits;

// For aged purchases (>90 days)
const refundCredits = Math.min(
  purchase.total_credits,
  currentBalance.balance_millicredits / 1000
);
```

**Step 2: Issue Credit-Only Refund**
```typescript
await billingService.applyLedgerEntry({
  userId: purchase.user_id,
  type: 'adjustment', // Not 'refund' since no cash refund
  amountMillicredits: refundCredits * 1000, // Positive = credit addition
  referenceType: 'purchase',
  referenceId: purchase.id,
  metadata: {
    refund_type: 'credit_only',
    reason: reason,
    no_cash_refund_reason: 'purchase_age_90_days' // or other reason
  }
});
```

**Step 3: Update Purchase Status**
```sql
UPDATE purchases
SET 
  status = 'credit_refunded',
  updated_at = NOW()
WHERE id = :purchase_id;
```

### User Communication Template
```
Subject: Refund Processed - Credits Issued

Hi [User],

We've processed your refund request for purchase #[ID].

Since [reason: credits were fully used / purchase is over 90 days old], 
we've issued [X] credits back to your account instead of a cash refund.

Current Balance: [X] credits
Added: [Y] credits (refund)

If you have questions, please contact support.

Thank you,
ScholarLink Team
```

---

## Section 4: Stripe Failure Fallback

### Circuit Breaker Behavior

**Implementation:** `server/services/reliabilityManager.ts`

```typescript
await reliabilityManager.executeWithProtection(
  'stripe',
  async () => {
    // Primary: Stripe refund
    return await stripe.refunds.create({ /* ... */ });
  },
  async () => {
    // Fallback: Credit-only + queue for manual review
    await billingService.applyLedgerEntry({
      type: 'adjustment',
      amountMillicredits: refundCredits * 1000,
      metadata: {
        refund_type: 'credit_only_stripe_failure',
        requires_manual_review: true,
        queued_at: new Date().toISOString()
      }
    });

    // Queue for manual processing
    await manualReviewQueue.add({
      type: 'stripe_refund_failed',
      purchase_id: purchase.id,
      user_id: purchase.user_id,
      amount_cents: purchase.price_usd_cents,
      priority: 'high'
    });

    throw new Error('Stripe unavailable. Credit issued, cash refund queued for manual review.');
  }
);
```

### Manual Review Process

**Step 1: Query Manual Review Queue**
```sql
SELECT 
  p.id as purchase_id,
  p.user_id,
  p.stripe_payment_intent_id,
  p.price_usd_cents / 100.0 as amount_usd,
  cl.metadata->>'queued_at' as queued_at,
  cl.created_at as credit_issued_at
FROM purchases p
JOIN credit_ledger cl ON cl.reference_id = p.id
WHERE cl.metadata->>'requires_manual_review' = 'true'
  AND p.status != 'refunded'
ORDER BY cl.created_at ASC;
```

**Step 2: Process Manual Stripe Refund**
```bash
# Via Stripe Dashboard or CLI
stripe refunds create \
  --payment-intent pi_xxx \
  --amount 999 \
  --reason requested_by_customer \
  --metadata[purchase_id]=xxx \
  --metadata[manual_review]=true
```

**Step 3: Mark as Resolved**
```sql
UPDATE purchases
SET 
  status = 'refunded',
  updated_at = NOW()
WHERE id = :purchase_id;
```

---

## Section 5: Manual Admin Override

### Use Cases
- Customer escalation
- Goodwill gestures
- Data quality issues
- Double-charge scenarios

### Admin API Endpoint

**Endpoint:** `POST /api/admin/refund`  
**Auth:** `SHARED_SECRET` required

**Request:**
```json
{
  "purchaseId": "purchase_xxx",
  "reason": "Customer escalation - double charge",
  "adminOverride": {
    "fullRefund": true,
    "skipBalanceCheck": true,
    "refundCredits": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "refund": {
    "purchaseId": "purchase_xxx",
    "refundType": "full",
    "stripeRefundId": "re_xxx",
    "creditsDeducted": 100000,
    "cashRefundedUsd": 9.99,
    "processedAt": "2025-11-10T22:30:00Z"
  }
}
```

### Safety Checks
```typescript
// Prevent duplicate refunds
if (purchase.status === 'refunded' || purchase.status === 'credit_refunded') {
  throw new Error('Purchase already refunded');
}

// Balance protection (unless override)
if (!adminOverride?.skipBalanceCheck) {
  const balance = await billingService.getBalance(userId);
  if (balance.balance_millicredits < refundCredits * 1000) {
    throw new Error('Insufficient balance for refund');
  }
}

// Audit trail
await auditLog.log({
  action: 'admin_refund_override',
  admin_id: req.user.id,
  purchase_id: purchaseId,
  reason: reason,
  overrides: adminOverride
});
```

---

## Monitoring & Alerts

### Key Metrics

**Daily Refund Dashboard:**
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as refund_count,
  SUM(CASE WHEN metadata->>'refund_type' = 'full' THEN 1 ELSE 0 END) as full_refunds,
  SUM(CASE WHEN metadata->>'refund_type' = 'partial' THEN 1 ELSE 0 END) as partial_refunds,
  SUM(CASE WHEN metadata->>'refund_type' = 'credit_only' THEN 1 ELSE 0 END) as credit_only,
  SUM(ABS(amount_millicredits)) / 1000.0 as total_credits_refunded
FROM credit_ledger
WHERE type IN ('refund', 'adjustment')
  AND metadata->>'refund_type' IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Alert Thresholds
- **Refund Rate >5%:** Investigate quality issues
- **Stripe Failures >3/day:** Check circuit breaker status
- **Manual Queue >10 items:** Prioritize resolution

---

## Rollback Scenarios

### Scenario A: Bad Deployment

**Symptoms:**
- Spike in errors
- Payment processing failures
- Data corruption

**Rollback Process:**
1. Stop accepting new purchases (feature flag)
2. Use Replit rollback capability to previous checkpoint
3. Verify database consistency
4. Resume operations

### Scenario B: Stripe Webhook Issues

**Symptoms:**
- Payments succeeded but credits not allocated
- Webhook delivery failures

**Resolution:**
1. Query Stripe for missing events:
   ```bash
   stripe events list --type checkout.session.completed
   ```
2. Manually replay webhooks via Stripe Dashboard
3. Verify credit allocations:
   ```sql
   SELECT p.id, p.status, cl.type
   FROM purchases p
   LEFT JOIN credit_ledger cl ON cl.reference_id = p.id AND cl.type = 'purchase'
   WHERE p.status = 'paid' AND cl.id IS NULL;
   ```

---

## Testing & Validation

### Pre-Launch Checklist
- [x] Full refund logic code review ✅
- [x] Partial refund calculation verified ✅
- [x] Credit-only edge cases handled ✅
- [x] Stripe circuit breaker tested ✅
- [x] Admin override safeguards in place ✅
- [x] Audit logging configured ✅

### Post-Launch Monitoring
- [ ] First refund processed successfully
- [ ] Partial refund calculation accurate
- [ ] Circuit breaker activates correctly
- [ ] Manual queue processed <24h SLA

---

## Escalation Path

| Issue | Severity | Contact | SLA |
|-------|----------|---------|-----|
| Refund failed (user waiting) | P1 | student_pilot DRI | <1h |
| Stripe webhook delayed | P2 | DevOps + Stripe Support | <4h |
| Data inconsistency | P1 | Database Admin + DRI | <2h |
| Policy question | P3 | Finance + CEO | <24h |

---

**Runbook Version:** 1.0  
**Maintained By:** student_pilot DRI  
**Last Reviewed:** 2025-11-10T22:30:00Z  
**Next Review:** After first 100 refunds or Nov 20, 2025
