# Ecosystem Double Confirmation (Semantic Verification)

**RUN_ID:** CEOSPRINT-20260110-2100-REPUBLISH-ZT3E  
**Timestamp:** 2026-01-10T21:41:00Z

---

## Dual-Source Verification (HTTP 200 + Trace ID)

| App | Health Probe | Trace ID Match | Semantic PASS |
|-----|--------------|----------------|---------------|
| A1 | 200 OK (291ms) ⚠️ | ZT3E.a1 | ⚠️ Cold start |
| A2 | 200 OK (154ms) | ZT3E.a2 | ✅ |
| A3 | 200 OK (159ms) ✅ | ZT3E.a3 | ✅ **PASS** |
| A4 | 404 (54ms) | ZT3E.a4 | ❌ |
| A5 | 200 OK (8ms) ✅ | ZT3E.a5 | ✅ **PASS** |
| A6 | 404 (107ms) | ZT3E.a6 | ❌ |
| A7 | 200 OK (158ms) | ZT3E.a7 | ✅ |
| A8 | 200 OK (106ms) | ZT3E.a8 | ✅ |

---

## P95 SLO Status

| App | Target | Actual | Trace ID | Status |
|-----|--------|--------|----------|--------|
| A1 | ≤120ms | 291ms | ZT3E.a1 | ⚠️ Cold |
| A5 | ≤120ms | **8ms** | ZT3E.a5 | ✅ **PASS** |
| A3 | ≤200ms | **159ms** | ZT3E.a3 | ✅ **PASS** |

---

## Fleet Summary

- **Healthy:** A1, A2, A3, A5, A7, A8 (6/8)
- **Health:** 75%

*RUN_ID: CEOSPRINT-20260110-2100-REPUBLISH-ZT3E*
