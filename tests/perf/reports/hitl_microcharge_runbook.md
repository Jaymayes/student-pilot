# HITL Micro-Charge Runbook

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-027  
**Status:** PENDING CEO APPROVAL

## Purpose

This runbook documents the procedure for executing a $0.50 micro-charge to verify end-to-end B2C payment flow with 3-of-3 evidence.

## Prerequisites

1. CEO override logged in `tests/perf/reports/hitl_approvals.log`
2. Stripe remaining charges ≥5 OR explicit CEO authorization at current level (≈4)
3. Test card ready (or production card for live verification)

## Safety Guardrails

| Check | Current Status |
|-------|----------------|
| Stripe remaining | ≈4/25 |
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
# Create checkout session for $0.50
curl -X POST "https://student-pilot-jamarrlmayes.replit.app/api/billing/create-checkout" \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: CEOSPRINT-20260113-EXEC-ZT3G-FIX-027.b2c-charge" \
  -d '{"amount": 50, "currency": "usd", "description": "ZT3G Verification Micro-Charge"}'
```

### Step 3: Complete Payment

Navigate to returned checkout URL and complete payment.

### Step 4: Verify Charge (within 60 seconds)

```bash
# Retrieve payment intent
curl "https://student-pilot-jamarrlmayes.replit.app/api/billing/verify-payment?session_id=<SESSION_ID>" \
  -H "X-Trace-Id: CEOSPRINT-20260113-EXEC-ZT3G-FIX-027.b2c-verify"
```

### Step 5: Process Refund

```bash
# Initiate refund
curl -X POST "https://student-pilot-jamarrlmayes.replit.app/api/billing/refund" \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: CEOSPRINT-20260113-EXEC-ZT3G-FIX-027.b2c-refund" \
  -d '{"payment_intent_id": "<PAYMENT_INTENT_ID>"}'
```

### Step 6: Capture 3-of-3 Evidence

1. **Evidence 1:** Stripe Dashboard screenshot showing charge
2. **Evidence 2:** Server logs showing payment_intent.succeeded webhook
3. **Evidence 3:** A8 telemetry event with payment details

Save to:
- `tests/perf/evidence/b2c_checkout_trace.json`
- `tests/perf/evidence/refund_confirmations.json`

### Step 7: Update Verdict

Update `tests/perf/reports/b2c_funnel_verdict.md` from CONDITIONAL to PASS.

## Abort Conditions

- Refund fails within 60 seconds → Escalate immediately
- Stripe error during checkout → Document and abort
- Network timeout → Retry once, then abort

## Post-Verification

After successful verification:
1. Update `hitl_approvals.log` with completion entry
2. Update `b2c_funnel_verdict.md` to PASS
3. Include in `go_no_go_report.md` final attestation
