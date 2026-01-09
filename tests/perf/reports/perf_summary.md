# Performance Summary

**RUN_ID:** CEOSPRINT-20260109-2155-REPUBLISH3

---

## Latency Results

| App | Latency | P95 Target | Status |
|-----|---------|------------|--------|
| A1 | **233ms** | ≤120ms | ⚠️ **FAIL** |
| A2 | 122ms | ≤200ms | ✅ PASS |
| A3 | 130ms | ≤200ms | ✅ PASS |
| A4 | 52ms | N/A | ⚠️ 404 |
| A5 | **3ms** | ≤120ms | ✅ **PASS** |
| A6 | 133ms | N/A | ⚠️ 404 |
| A7 | 155ms | ≤500ms | ✅ PASS |
| A8 | 116ms | ≤200ms | ✅ PASS |

---

## SLO Status

| App | Target | Prior Run | This Run | Status |
|-----|--------|-----------|----------|--------|
| A1 | ≤120ms | 79ms ✅ | **233ms** | ⚠️ REGRESSED |
| A5 | ≤120ms | 4ms ✅ | **3ms** | ✅ MAINTAINED |

---

## Verdict

⚠️ **PERFORMANCE PARTIAL** - A5 passing but A1 regressed

*RUN_ID: CEOSPRINT-20260109-2155-REPUBLISH3*
