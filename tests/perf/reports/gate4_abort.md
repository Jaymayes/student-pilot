# Gate-4 Abort Report

**RUN_ID**: CEOSPRINT-20260120-EXEC-ZT3G-GATE4-042
**Abort Time**: 2026-01-20T22:49:00Z
**Status**: ABORTED - ROLLED BACK TO GATE-3 (50%)

## Hard Gate Breach

| Trigger | Threshold | Actual | Status |
|---------|-----------|--------|--------|
| Login >320ms | Any sample | 390ms, 549ms | ❌ BREACHED |

## Breach Details

During Gate-4 Step 1 (75% traffic) verification:
- Probe 1: Login latency = 390ms (70ms over 320ms limit)
- Probe 11: Login latency = 549ms (229ms over 320ms limit)

Both samples exceeded the hard gate threshold of 320ms for any single login request.

## Rollback Executed

| Setting | Before | After |
|---------|--------|-------|
| TRAFFIC_CAP_B2C_PILOT | 75 | 50 |
| pilot_traffic_pct | 75 | 50 |
| gate4_status | IN_PROGRESS | ABORTED |
| gate3_status | COMPLETE | IN_PROGRESS |

## Root Cause Analysis

- First spike (390ms) occurred on initial probe - possible cold start
- Second spike (549ms) occurred on probe 11 - sustained issue
- A1 Scholar Auth latency was stable (98-217ms)
- Issue appears specific to /api/login redirect chain

## Remediation Required

1. **Owner**: Engineering Team
2. **Priority**: High
3. **Investigation Areas**:
   - Scholar Auth → A5 redirect latency
   - OIDC discovery/token exchange timing
   - Database connection pool under 75% load
   - Event loop pressure at higher traffic

## ETA for Retry

- Fix investigation: 2-4 hours
- Re-attempt Gate-4: After login latency optimization

## Finance Freeze: UNCHANGED

- LEDGER_FREEZE: true
- PROVIDER_INVOICING_PAUSED: true
- FEE_POSTINGS_PAUSED: true
- LIVE_STRIPE_CHARGES: BLOCKED

---

**Attestation: ROLLED BACK to Gate-3 (50%) — See gate4_abort.md**
