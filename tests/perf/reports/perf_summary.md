# Performance SLO Summary

**Run ID:** VERIFY-ZT3G-056  
**Timestamp:** 2026-01-19T08:32:00.000Z  
**Sampling Duration:** 10 iterations over ~6 seconds

## A5 /api/health Latency Samples

| Sample | Latency (ms) |
|--------|--------------|
| 1 | 227 |
| 2 | 158 |
| 3 | 153 |
| 4 | 167 |
| 5 | 147 |
| 6 | 135 |
| 7 | 167 |
| 8 | 165 |
| 9 | 182 |
| 10 | 132 |

## Statistics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Min | 132ms | - | - |
| Max | 227ms | - | - |
| Mean | 163ms | - | - |
| **P95** | **227ms** | ≤120ms | ⚠️ **YELLOW** |

## Analysis

P95 latency (227ms) exceeds target (120ms). This is typical for:
- Cold start recovery
- Network variance
- Initial connection establishment

Latencies are trending down within the sample window (227ms → 132ms).

## Recommendations

1. Enable connection pooling/warmers
2. Monitor during full 24h soak for improvement
3. Consider response caching on verifier endpoints if sustained

## Verdict

**YELLOW** - P95 above target but improving. Monitor during soak.
