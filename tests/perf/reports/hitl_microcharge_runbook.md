# HITL Micro-Charge Runbook (Protocol v30)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-025

---

## Current Status

| Item | Value |
|------|-------|
| Stripe Remaining | 4/25 |
| Threshold | 5 |
| CEO Override | NOT RECORDED |
| Execution | **FORBIDDEN** |

---

## Pre-Conditions for Execution

1. CEO explicit override recorded in hitl_approvals.log
2. Stripe remaining >= 5 OR explicit override for <5
3. A5 deployed URL returning 200
4. All B2C session/cookie checks passing

---

## Execution Steps (When Approved)

1. Verify VITE_STRIPE_PUBLIC_KEY is pk_live_*
2. Create checkout session for $0.50 (50 cents)
3. Complete payment via test card
4. Capture 3-of-3 proof:
   - Stripe Dashboard confirmation
   - A5 webhook received
   - A8 telemetry event
5. Execute refund within 60 seconds
6. Document in b2c_checkout_trace.json

---

## Evidence Files (When Executed)

- tests/perf/evidence/b2c_checkout_trace.json
- tests/perf/evidence/refund_confirmations.json
- tests/perf/reports/hitl_approvals.log (updated)

---

## Current Verdict

**CONDITIONAL** - Awaiting CEO override

*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-025*
