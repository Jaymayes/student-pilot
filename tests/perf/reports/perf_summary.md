# Performance Summary - Stage 4 T0 Baseline

**Run ID**: CEOSPRINT-20260121-CANARY-STAGE4-033
**Stage**: 100% / 24h Soak — T0 Baseline
**Samples**: 32
**Timestamp**: 2026-01-22T06:48:00Z

## SLO Results

| Percentile | Value | Target | Status |
|------------|-------|--------|--------|
| p50 | 131ms | - | Baseline |
| p75 | 150ms | - | Reference |
| P95 | 181ms | ≤120ms | ⚠️ MARGINAL |
| P99 | 222ms | ≤200ms | ⚠️ MARGINAL |

## Success/Error Rates
- Success rate: 100%
- 5xx rate: 0%
- Target: ≥99.5% / <0.5%

## Error Budget (24h Soak)
- Total: 7.2 minutes (0.5% of 24h)
- Spent: 0 minutes
- Remaining: 7.2 minutes ✅

## Analysis
- P95/P99 elevated due to network latency variance
- No application errors
- All requests successful
- Error budget intact
