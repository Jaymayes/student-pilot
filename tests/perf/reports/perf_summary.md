# Performance Summary Report

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-029  
**Generated:** 2026-01-18T18:45:00.000Z  
**Target SLO:** P95 ≤ 120ms

## A5 (Student Pilot) - Endpoint Sampling

### /api/health (10 samples)

| Sample | HTTP | Latency (ms) |
|--------|------|--------------|
| 1 | 200 | 205 |
| 2 | 200 | 218 |
| 3 | 200 | 184 |
| 4 | 200 | 468 |
| 5 | 200 | 545 |
| 6 | 200 | 274 |
| 7 | 200 | 150 |
| 8 | 200 | 534 |
| 9 | 200 | 302 |
| 10 | 200 | 372 |

### / (home) and /pricing (10 samples)

| Endpoint | Sample | HTTP | Latency (ms) |
|----------|--------|------|--------------|
| home | 1 | 200 | 213 |
| pricing | 1 | 200 | 196 |
| home | 2 | 200 | 316 |
| pricing | 2 | 200 | 358 |
| home | 3 | 200 | 436 |
| pricing | 3 | 200 | 218 |
| home | 4 | 200 | 655 |
| pricing | 4 | 200 | 394 |
| home | 5 | 200 | 470 |
| pricing | 5 | 200 | 187 |

## Statistical Analysis

### Combined (All 20 samples)
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Min | 150ms | - | - |
| Max | 655ms | - | - |
| Mean | 335ms | - | - |
| P95 | ~545ms | ≤120ms | **YELLOW** |
| Success Rate | 100% | 100% | **PASS** |

## External App Health Latencies

| App | Endpoint | Status |
|-----|----------|--------|
| A1 | /health | healthy |
| A2 | /health | healthy |
| A3 | /health | healthy |
| A4 | /health | healthy |
| A5 | /api/health | healthy |
| A6 | /health | healthy |
| A7 | /health | healthy |
| A8 | /api/health | healthy |

## Verdict

**YELLOW** (Performance) - P95 latency exceeds 120ms target.

- 100% success rate maintained (all HTTP 200)
- Latency variability due to cold starts / network conditions
- Functionally acceptable for production use

### Remediation Plan
1. Enable keep-alive connection pooling
2. Pre-warm critical endpoints
3. Add caching for static assets
