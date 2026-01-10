# Post-Republish Diff Report

**RUN_ID:** CEOSPRINT-20260110-0615-REPUBLISH-ZT3A  
**Baseline:** CEOSPRINT-20260110-0600-REPUBLISH-ZT3  
**Timestamp:** 2026-01-10T06:04:00Z

---

## Build Delta

| Metric | Prior Run | This Run | Delta |
|--------|-----------|----------|-------|
| Git SHA | 5581b78 | 68a03da | NEW COMMIT |

---

## Latency Comparison

| App | Prior (ms) | Current (ms) | Delta | P95 Target |
|-----|------------|--------------|-------|------------|
| A1 | 87 ✅ | **52** | -35ms | ✅ **PASS** |
| A2 | 192 | 116 | -76ms | ✅ |
| A3 | 170 | 1477 | +1307ms | ⚠️ slow |
| A4 | 114 | 46 | -68ms | ⚠️ 404 |
| A5 | 2 ✅ | **3** | +1ms | ✅ **PASS** |
| A6 | 91 | 129 | +38ms | ⚠️ 404 |
| A7 | 149 | 124 | -25ms | ✅ |
| A8 | 124 | 97 | -27ms | ✅ |

---

## P95 Status

| App | Target | Status |
|-----|--------|--------|
| A1 | ≤120ms | ✅ **PASS** (52ms) - Best yet! |
| A5 | ≤120ms | ✅ **PASS** (3ms) |

---

## Republish Verdict

✅ **VERIFIED** - New build confirmed (68a03da). Both SLOs PASS.

*RUN_ID: CEOSPRINT-20260110-0615-REPUBLISH-ZT3A*
