# Ecosystem Double Confirmation

**RUN_ID:** CEOSPRINT-20260109-2155-REPUBLISH3  
**Timestamp:** 2026-01-09T22:21:39Z

---

## Dual-Source Verification

| App | Health Probe | Secondary Check | Dual PASS |
|-----|--------------|-----------------|-----------|
| A1 | 200 OK (233ms) | A8 event accepted | ✅ (but latency high) |
| A2 | 200 OK (122ms) | API response | ✅ |
| A3 | 200 OK (130ms) | A8 heartbeat | ✅ |
| A4 | 404 (52ms) | No endpoint | ❌ |
| A5 | 200 OK (3ms) | Local+telemetry | ✅ |
| A6 | 404 (133ms) | No endpoint | ❌ |
| A7 | 200 OK (155ms) | SPA rendered | ✅ |
| A8 | 200 OK (116ms) | Hub self-check | ✅ |

---

## P95 SLO Status

| App | Target | Actual | Status |
|-----|--------|--------|--------|
| A1 | ≤120ms | 233ms | ⚠️ **FAIL** |
| A5 | ≤120ms | 3ms | ✅ PASS |

---

## Fleet Summary

- **Healthy:** A1, A2, A3, A5, A7, A8 (6/8)
- **Degraded:** A4, A6 (2/8)
- **Health:** 75%

*RUN_ID: CEOSPRINT-20260109-2155-REPUBLISH3*
