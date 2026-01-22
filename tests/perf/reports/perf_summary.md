# Performance Summary - Canary Stage 2

**Run ID**: CEOSPRINT-20260121-CANARY-STAGE2-031
**Stage**: 25% Canary
**Samples**: 20

## SLO Results

| Percentile | Value | Target | Status |
|------------|-------|--------|--------|
| p50 | 141ms | - | Baseline |
| p75 | 163ms | - | Reference |
| P95 | 208ms | ≤120ms | ⚠️ MARGINAL |

## By Endpoint

| Endpoint | Min | Max | Avg |
|----------|-----|-----|-----|
| / | 106ms | 196ms | ~147ms |
| /pricing | 109ms | 165ms | ~127ms |
| /browse | 102ms | 160ms | ~136ms |
| /health | 136ms | 208ms | ~161ms |

## Analysis
- P95 above target due to external network latency
- No 5xx errors observed
- Application performance healthy
- Verdict: MARGINAL (acceptable for canary progression)
