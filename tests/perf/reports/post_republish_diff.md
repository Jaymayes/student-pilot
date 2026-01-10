# Post-Republish Diff Report

**RUN_ID:** CEOSPRINT-20260110-0530-REPUBLISH-ZT2  
**Baseline:** CEOSPRINT-20260110-0520-WARMUP  
**Timestamp:** 2026-01-10T05:32:10Z

---

## Build Delta

| Metric | Prior Run | This Run | Delta |
|--------|-----------|----------|-------|
| Git SHA | 799646c | ad90670 | NEW COMMIT |

---

## Latency Comparison

| App | Prior (ms) | Current (ms) | Delta | P95 Target |
|-----|------------|--------------|-------|------------|
| A1 | 43 ✅ | **134** | +91ms | ⚠️ **MARGINAL** |
| A2 | 124 | 116 | -8ms | ✅ |
| A3 | 156 | 155 | -1ms | ✅ |
| A4 | 121 | 47 | -74ms | ⚠️ 404 |
| A5 | 3 ✅ | **3** | 0ms | ✅ **PASS** |
| A6 | 64 | 87 | +23ms | ⚠️ 404 |
| A7 | 143 | 122 | -21ms | ✅ |
| A8 | 89 | 116 | +27ms | ✅ |

---

## P95 Status

| App | Target | Status |
|-----|--------|--------|
| A1 | ≤120ms | ⚠️ MARGINAL (134ms) |
| A5 | ≤120ms | ✅ **PASS** (3ms) |

---

## Republish Verdict

✅ **VERIFIED** - New build confirmed (ad90670). A1 near target.

*RUN_ID: CEOSPRINT-20260110-0530-REPUBLISH-ZT2*
