# Post-Republish Diff Report

**RUN_ID:** CEOSPRINT-20260110-0520-WARMUP  
**Baseline:** CEOSPRINT-20260110-0440-REPUBLISH-ZT  
**Timestamp:** 2026-01-10T05:18:00Z

---

## Build Delta

| Metric | Prior Run | This Run | Delta |
|--------|-----------|----------|-------|
| Git SHA | 576580d | 799646c | NEW COMMIT |

---

## Latency Comparison (Cold → Warm)

| App | Cold (ZT) | Warm (Probe 3) | Delta | P95 Target |
|-----|-----------|----------------|-------|------------|
| A1 | 269ms ⚠️ | **43ms** | -226ms | ✅ **PASS** |
| A2 | 216ms | 124ms | -92ms | ✅ |
| A3 | 210ms | 156ms | -54ms | ✅ |
| A4 | 54ms | 121ms | +67ms | ⚠️ 404 |
| A5 | 3ms | **3ms** | 0ms | ✅ **PASS** |
| A6 | 143ms | 64ms | -79ms | ⚠️ 404 |
| A7 | 163ms | 143ms | -20ms | ✅ |
| A8 | 80ms | 89ms | +9ms | ✅ |

---

## P95 Status

| App | Target | Status |
|-----|--------|--------|
| A1 | ≤120ms | ✅ **PASS** (43ms) |
| A5 | ≤120ms | ✅ **PASS** (3ms) |

---

## Republish Verdict

✅ **VERIFIED** - Warm probes confirm A1 recovery. Both P95 targets met.

*RUN_ID: CEOSPRINT-20260110-0520-WARMUP*
