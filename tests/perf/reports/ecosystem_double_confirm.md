# Ecosystem Double Confirmation (Semantic+)

**RUN_ID:** CEOSPRINT-20260110-2230-REPUBLISH-ZT3EPLUS

---

## Dual-Source Verification

| App | Health Probe | Trace ID | Semantic PASS |
|-----|--------------|----------|---------------|
| A1 | 200 OK (264ms) ⚠️ | ZT3EPLUS.a1 | ⚠️ Cold |
| A2 | 200 OK (120ms) | ZT3EPLUS.a2 | ✅ |
| A3 | 200 OK (163ms) ✅ | ZT3EPLUS.a3 | ✅ **PASS** |
| A4 | 404 (80ms) | ZT3EPLUS.a4 | ❌ |
| A5 | 200 OK (3ms) ✅ | ZT3EPLUS.a5 | ✅ **PASS** |
| A6 | 404 (50ms) | ZT3EPLUS.a6 | ❌ |
| A7 | 200 OK (220ms) | ZT3EPLUS.a7 | ✅ |
| A8 | 200 OK (81ms) | ZT3EPLUS.a8 | ✅ |

---

## P95 SLO Status

| App | Target | Actual | Status |
|-----|--------|--------|--------|
| A1 | ≤120ms | 264ms | ⚠️ Cold |
| A5 | ≤120ms | **3ms** | ✅ **PASS** |
| A3 | ≤200ms | **163ms** | ✅ **PASS** |

---

## Fleet Summary

- **Healthy:** 6/8 (75%)
- **Stripe:** 16/25 used, 9 remaining

*RUN_ID: CEOSPRINT-20260110-2230-REPUBLISH-ZT3EPLUS*
