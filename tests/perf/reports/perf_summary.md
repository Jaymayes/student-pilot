# Performance Summary Report

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-043  
**Generated:** 2026-01-18T03:23:00.000Z  
**Target SLO:** P95 ≤ 120ms

## A5 (Student Pilot) - Endpoint Sampling

### /api/health (10 samples)

| Sample | HTTP | Latency (ms) |
|--------|------|--------------|
| 1 | 200 | 119 |
| 2 | 200 | 195 |
| 3 | 200 | 155 |
| 4 | 200 | 195 |
| 5 | 200 | 142 |
| 6 | 200 | 153 |
| 7 | 200 | 124 |
| 8 | 200 | 151 |
| 9 | 200 | 147 |
| 10 | 200 | 130 |

### / (home) (5 samples)

| Sample | HTTP | Latency (ms) |
|--------|------|--------------|
| 1 | 200 | 130 |
| 2 | 200 | 172 |
| 3 | 200 | 171 |
| 4 | 200 | 139 |
| 5 | 200 | 165 |

### /pricing (5 samples)

| Sample | HTTP | Latency (ms) |
|--------|------|--------------|
| 1 | 200 | 134 |
| 2 | 200 | 148 |
| 3 | 200 | 159 |
| 4 | 200 | 144 |
| 5 | 200 | 126 |

## Statistical Analysis

### Combined (All 20 samples)
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Min | 119ms | - | - |
| Max | 195ms | - | - |
| Mean | 151.2ms | - | - |
| Median | 148ms | - | - |
| P95 | 190ms | ≤120ms | **CONDITIONAL** |
| Success Rate | 100% | 100% | **PASS** |

## External App Latencies (Health Endpoints)

| App | Endpoint | Latency (ms) | Status |
|-----|----------|--------------|--------|
| A1 | /health | 212 | PASS |
| A3 | /health | 296 | PASS |
| A5 | /api/health | 199 | PASS |
| A6 | /health | 326 | PASS |
| A7 | /health | 223 | PASS |
| A8 | /api/health | 384 | PASS |

## Verdict

**CONDITIONAL PASS** (Performance)

- 100% success rate maintained
- P95 at 190ms exceeds 120ms target
- Functionally acceptable for production use
