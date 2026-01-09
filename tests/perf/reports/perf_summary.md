# Performance Summary

**RUN_ID:** CEOSPRINT-20260109-2100-REPUBLISH  
**Timestamp:** 2026-01-09T21:10:00Z  
**Protocol:** AGENT3_HANDSHAKE v27

---

## Latency Comparison

| App | Prior Run (1940) | This Run (2100) | Delta | P95 Target | Status |
|-----|------------------|-----------------|-------|------------|--------|
| A1 | 274ms | 209ms | -65ms | ≤120ms | ⚠️ OVER |
| A2 | 265ms | 218ms | -47ms | ≤200ms | ✅ PASS |
| A3 | 173ms | 198ms | +25ms | ≤200ms | ✅ PASS |
| A4 | 80ms | 72ms | -8ms | N/A | ⚠️ 404 |
| A5 | 28ms | 3ms | -25ms | ≤120ms | ✅ PASS |
| A6 | 83ms | 134ms | +51ms | N/A | ⚠️ 404 |
| A7 | 323ms | 192ms | -131ms | ≤500ms | ✅ PASS |
| A8 | 180ms | 73ms | -107ms | ≤200ms | ✅ PASS |

---

## SLO Compliance

| SLO | Target | Status |
|-----|--------|--------|
| A1 P95 ≤120ms | 120ms | ⚠️ 209ms (over) |
| A5 P95 ≤120ms | 120ms | ✅ 3ms (pass) |
| Fleet Error Rate <1% | <1% | ✅ 0% |
| A8 Ingestion ≥99% | 99% | ✅ 100% |

---

## Improvements This Run

- A1: -65ms (478→274→209ms across runs)
- A5: -25ms (28→3ms, excellent)
- A7: -131ms (323→192ms)
- A8: -107ms (180→73ms)

---

## Verdict

⚠️ **PARTIAL PASS**

- A5 P95 ≤120ms: ✅ PASS (3ms)
- A1 P95 ≤120ms: ⚠️ OVER (209ms - improved but still above target)
- All other SLOs met

*RUN_ID: CEOSPRINT-20260109-2100-REPUBLISH*
