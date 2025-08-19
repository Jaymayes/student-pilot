# ScholarLink Billing System - Go-Live Production Runbook

## T-1: Pre-flight Checklist

### ✅ Production Secrets Configuration
```bash
# Set these in Replit Secrets or production environment
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-proj-... # Production key
DATABASE_URL=postgresql://... # Production database
```

### ✅ Security Hardening
- [ ] CORS locked to production domains only
- [ ] CSP headers configured for production domains
- [ ] All staging secrets rotated (never reuse)

### ✅ Stripe Production Setup
**Products/Prices in Stripe Dashboard:**
- [ ] Starter Package: $9.99 USD → 9,990 credits
- [ ] Professional Package: $49.99 USD → 52,490 credits (5% bonus)
- [ ] Enterprise Package: $99.99 USD → 109,990 credits (10% bonus)

**Server-Side Validation:**
- ✅ Server maps `packageCode` → `price`/`credits`
- ✅ Client values ignored (security)

**Webhook Configuration:**
- [ ] Live endpoint: `https://your-domain.com/api/stripe/webhook`
- [ ] Signature verification enabled
- [ ] Idempotency confirmed

### ✅ Database Preparation
```bash
# Pre-deployment database tasks
npm run db:backup       # Create snapshot
npm run db:push --force # Apply migrations
npm run db:seed         # Seed active rate card + admin user
```

### ✅ Feature Flags & Kill Switches
```bash
# Environment configuration
BILLING_PURCHASE_ENABLED=true
BILLING_CHARGING_ENABLED=true    # KILL SWITCH
BILLING_ROUNDING_MODE=exact      # exact|ceil
BILLING_AUTO_RECHARGE=false      # Phase 2 feature
```

### ✅ Access Control
- [ ] Admin endpoints gated behind RBAC
- [ ] Audit logs enabled for admin changes
- [ ] Multi-factor authentication configured

---

## T-0: Production Smoke Test

### 🔍 API Health Check
```bash
# Test with internal account
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://your-domain.com/api/billing/summary

# Expected Response:
{
  "balanceMillicredits": "0",
  "balanceCredits": 0,
  "balanceUsd": 0.00,
  "packages": [...],
  "activeRates": [...],
  "recentLedger": [],
  "recentUsage": []
}
```

### 💳 Purchase Flow Test (Live Mode)
1. **Buy Starter Package ($9.99)**
   ```bash
   POST /api/stripe/create-checkout-session
   {
     "packageCode": "starter",
     "successUrl": "https://your-domain.com/billing?success=true",
     "cancelUrl": "https://your-domain.com/billing"
   }
   ```

2. **Verify Purchase Completion**
   - [ ] One purchase ledger entry: `+9,990` credits
   - [ ] New balance: `9,990` credits
   - [ ] Webhook idempotency: no double-grants on retry

### ⚡ Usage Deduction Test
1. **Make OpenAI Call**
   ```bash
   POST /api/ai/chat
   {
     "model": "gpt-4o-mini",
     "messages": [{"role": "user", "content": "Hello"}]
   }
   ```

2. **Verify Deduction**
   - [ ] Balance decreased correctly
   - [ ] Usage entry created
   - [ ] Ledger entry matches usage charge
   - [ ] Reconciliation: `sum(ledger) == balance`

### 🚨 Insufficient Credits Test
1. **Trigger 402 Error**
   - Set balance to 5 credits
   - Request expensive operation (gpt-4o, 10k tokens)

2. **Verify Response**
   ```json
   {
     "error": "Insufficient credits",
     "requiredCredits": 200,
     "currentCredits": 5,
     "redirectTo": "/billing?tab=credits"
   }
   ```

---

## Progressive Rollout Strategy

### Phase 1: Limited Release (5% - 30 minutes)
```bash
# Gradual user enablement
BILLING_ROLLOUT_PERCENTAGE=5
```
**Monitor:** Purchase success rate, webhook delivery, API latency

### Phase 2: Expanded Release (25% - 1 hour)
```bash
BILLING_ROLLOUT_PERCENTAGE=25
```
**Monitor:** Transaction volume, error rates, user feedback

### Phase 3: Full Release (100%)
```bash
BILLING_ROLLOUT_PERCENTAGE=100
```

### 🛑 Instant Fallbacks
```bash
# Emergency kill switches
BILLING_PURCHASE_ENABLED=false  # Disable new purchases
BILLING_CHARGING_ENABLED=false  # Pause all charges
```

---

## Observability & Monitoring Setup

### 📊 Critical Metrics to Emit

**Billing Metrics:**
```javascript
// Implement these in your metrics collection
metrics.counter('billing.credits_purchased', { package: 'starter' })
metrics.counter('billing.credits_deducted', { model: 'gpt-4o-mini' })
metrics.counter('billing.402_insufficient_credits')
```

**Stripe Metrics:**
```javascript
metrics.counter('stripe.webhook_events', { type: 'checkout.session.completed' })
metrics.counter('stripe.webhook_failures')
```

