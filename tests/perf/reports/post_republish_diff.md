# Post-Republish Diff Report

**RUN_ID:** CEOSPRINT-20260109-2155-REPUBLISH3  
**Baseline:** CEOSPRINT-20260109-2100-REPUBLISH2  
**Timestamp:** 2026-01-09T22:21:39Z

---

## Build Delta

| Metric | Prior Run | This Run | Delta |
|--------|-----------|----------|-------|
| Git SHA | f3ee404 | 0c5ae99 | NEW COMMIT |
| A5 Uptime | 1317s | 2396s | +1079s |

---

## Latency Comparison

| App | Prior (ms) | Current (ms) | Delta | P95 Target |
|-----|------------|--------------|-------|------------|
| A1 | 79 | **233** | +154ms | ⚠️ REGRESSED |
| A2 | 169 | 122 | -47ms | ✅ |
| A3 | 213 | 130 | -83ms | ✅ |
| A4 | 49 | 52 | +3ms | ⚠️ 404 |
| A5 | 4 | **3** | -1ms | ✅ PASS |
| A6 | 129 | 133 | +4ms | ⚠️ 404 |
| A7 | 199 | 155 | -44ms | ✅ |
| A8 | 95 | 116 | +21ms | ✅ |

---

## Key Observations

1. **A1 P95 REGRESSION**: 79ms → 233ms (above 120ms target)
2. **A5 remains excellent**: 3ms
3. **A2, A3, A7 improved** latency this run
4. **New commit**: 0c5ae99

---

## Republish Verdict

⚠️ **VERIFIED WITH REGRESSION** - New builds confirmed but A1 latency regressed above target.

*RUN_ID: CEOSPRINT-20260109-2155-REPUBLISH3*
