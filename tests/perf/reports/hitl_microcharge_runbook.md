# HITL Micro-Charge Runbook (Protocol v30)

**RUN_ID:** CEOSPRINT-20260113-VERIFY-ZT3G-026

## Current Status

| Item | Value |
|------|-------|
| Stripe Remaining | ~4/25 |
| Threshold | 5 |
| CEO Override | NOT RECORDED |
| Execution | **FORBIDDEN** |

## Pre-Conditions

1. CEO explicit override in hitl_approvals.log
2. Stripe >= 5 OR explicit waiver
3. A5 deployed and responding
4. All session/cookie checks passing

## Execution Steps (When Approved)

1. Verify VITE_STRIPE_PUBLIC_KEY is pk_live_*
2. Create $0.50 checkout session
3. Complete payment
4. Capture 3-of-3 proof (Stripe, A5, A8)
5. Refund within 60 seconds
6. Document in evidence files

## Verdict

CONDITIONAL: Awaiting CEO override.
