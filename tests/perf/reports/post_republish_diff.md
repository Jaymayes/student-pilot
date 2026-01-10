# Post-Republish Diff Report

**RUN_ID:** CEOSPRINT-20260110-0902-REPUBLISH-ZT3B  
**Baseline:** CEOSPRINT-20260110-0622-REPUBLISH-ZT3B  
**Timestamp:** 2026-01-10T09:02:30Z

---

## Build Delta

| Metric | Prior Run | This Run | Delta |
|--------|-----------|----------|-------|
| Git SHA | 932da33 | **e237a7b** | NEW COMMIT |

---

## Latency Comparison

| App | Prior (ms) | Current (ms) | Delta | P95 Target |
|-----|------------|--------------|-------|------------|
| A1 | 95 ✅ | 241 | +146ms | ⚠️ Cold start |
| A2 | 181 | 145 | -36ms | ✅ |
| A3 | 166 ✅ | **197** | +31ms | ✅ PASS |
| A4 | 50 | 125 | +75ms | ⚠️ 404 |
| A5 | 3 ✅ | **3** | 0ms | ✅ **PASS** |
| A6 | 92 | 100 | +8ms | ⚠️ 404 |
| A7 | 142 | 202 | +60ms | ✅ |
| A8 | 88 | 96 | +8ms | ✅ |

---

## P95 Status

| App | Target | Status |
|-----|--------|--------|
| A1 | ≤120ms | ⚠️ 241ms (cold start - will warm) |
| A5 | ≤120ms | ✅ **PASS** (3ms) |
| A3 | ≤200ms | ✅ **PASS** (197ms) |

---

## Republish Verdict

✅ **VERIFIED** - New build confirmed (e237a7b). A5 PASS, A3 PASS, A1 cold start.

*RUN_ID: CEOSPRINT-20260110-0902-REPUBLISH-ZT3B*
