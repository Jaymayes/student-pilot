# Post-Republish Diff Report

**RUN_ID:** CEOSPRINT-20260110-0600-REPUBLISH-ZT3  
**Baseline:** CEOSPRINT-20260110-0530-REPUBLISH-ZT2  
**Timestamp:** 2026-01-10T05:49:10Z

---

## Build Delta

| Metric | Prior Run | This Run | Delta |
|--------|-----------|----------|-------|
| Git SHA | ad90670 | 5581b78 | NEW COMMIT |

---

## Latency Comparison

| App | Prior (ms) | Current (ms) | Delta | P95 Target |
|-----|------------|--------------|-------|------------|
| A1 | 134 ⚠️ | **87** | -47ms | ✅ **PASS** |
| A2 | 116 | 192 | +76ms | ✅ |
| A3 | 155 | 170 | +15ms | ✅ |
| A4 | 47 | 114 | +67ms | ⚠️ 404 |
| A5 | 3 | **2** | -1ms | ✅ **PASS** |
| A6 | 87 | 91 | +4ms | ⚠️ 404 |
| A7 | 122 | 149 | +27ms | ✅ |
| A8 | 116 | 124 | +8ms | ✅ |

---

## P95 Status

| App | Target | Status |
|-----|--------|--------|
| A1 | ≤120ms | ✅ **PASS** (87ms) |
| A5 | ≤120ms | ✅ **PASS** (2ms) |

---

## Republish Verdict

✅ **VERIFIED** - New build confirmed (5581b78). Both SLOs PASS.

*RUN_ID: CEOSPRINT-20260110-0600-REPUBLISH-ZT3*
