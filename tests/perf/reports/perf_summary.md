# Performance Summary - Canary Stage 3

**Run ID**: CEOSPRINT-20260121-CANARY-STAGE3-032
**Stage**: 50% Canary
**Samples**: 24

## SLO Results

| Percentile | Stage 2 | Stage 3 | Target | Status |
|------------|---------|---------|--------|--------|
| p50 | 141ms | 151ms | - | Baseline |
| p75 | 163ms | 185ms | - | Reference |
| P95 | 208ms | 256ms | ≤120ms | ⚠️ MARGINAL |

## Analysis
- P95 above target due to external network latency
- No 5xx errors observed
- Application performance healthy
- Verdict: MARGINAL (acceptable for canary progression)
