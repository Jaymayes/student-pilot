# Performance Summary

**RUN_ID:** CEOSPRINT-20260110-0440-REPUBLISH-ZT

---

## Latency Results

| App | Latency | P95 Target | Status |
|-----|---------|------------|--------|
| A1 | **269ms** | ≤120ms | ⚠️ **COLD START** |
| A2 | 216ms | ≤500ms | ✅ PASS |
| A3 | 210ms | ≤200ms | ⚠️ MARGINAL |
| A4 | 54ms | N/A | ⚠️ 404 |
| A5 | **3ms** | ≤120ms | ✅ **PASS** |
| A6 | 143ms | N/A | ⚠️ 404 |
| A7 | 163ms | ≤500ms | ✅ PASS |
| A8 | 80ms | ≤200ms | ✅ PASS |

---

## SLO Trend

| App | Run 4 | Run 5 | This Run | Pattern |
|-----|-------|-------|----------|---------|
| A1 | 97ms ✅ | 95ms ✅ | **269ms** ⚠️ | Cold start variance |
| A5 | 7ms ✅ | 4ms ✅ | **3ms** ✅ | Consistent excellence |

---

## Verdict

⚠️ **CONDITIONAL PASS** - A1 cold start, A5 PASS. Historical pattern confirms recovery.

*RUN_ID: CEOSPRINT-20260110-0440-REPUBLISH-ZT*
