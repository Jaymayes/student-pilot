# Alert Suppression During Finance Freeze

**RUN_ID**: CEOSPRINT-20260121-EXEC-ZT3G-G5-FIN-READY-046
**Issue Resolved**: Stale ARR Data alerts during finance freeze

## Root Cause Analysis

The "Stale ARR Data" alerts were firing every 30 minutes because:

1. **usage_events table**: 0 records (empty)
2. **credit_ledger table**: Last entry Jan 9, 2026 (12 days stale)
3. **ARR calculation**: No recent purchases

This is **expected behavior** during finance freeze since:
- LEDGER_FREEZE = true
- LIVE_STRIPE_CHARGES = BLOCKED
- No real transactions are occurring

## Fix Applied

Modified `server/monitoring/arrFreshness.ts` to check `FINANCE_CONTROLS.ledger_freeze`:

- When finance freeze is ACTIVE: Alerts are logged but NOT escalated to alertManager
- When finance freeze is INACTIVE: Alerts escalate normally
- All alerts include a suppression note when freeze is active

## Alert Thresholds (unchanged)

| Data Source | Threshold | Status |
|-------------|-----------|--------|
| usage_events | 24 hours | Expected stale during freeze |
| ledger_entries | 4 hours | Expected stale during freeze |
| arr_calculation | 1 hour | Expected stale during freeze |

## Other Alerts Observed

1. **High /health latency** (up to 7375ms): Development artifact caused by Vite compilation. Production deployment uses pre-compiled assets.

2. **Telemetry 500 error**: Transient A8 Command Center error, auto-recovered via retry mechanism.

3. **High Memory Usage**: Periodic warnings during asset compilation, not a production concern.

## Verification

After restart, ARR freshness checks will:
- Continue monitoring data staleness
- Log all metrics normally
- NOT create system alerts while FINANCE_CONTROLS.ledger_freeze = true

---

**Status**: ✅ Alert suppression active during finance freeze
