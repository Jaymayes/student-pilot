# HITL Micro-Charge Runbook

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-035  
**Status:** PENDING CEO APPROVAL

## Purpose

Execute $0.50 micro-charge to verify end-to-end B2C payment flow with 3-of-3 evidence.

## Current Status

| Check | Status |
|-------|--------|
| Stripe remaining | ~4/25 charges |
| CEO override present | **NO** |
| Live charge authorized | **NO** |
| B2C funnel status | CONDITIONAL |

## Safety Guardrails

- Stripe remaining < 5: **Requires explicit CEO authorization**
- Maximum charge amount: $0.50
- Refund deadline: 60 seconds after charge
- Abort on any error

## Prerequisites

1. CEO override logged in `tests/perf/reports/hitl_approvals.log`
2. Test card ready (or live card with $0.50 authorization)
3. Stripe Dashboard open for verification

## Procedure

### Step 1: CEO Authorization

Add to `tests/perf/reports/hitl_approvals.log`:
```
[2026-01-17T21:XX:XX.000Z] [CEO] [APPROVE] MICRO_CHARGE $0.50 with remaining=4
```

### Step 2: Create Checkout Session

```bash
TRACE_ID="CEOSPRINT-20260113-EXEC-ZT3G-FIX-035.b2c-charge"

curl -X POST "https://student-pilot-jamarrlmayes.replit.app/api/billing/create-checkout" \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: $TRACE_ID" \
  -H "Cookie: <session_cookie>" \
  -d '{"priceId": "price_XXXXX", "successUrl": "https://student-pilot-jamarrlmayes.replit.app/success", "cancelUrl": "https://student-pilot-jamarrlmayes.replit.app/cancel"}'
```

Expected response:
```json
{"sessionId": "cs_live_...", "url": "https://checkout.stripe.com/..."}
```

### Step 3: Complete Payment

1. Navigate to returned checkout URL
2. Complete payment with test/live card
3. Note payment_intent_id from URL or confirmation

### Step 4: Verify Payment (within 60 seconds)

Check 3-of-3 evidence:

**Evidence 1: Stripe Dashboard**
```
Dashboard → Payments → Recent → Find $0.50 charge
Screenshot: Save as tests/perf/evidence/stripe_dashboard_charge.png
```

**Evidence 2: Server Logs**
```bash
# Check server logs for payment_intent.succeeded webhook
grep "payment_intent.succeeded" /tmp/logs/*.log
```

**Evidence 3: A8 Telemetry**
```bash
curl -sS "https://auto-com-center-jamarrlmayes.replit.app/api/events?eventName=payment_succeeded&t=$(date +%s)" \
  -H "X-Trace-Id: CEOSPRINT-20260113-EXEC-ZT3G-FIX-035.b2c-verify"
```

### Step 5: Process Refund (within 60 seconds of charge)

```bash
curl -X POST "https://student-pilot-jamarrlmayes.replit.app/api/billing/refund" \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: CEOSPRINT-20260113-EXEC-ZT3G-FIX-035.b2c-refund" \
  -H "Cookie: <session_cookie>" \
  -d '{"paymentIntentId": "<PAYMENT_INTENT_ID>"}'
```

Expected response:
```json
{"refunded": true, "refundId": "re_..."}
```

### Step 6: Capture Refund Evidence

Save to:
- `tests/perf/evidence/b2c_checkout_trace.json` - Checkout session details
- `tests/perf/evidence/refund_confirmations.json` - Refund confirmation

### Step 7: Update Verdicts

1. Update `b2c_funnel_verdict.md`: Change status from CONDITIONAL to PASS
2. Log completion in `hitl_approvals.log`:
   ```
   [TIMESTAMP] [AGENT] [COMPLETE] MICRO_CHARGE $0.50 successful, refunded, 3-of-3 evidence captured
   ```

## Abort Conditions

| Condition | Action |
|-----------|--------|
| Refund fails within 60s | Escalate to CEO immediately |
| Stripe API error | Document and abort |
| Payment declines | Log and abort (no refund needed) |
| Checkout timeout | Abort (no charge occurred) |

## Rollback

If charge succeeds but refund fails:
1. Document payment_intent_id
2. Escalate to CEO with Stripe Dashboard access
3. Manual refund via Stripe Dashboard
4. Document resolution in hitl_approvals.log
