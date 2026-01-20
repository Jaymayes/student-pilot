# Gate-3 Environment Diff

**RUN_ID**: CEOSPRINT-20260120-EXEC-ZT3G-GATE3-037  
**HITL_ID**: HITL-CEO-20260120-OPEN-TRAFFIC-G3  
**Applied**: 2026-01-20T20:43:00Z

## Traffic Cap Changes

| Setting | Gate-2 Value | Gate-3 Value |
|---------|--------------|--------------|
| TRAFFIC_CAP | 0.25 | 0.50 |
| TRAFFIC_CAP_B2C_PILOT | 25 | 50 |
| pilot_traffic_pct | 25 | 50 |

## Gate Status Updates

| Gate | Previous Status | New Status |
|------|-----------------|------------|
| Gate-1 | COMPLETE | COMPLETE |
| Gate-2 | IN_PROGRESS | COMPLETE |
| Gate-3 | N/A | IN_PROGRESS |

## Finance Freeze (Unchanged)

| Control | Value | Note |
|---------|-------|------|
| LEDGER_FREEZE | true | No fund movement |
| PROVIDER_INVOICING_PAUSED | true | No invoicing |
| FEE_POSTINGS_PAUSED | true | No fee settlements |
| LIVE_STRIPE_CHARGES | BLOCKED | No charges at Gate-3 |

## Rollback Configuration

Automatic rollback to Gate-2 (25%) if any trigger hit:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Neon DB P95 | >150ms | ROLLBACK |
| Login P95 | >220ms (2 consecutive) | ROLLBACK |
| Any Login Sample | >300ms | ROLLBACK |
| 5xx Error Rate | ≥0.5% | ROLLBACK |
| Event Loop Lag | ≥300ms (2 consecutive) | ROLLBACK |
| Telemetry Acceptance | <99% | ROLLBACK |
| WAF False Positive | Any on telemetry | ROLLBACK |
| Probe Storm | Any detected | ROLLBACK |

## HITL Override Persistence

File: `data/hitl-override.json`
- Traffic cap persisted
- Restored on boot
- Cleared on rollback or expiry

## Files Changed

1. `server/config/featureFlags.ts` - Traffic caps raised to 50%
2. `data/hitl-override.json` - HITL override created
3. `tests/perf/reports/hitl_approvals.log` - Authorization logged