**Financial Metrics:**
```javascript
// Daily calculations
const margin = creditsDeducted / 1000 - openaiCogs
const liability = totalOutstandingCredits / 1000

metrics.gauge('finance.margin_daily_usd', margin)
metrics.gauge('finance.liability_credits_usd', liability)
```

### 🚨 Production Alerts

**Immediate Response (PagerDuty):**
- Webhook failures > 0 for 5+ minutes
- 402 spike > 10x baseline
- Reconciliation mismatch > 0.1% daily volume

**Business Alerts (Slack):**
- Negative margin day
- Outstanding liability > business threshold

### 📈 Production Dashboards

**Revenue Dashboard:**
- Daily: Purchases vs Deductions
- Daily: Revenue vs COGS vs Margin
- Weekly: Top models by cost/usage

**Operations Dashboard:**
- Outstanding credits liability trend
- Webhook success rates
- API performance metrics

---

## Daily Operations & Reconciliation

### 🔄 Automated Daily Jobs

**Balance Reconciliation:**
```sql
-- Verify: sum(ledger deltas) == current balance per user
SELECT 
  user_id,
  current_balance,
  calculated_balance,
  ABS(current_balance - calculated_balance) as variance
FROM (
  SELECT 
    cb.user_id,
    cb.balance_millicredits as current_balance,
    COALESCE(SUM(cl.amount_millicredits), 0) as calculated_balance
  FROM credit_balance cb
  LEFT JOIN credit_ledger cl ON cb.user_id = cl.user_id
  GROUP BY cb.user_id, cb.balance_millicredits
) reconciliation
WHERE variance > 100; -- Alert if > 0.1 credits variance
```

**Usage vs Ledger Reconciliation:**
```sql
-- Verify: sum(usage charges) == sum(ledger deductions)
SELECT 
  DATE(created_at) as date,
  SUM(charged_millicredits) as total_usage_charges,
  (SELECT SUM(ABS(amount_millicredits)) 
   FROM credit_ledger 
   WHERE type = 'deduction' 
   AND DATE(created_at) = DATE(ue.created_at)) as total_ledger_deductions
FROM usage_events ue
GROUP BY DATE(created_at)
HAVING ABS(total_usage_charges - total_ledger_deductions) > 1000;
```

---

## Financial Controls & Policy

### 💰 Revenue Recognition
```
Purchase:    Dr Cash              Cr Deferred Revenue (liability)
Consumption: Dr Deferred Revenue  Cr Revenue
COGS:        Dr COGS              Cr Cash/Payable (OpenAI)
```

### 🔄 Refund Policy
- **Refund Process:** Create refund ledger entry + link to purchase `referenceId`
- **Credit Refunds:** Negative ledger + positive credit adjustment
- **Cash Refunds:** Stripe refund + negative ledger entry

### 📅 Credits Policy
- **Expiration:** No expiration (builds trust)
- **Documentation:** Clear in FAQs/Terms of Service

---

## UX Trust & Transparency

### 💎 Credits Tab Messaging
- "Credits are prepaid. 1,000 Credits = $1.00"
- "You only pay for actual token usage"
- "USD equivalent is approximate"

### 📋 Financial Transparency
- Purchase rows link to Stripe receipts
- Monthly statement export (CSV/PDF)
- Real-time cost estimation

---

## Post-Launch SLOs

### 🎯 Service Level Objectives
- **Availability:** 99.95% for purchase/deduction endpoints
- **Webhook Success:** >99.9% within 5 minutes
- **Reconciliation:** 100% daily job success
- **Response Time:** <500ms for billing endpoints

### 📊 Success Metrics
- Purchase conversion rate >85%
- Webhook failure rate <0.1%
- User complaints about billing <1%
- Daily reconciliation variance <0.01%

---

## Go-Live Command Sequence

```bash
# Final deployment sequence
git checkout main
git pull origin main
npm run build
npm run test:production
npm run deploy:production

# Verify deployment
npm run smoke-test:production
npm run verify:monitoring

# Enable billing (feature flags)
export BILLING_PURCHASE_ENABLED=true
export BILLING_CHARGING_ENABLED=true

# Monitor for 30 minutes, then proceed with rollout
echo "🚀 ScholarLink Billing System is LIVE!"
```

---

## Emergency Contacts & Procedures

**On-Call Rotation:**
- Primary: [Your contact]
- Secondary: [Backup contact]

**Escalation Path:**
1. Check monitoring dashboards
2. Review recent deployments
3. Check Stripe webhook logs
4. Verify database connectivity
5. Execute rollback if necessary

**Rollback Procedure:**
```bash
# Emergency rollback
export BILLING_PURCHASE_ENABLED=false
export BILLING_CHARGING_ENABLED=false
git revert [last-deployment-commit]
npm run deploy:production
```

---

*Last Updated: January 19, 2025*  
*Status: Ready for Production Go-Live* 🚀