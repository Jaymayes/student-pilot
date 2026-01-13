# Safety Assertions (DriftGuard)

**RUN_ID:** CEOSPRINT-20260113-FREEZE-ZT3G-029

## Stripe Capacity Guard

| Item | Value |
|------|-------|
| Remaining | ~4/25 |
| Threshold | 5 |
| Status | **BELOW THRESHOLD** |
| Action | No-charge rule ENFORCED |

## Assertion Tests

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Live charge without override | 403 Safety | NOT TESTED | N/A |
| Dry-run checkout | 200 | PENDING | - |

## Enforcement

- All charge attempts on A1/A5 MUST check HITL override
- If Stripe < 5 AND no override: DENY with 403 Safety
- If override present: ALLOW with logging

## HITL Override Format

```
X-HITL-Override: CEO-<approver>-<timestamp>
```

Must match entry in hitl_approvals.log.
