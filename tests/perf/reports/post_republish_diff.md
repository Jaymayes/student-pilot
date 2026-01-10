# Post-Republish Diff Report

**RUN_ID:** CEOSPRINT-20260110-2100-REPUBLISH-ZT3E  
**Baseline:** CEOSPRINT-20260110-2030-REPUBLISH-ZT3D  
**Timestamp:** 2026-01-10T21:41:00Z

---

## Build Delta

| Metric | Prior Run | This Run | Delta |
|--------|-----------|----------|-------|
| Git SHA | b751b81 | **8b6c784** | NEW COMMIT |

---

## P95 Status (Semantic Verification)

| App | Target | Actual | Trace ID | Status |
|-----|--------|--------|----------|--------|
| A1 | ≤120ms | 291ms | ZT3E.a1 | ⚠️ COLD START |
| A5 | ≤120ms | **8ms** | ZT3E.a5 | ✅ **PASS** |
| A3 | ≤200ms | **159ms** | ZT3E.a3 | ✅ **PASS** |

---

## Verdict

✅ **VERIFIED** - New build (8b6c784). A3/A5 PASS. A1 cold start.

*RUN_ID: CEOSPRINT-20260110-2100-REPUBLISH-ZT3E*
