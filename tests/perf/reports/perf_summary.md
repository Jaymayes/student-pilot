# Performance Summary Report

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-037  
**Generated:** 2026-01-18T19:45:00.000Z  
**Target SLO:** P95 ≤ 120ms (yellow 120-200ms)

## A5 (Student Pilot) - Endpoint Sampling

### /api/health (10 samples)

| Sample | HTTP | Latency (ms) |
|--------|------|--------------|
| 1 | 200 | 194 |
| 2 | 200 | 178 |
| 3 | 200 | 173 |
| 4 | 200 | 142 |
| 5 | 200 | 169 |
| 6 | 200 | 138 |
| 7 | 200 | 164 |
| 8 | 200 | 156 |
| 9 | 200 | 138 |
| 10 | 200 | 145 |

### / (home) and /pricing (10 samples)

| Endpoint | Sample | HTTP | Latency (ms) |
|----------|--------|------|--------------|
| home | 1 | 200 | 182 |
| pricing | 1 | 200 | 176 |
| home | 2 | 200 | 166 |
| pricing | 2 | 200 | 148 |
| home | 3 | 200 | 132 |
| pricing | 3 | 200 | 147 |
| home | 4 | 200 | 153 |
| pricing | 4 | 200 | 158 |
| home | 5 | 200 | 158 |
| pricing | 5 | 200 | 161 |

## Statistical Analysis

### Combined (All 20 samples)
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Min | 132ms | - | - |
| Max | 194ms | - | - |
| Mean | 159ms | - | - |
| P95 | ~194ms | ≤120ms | **YELLOW** |
| Success Rate | 100% | 100% | **PASS** |

## Verdict

**YELLOW** (Performance) - P95 latency ~194ms, within acceptable tolerance (120-200ms).

- 100% success rate maintained (all HTTP 200)
- Improved from previous runs (~545ms → ~231ms → ~194ms)
- Within yellow tolerance zone

### Remediation Plan
1. Enable keep-alive connection pooling
2. Pre-warm critical endpoints
3. Add caching for static assets
4. Consider CDN for global latency reduction
