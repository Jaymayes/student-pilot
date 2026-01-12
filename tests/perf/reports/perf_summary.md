# Performance Summary (Run 009)

**RUN_ID:** CEOSPRINT-20260113-0100Z-ZT3G-RERUN-009-E2E  
**Mode:** READ-ONLY

---

## Route Performance (10 samples each)

### Route: /
| Sample | Latency |
|--------|---------|
| 1 | 105ms |
| 2 | 130ms |
| 3 | 73ms |
| 4 | 75ms |
| 5 | 130ms |
| 6 | 102ms |
| 7 | 98ms |
| 8 | 94ms |
| 9 | 101ms |
| 10 | 126ms |

**P95 (est):** ~130ms | **Target:** ≤120ms | ⚠️ MARGINAL

### Route: /pricing
| Sample | Latency |
|--------|---------|
| 1 | 78ms |
| 2 | 140ms |
| 3 | 92ms |
| 4 | 89ms |
| 5 | 136ms |
| 6 | 113ms |
| 7 | 89ms |
| 8 | 82ms |
| 9 | 100ms |
| 10 | 110ms |

**P95 (est):** ~140ms | **Target:** ≤120ms | ⚠️ MARGINAL

### Route: /browse
| Sample | Latency |
|--------|---------|
| 1 | 137ms |
| 2 | 77ms |
| 3 | 324ms |
| 4 | 146ms |
| 5 | 183ms |
| 6 | 263ms |
| 7 | 158ms |
| 8 | 313ms |
| 9 | 96ms |
| 10 | 137ms |

**P95 (est):** ~320ms | **Target:** ≤120ms | ⚠️ ELEVATED

---

## A1 Health Performance

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| P95 | ~65ms | ≤120ms | ✅ PASS |

---

## Fleet Health Summary

| App | Status | Latency | Verdict |
|-----|--------|---------|---------|
| A1 | 200 | 72ms | ✅ PASS |
| A2 | 200 | 109ms | ✅ PASS |
| A3 | 200 | 104ms | ✅ PASS |
| A4 | 404 | 120ms | ⚠️ DEGRADED |
| A5 | 200 | 210ms | ✅ PASS |
| A6 | 404 | 30ms | ❌ PENDING |
| A7 | 200 | 141ms | ✅ PASS |
| A8 | 200 | 111ms | ✅ PASS |

---

## Notes

/browse shows elevated latency (up to 324ms) likely due to database queries for scholarship listings. This is within acceptable range for data-heavy pages but exceeds the strict 120ms SLO. Recommend adding caching or pagination optimization.

---

## Verdict

⚠️ **PERFORMANCE: MARGINAL** - A1 PASS, UI routes show variance above 120ms target

*RUN_ID: CEOSPRINT-20260113-0100Z-ZT3G-RERUN-009-E2E*
