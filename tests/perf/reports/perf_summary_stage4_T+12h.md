# Performance Summary - Stage 4 T+12h Snapshot
**Timestamp**: 2026-01-22T08:51:15Z | **Samples**: 32

## Aggregate SLO Results

| Percentile | Value | Target | Status |
|------------|-------|--------|--------|
| p50 | 151ms | - | Baseline |
| p75 | 191ms | - | Reference |
| P95 | 217ms | ≤120ms | ⚠️ MARGINAL |
| P99 | 291ms | ≤200ms | ⚠️ MARGINAL |
| p999 | 291ms | - | Tail |

## Per-Endpoint Heatmap

| Endpoint | p50 | p75 | p95 | p99 | p999 | Status |
|----------|-----|-----|-----|-----|------|--------|
| / | 147ms | 177ms | 213ms | 213ms | 213ms | ⚠️ |
| /pricing | 164ms | 207ms | 209ms | 209ms | 209ms | ⚠️ |
| /browse | 133ms | 142ms | 153ms | 153ms | 153ms | ✅ |
| /health | 200ms | 217ms | 291ms | 291ms | 291ms | ⚠️ |

Success: 100% | 5xx: 0% | Error Budget: 0/7.2 min
