# HITL Micro-Charge Runbook

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-027  
**Status:** PENDING CEO APPROVAL

## Purpose

Execute $0.50 micro-charge to verify end-to-end B2C payment flow with 3-of-3 evidence.

## Prerequisites

1. CEO override logged in `tests/perf/reports/hitl_approvals.log`
2. Stripe remaining charges ≥5 OR explicit CEO authorization at current level (~4)

## Safety Guardrails

| Check | Current Status |
|-------|----------------|
| Stripe remaining | ~4/25 |
| CEO override present | **NO** |
| Live charge authorized | **NO** |

## Procedure

### Step 1: CEO Authorization
Add to `hitl_approvals.log`:
```
[TIMESTAMP] [CEO] [APPROVE] MICRO_CHARGE $0.50 with remaining=4
```

### Step 2: Execute Micro-Charge
```bash
curl -X POST "https://student-pilot-jamarrlmayes.replit.app/api/billing/create-checkout" \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: CEOSPRINT-20260113-EXEC-ZT3G-FIX-027.b2c-charge" \
  -d '{"amount": 50, "currency": "usd"}'
```

### Step 3: Complete Payment
Navigate to returned checkout URL and complete payment.

### Step 4: Process Refund (within 60 seconds)
```bash
curl -X POST "https://student-pilot-jamarrlmayes.replit.app/api/billing/refund" \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: CEOSPRINT-20260113-EXEC-ZT3G-FIX-027.b2c-refund" \
  -d '{"payment_intent_id": "<PAYMENT_INTENT_ID>"}'
```

### Step 5: Capture 3-of-3 Evidence
1. Stripe Dashboard screenshot
2. Server logs (payment_intent.succeeded)
3. A8 telemetry event

Save to:
- `tests/perf/evidence/b2c_checkout_trace.json`
- `tests/perf/evidence/refund_confirmations.json`

### Step 6: Update Verdict
Update `b2c_funnel_verdict.md` from CONDITIONAL to PASS.

## Abort Conditions
- Refund fails within 60s → Escalate immediately
- Stripe error → Document and abort
