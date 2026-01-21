# HITL Microcharge Runbook

**Run ID**: CEOSPRINT-20260121-EXEC-ZT3G-V2S2-FIX-027
**Protocol**: AGENT3_HANDSHAKE v30
**Generated**: 2026-01-21T22:52:56Z

---

## ⚠️ DO NOT EXECUTE WITHOUT HITL AUTHORIZATION ⚠️

This runbook documents the $0.50 microcharge + refund test procedure. Execution requires explicit Human-In-The-Loop (HITL) authorization from CEO/CTO.

---

## Purpose

Verify end-to-end payment flow in production with minimal financial exposure:
1. Charge $0.50 to a test card
2. Immediately refund the charge
3. Verify Stripe webhook delivery
4. Confirm revenue recognition

## Prerequisites

- [ ] SEV2 lifted (`sev2_active: false`)
- [ ] B2C capture enabled (`b2c_capture_disabled: false`)
- [ ] HITL authorization documented
- [ ] Stripe live mode verified
- [ ] Webhook endpoint configured

## Test Card (Stripe Test Mode)

If testing in Stripe test mode first:
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

## Procedure

### Step 1: Pre-flight Checks

```bash
# Verify A1 health and SEV2 status
curl -s https://scholar-auth-jamarrlmayes.replit.app/health | jq '.sev2_active'
# Expected: false (after HITL lift)

# Verify A5 health and Stripe mode
curl -s https://student-pilot-jamarrlmayes.replit.app/api/health | jq '.stripe'
# Expected: "live_mode"
```

### Step 2: Create Payment Intent

```javascript
// In A5 backend or Stripe dashboard
const paymentIntent = await stripe.paymentIntents.create({
  amount: 50, // $0.50 in cents
  currency: 'usd',
  description: 'HITL Microcharge Test - CEOSPRINT-20260121-EXEC-ZT3G-V2S2-FIX-027',
  metadata: {
    test_type: 'hitl_microcharge',
    run_id: 'CEOSPRINT-20260121-EXEC-ZT3G-V2S2-FIX-027',
    authorized_by: '<HITL_AUTHORIZER_NAME>'
  }
});
```

### Step 3: Confirm Payment

```javascript
// After card details collected
const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id, {
  payment_method: 'pm_card_visa' // Or actual PM from Elements
});

// Record confirmation
console.log({
  intent_id: confirmed.id,
  status: confirmed.status,
  amount: confirmed.amount,
  created: new Date(confirmed.created * 1000).toISOString()
});
```

### Step 4: Verify Webhook Delivery

```bash
# Check A5 webhook logs
curl -s https://student-pilot-jamarrlmayes.replit.app/api/webhooks/stripe/log \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.[-1]'

# Expected event types:
# - payment_intent.created
# - payment_intent.succeeded
# - charge.succeeded
```

### Step 5: Immediate Refund

```javascript
// Refund within 60 seconds of charge
const refund = await stripe.refunds.create({
  payment_intent: paymentIntent.id,
  reason: 'requested_by_customer',
  metadata: {
    test_type: 'hitl_microcharge_refund',
    run_id: 'CEOSPRINT-20260121-EXEC-ZT3G-V2S2-FIX-027'
  }
});

console.log({
  refund_id: refund.id,
  status: refund.status,
  amount: refund.amount
});
```

### Step 6: Verify Refund Webhook

```bash
# Check for refund events
curl -s https://student-pilot-jamarrlmayes.replit.app/api/webhooks/stripe/log \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.[-1]'

# Expected event:
# - charge.refunded
```

### Step 7: Record Evidence

```json
{
  "run_id": "CEOSPRINT-20260121-EXEC-ZT3G-V2S2-FIX-027",
  "test_type": "hitl_microcharge",
  "payment_intent_id": "pi_xxx",
  "charge_amount_cents": 50,
  "charge_status": "succeeded",
  "refund_id": "re_xxx",
  "refund_status": "succeeded",
  "net_revenue_impact": 0,
  "webhooks_received": ["payment_intent.succeeded", "charge.succeeded", "charge.refunded"],
  "executed_by": "<HITL_EXECUTOR>",
  "authorized_by": "<HITL_AUTHORIZER>",
  "timestamp": "<ISO8601>"
}
```

## Rollback

If any step fails:

1. **Re-enable SEV2**: Set `sev2_active: true` in A1
2. **Disable capture**: Set `b2c_capture_disabled: true`
3. **Refund manually**: Use Stripe dashboard if API fails
4. **Document failure**: Record in incident log

## Success Criteria

| Criterion | Required |
|-----------|----------|
| Charge succeeded | ✅ |
| Webhook received | ✅ |
| Refund succeeded | ✅ |
| Net impact = $0 | ✅ |

## Post-Test Actions

After successful microcharge:

1. [ ] Document results in `evidence/` folder
2. [ ] Update A8 Command Center with verification
3. [ ] Prepare for controlled traffic ramp
4. [ ] Re-enable SEV2 until full launch approval

---

## Authorization Record

| Field | Value |
|-------|-------|
| Run ID | CEOSPRINT-20260121-EXEC-ZT3G-V2S2-FIX-027 |
| Authorizer | _(HITL Required)_ |
| Executor | _(HITL Required)_ |
| Timestamp | _(HITL Required)_ |
| Signature | _(HITL Required)_ |

---

**REMINDER**: This procedure must NOT be executed autonomously. HITL authorization is mandatory.
