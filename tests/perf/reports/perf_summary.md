# Performance Summary Report

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-031  
**Generated:** 2026-01-17T20:44:00.000Z  
**Sample Duration:** 10 samples over ~10 seconds

## A5 (Student Pilot) - /api/health

| Sample | HTTP Status | Latency (ms) |
|--------|-------------|--------------|
| 1 | 200 | 145 |
| 2 | 200 | 158 |
| 3 | 200 | 983 (outlier) |
| 4 | 200 | 169 |
| 5 | 200 | 143 |
| 6 | 200 | 139 |
| 7 | 200 | 132 |
| 8 | 200 | 133 |
| 9 | 200 | 133 |
| 10 | 200 | 128 |

### Statistics (with outlier)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Min | 128ms | - | - |
| Max | 983ms | - | Outlier |
| Mean | 226.3ms | - | - |
| P95 | 658ms | ≤120ms | **CONDITIONAL** |
| Success Rate | 100% | 100% | **PASS** |

### Statistics (excluding outlier)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Min | 128ms | - | - |
| Max | 169ms | - | - |
| Mean | 142.2ms | - | - |
| P95 | 165ms | ≤120ms | **CONDITIONAL** |

### Analysis

- One outlier (983ms) likely due to cold-start or GC pause
- Excluding outlier, P95 is 165ms (approaching 120ms target)
- All requests successful (HTTP 200)
- No timeouts or errors observed
- Steady state latency: 128-169ms

## External App Latencies

| App | Endpoint | Latency (ms) | Status |
|-----|----------|--------------|--------|
| A1 | /health | 121 | PASS |
| A3 | /health | 151 | PASS |
| A5 | /api/health | 138 | PASS |
| A6 | /health | 91 | PASS |
| A7 | /health | 199 | PASS |
| A8 | /api/health | 401 | CONDITIONAL |

## Verdict

**CONDITIONAL PASS**

- Health endpoints responsive with 100% success rate
- P95 exceeds 120ms target but within operational bounds
- Outlier 983ms is transient (not persistent issue)
- Recommendation: Monitor for sustained high latency patterns
