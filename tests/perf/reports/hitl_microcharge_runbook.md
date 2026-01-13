# HITL Micro-Charge Runbook (Golden Record)

**RUN_ID:** CEOSPRINT-20260113-VERIFY-ZT3G-028

## Current Status

| Item | Value |
|------|-------|
| Stripe Remaining | ~4/25 |
| Threshold | 5 |
| CEO Override | NOT RECORDED |
| Execution | **FORBIDDEN** |

## Pre-Conditions

1. CEO explicit override in hitl_approvals.log
2. Stripe >= 5 OR explicit waiver for <5
3. A5 deployed and responding
4. Session/cookie checks passing

## Execution Steps (When Approved)

1. Verify pk_live_* in environment
2. Create $0.50 checkout session
3. Complete payment
4. Capture 3-of-3 proof
5. Refund within 60 seconds
6. Document in evidence files

**Verdict:** CONDITIONAL
