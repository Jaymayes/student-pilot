# Post-Republish Diff Report

**RUN_ID:** CEOSPRINT-20260110-0622-REPUBLISH-ZT3B  
**Baseline:** CEOSPRINT-20260110-0615-REPUBLISH-ZT3A  
**Timestamp:** 2026-01-10T06:37:00Z

---

## Build Delta

| Metric | Prior Run | This Run | Delta |
|--------|-----------|----------|-------|
| Git SHA | 68a03da | **932da33** | NEW COMMIT |

---

## Latency Comparison

| App | Prior (ms) | Current (ms) | Delta | P95 Target |
|-----|------------|--------------|-------|------------|
| A1 | 52 ✅ | **95** | +43ms | ✅ **PASS** |
| A2 | 116 | 181 | +65ms | ✅ |
| A3 | 1477 | **166** | -1311ms | ✅ Much better! |
| A4 | 46 | 50 | +4ms | ⚠️ 404 |
| A5 | 3 ✅ | **3** | 0ms | ✅ **PASS** |
| A6 | 129 | 92 | -37ms | ⚠️ 404 |
| A7 | 124 | 142 | +18ms | ✅ |
| A8 | 97 | 88 | -9ms | ✅ |

---

## P95 Status

| App | Target | Status |
|-----|--------|--------|
| A1 | ≤120ms | ✅ **PASS** (95ms) |
| A5 | ≤120ms | ✅ **PASS** (3ms) |

---

## A3 Readiness

✅ **100%** - A3 healthy at 166ms (excellent improvement from 1477ms)

---

## Republish Verdict

✅ **VERIFIED** - New build confirmed (932da33). Both SLOs PASS. A3 ready.

*RUN_ID: CEOSPRINT-20260110-0622-REPUBLISH-ZT3B*
