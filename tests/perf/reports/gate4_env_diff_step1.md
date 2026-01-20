# Gate-4 Step 1 Environment Diff

**RUN_ID**: CEOSPRINT-20260120-EXEC-ZT3G-GATE4-042
**HITL_ID**: HITL-CEO-20260120-OPEN-TRAFFIC-G4-STEP1
**Applied**: 2026-01-20T22:46:00Z

## Traffic Cap Changes

| Setting | Before | After |
|---------|--------|-------|
| TRAFFIC_CAP_B2C_PILOT | 50 | 75 |
| pilot_traffic_pct | 50 | 75 |
| gate3_status | IN_PROGRESS | COMPLETE |
| gate4_status | - | IN_PROGRESS |

## Finance Freeze: UNCHANGED (ACTIVE)

- LEDGER_FREEZE: true
- PROVIDER_INVOICING_PAUSED: true
- FEE_POSTINGS_PAUSED: true
- LIVE_STRIPE_CHARGES: BLOCKED

## Observation Window

- Duration: 30 minutes
- Sample Rate: 1/minute
- Spike Windows: Minutes 10 & 25

## Hard Rollback Triggers

- Login P95 >240ms (2 consecutive)
- Any login >320ms
- Neon P95 >150ms
- Neon connection error
- 5xx ≥0.5%
- Event loop ≥300ms (2 consecutive)
- Telemetry <99% sustained
- WAF false positive
- Probe storm

## Rollback Target

If any trigger: TRAFFIC_CAP → 0.50 (Gate-3)
