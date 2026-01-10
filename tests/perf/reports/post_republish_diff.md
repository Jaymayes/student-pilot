# Post-Republish Diff Report

**RUN_ID:** CEOSPRINT-20260110-0045-REPUBLISH5  
**Baseline:** CEOSPRINT-20260109-2225-REPUBLISH4  
**Timestamp:** 2026-01-10T00:54:32Z

---

## Build Delta

| Metric | Prior Run | This Run | Delta |
|--------|-----------|----------|-------|
| Git SHA | 3c9e260 | 68a1d18 | NEW COMMIT |
| A5 Uptime | 391s | 1038s | +647s |

---

## Latency Comparison

| App | Prior (ms) | Current (ms) | Delta | P95 Target |
|-----|------------|--------------|-------|------------|
| A1 | 97 | **95** | -2ms | ✅ **PASS** |
| A2 | 131 | 209 | +78ms | ✅ |
| A3 | 143 | 113 | -30ms | ✅ |
| A4 | 50 | 59 | +9ms | ⚠️ 404 |
| A5 | 7 | **4** | -3ms | ✅ **PASS** |
| A6 | 48 | 69 | +21ms | ⚠️ 404 |
| A7 | 166 | 151 | -15ms | ✅ |
| A8 | 90 | 113 | +23ms | ✅ |

---

## Key Achievement

**A1 P95 MAINTAINED:** 95ms (under 120ms target) ✅  
**A5 P95 IMPROVED:** 4ms (from 7ms) ✅

---

## Republish Verdict

✅ **VERIFIED** - New builds confirmed, both P95 targets met.

*RUN_ID: CEOSPRINT-20260110-0045-REPUBLISH5*
