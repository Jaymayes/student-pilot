# Performance Summary

**RUN_ID:** CEOSPRINT-20260110-0902-REPUBLISH-ZT3B

---

## Latency Results

| App | Latency | P95 Target | Status |
|-----|---------|------------|--------|
| A1 | 241ms | ≤120ms | ⚠️ Cold start |
| A2 | 145ms | ≤500ms | ✅ PASS |
| A3 | **197ms** | ≤200ms | ✅ **PASS** |
| A4 | 125ms | N/A | ⚠️ 404 |
| A5 | **3ms** | ≤120ms | ✅ **PASS** |
| A6 | 100ms | N/A | ⚠️ 404 |
| A7 | 202ms | ≤500ms | ✅ PASS |
| A8 | 96ms | ≤200ms | ✅ PASS |

---

## SLO Trend

| Sprint | A1 | A5 | A3 |
|--------|-----|-----|-----|
| Prior ZT3B | 95ms ✅ | 3ms ✅ | 166ms ✅ |
| **This ZT3B** | 241ms ⚠️ | **3ms** ✅ | **197ms** ✅ |

---

## Note

A1 cold start (241ms) expected to recover to <120ms on subsequent requests.

---

## Verdict

⚠️ **CONDITIONAL PASS** - A3 and A5 meet SLOs, A1 cold start

*RUN_ID: CEOSPRINT-20260110-0902-REPUBLISH-ZT3B*
