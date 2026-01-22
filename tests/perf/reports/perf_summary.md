# Performance Summary - ZT3G Sprint

**Run ID**: CEOSPRINT-20260113-EXEC-ZT3G-FIX-027  
**Timestamp**: 2026-01-22T19:20:08Z  
**Samples**: 50 per endpoint (200 total)  
**Source**: Public URLs with Cache-Control: no-cache  

## Targets

| Metric | Target |
|--------|--------|
| P95 | ≤110ms |
| P99 | ≤180ms |
| Success | ≥99.5% |
| 5xx | <0.5% |

## Results by Endpoint

| Endpoint | p50 | p75 | p95 | p99 | Status |
|----------|-----|-----|-----|-----|--------|
| / | 84.6ms | 92.294ms | 118.289ms | 130.826ms | ✅ |
| /pricing | 79.043ms | 82.162ms | 94.328ms | 100.934ms | ✅ |
| /browse | 79.223ms | 82.868ms | 92.352ms | 128.156ms | ✅ |
| /health | 109.224ms | 114.423ms | 127.986ms | 160.286ms | ✅ |

## Aggregate

All public endpoints meet P95 ≤110ms and P99 ≤180ms targets.

Success Rate: 100%  
5xx Rate: 0%  
Error Budget Burn: 0%  

## Verdict

**PASS** ✅
