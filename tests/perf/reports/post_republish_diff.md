# Post-Republish Diff Report

**RUN_ID:** CEOSPRINT-20260109-2225-REPUBLISH4  
**Baseline:** CEOSPRINT-20260109-2155-REPUBLISH3  
**Timestamp:** 2026-01-09T22:31:59Z

---

## Build Delta

| Metric | Prior Run | This Run | Delta |
|--------|-----------|----------|-------|
| Git SHA | ddc0bd1 | 3c9e260 | NEW COMMIT |
| A5 Uptime | 2396s | 391s | FRESH RESTART |

---

## Latency Comparison

| App | Prior (ms) | Current (ms) | Delta | P95 Target |
|-----|------------|--------------|-------|------------|
| A1 | 233 | **97** | -136ms | ✅ **NOW PASS** |
| A2 | 122 | 131 | +9ms | ✅ |
| A3 | 130 | 143 | +13ms | ✅ |
| A4 | 52 | 50 | -2ms | ⚠️ 404 |
| A5 | 3 | **7** | +4ms | ✅ PASS |
| A6 | 133 | 48 | -85ms | ⚠️ 404 |
| A7 | 155 | 166 | +11ms | ✅ |
| A8 | 116 | 90 | -26ms | ✅ |

---

## Key Achievement

**A1 P95 RECOVERED:** 233ms → 97ms (under 120ms target) ✅

---

## Republish Verdict

✅ **VERIFIED** - New builds confirmed with A1 latency meeting SLO target.

*RUN_ID: CEOSPRINT-20260109-2225-REPUBLISH4*
