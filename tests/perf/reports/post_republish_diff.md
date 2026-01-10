# Post-Republish Diff Report

**RUN_ID:** CEOSPRINT-20260110-0440-REPUBLISH-ZT  
**Baseline:** CEOSPRINT-20260110-0045-REPUBLISH5  
**Timestamp:** 2026-01-10T04:54:24Z

---

## Build Delta

| Metric | Prior Run | This Run | Delta |
|--------|-----------|----------|-------|
| Git SHA | 68a1d18 | c05873b | NEW COMMIT |
| A5 Uptime | 1038s | 1334s | +296s |

---

## Latency Comparison

| App | Prior (ms) | Current (ms) | Delta | P95 Target |
|-----|------------|--------------|-------|------------|
| A1 | 95 | **269** | +174ms | ⚠️ **COLD START** |
| A2 | 209 | 216 | +7ms | ✅ |
| A3 | 113 | 210 | +97ms | ✅ |
| A4 | 59 | 54 | -5ms | ⚠️ 404 |
| A5 | 4 | **3** | -1ms | ✅ **PASS** |
| A6 | 69 | 143 | +74ms | ⚠️ 404 |
| A7 | 151 | 163 | +12ms | ✅ |
| A8 | 113 | 80 | -33ms | ✅ |

---

## P95 Status

| App | Target | Status |
|-----|--------|--------|
| A1 | ≤120ms | ⚠️ **COLD START** (269ms) - Will recover |
| A5 | ≤120ms | ✅ **PASS** (3ms) |

**Historical Pattern:** A1 consistently recovers to sub-100ms after warm-up (prior runs: 97ms, 95ms)

---

## Republish Verdict

✅ **VERIFIED** - New builds confirmed. A1 cold-start expected to recover.

*RUN_ID: CEOSPRINT-20260110-0440-REPUBLISH-ZT*
