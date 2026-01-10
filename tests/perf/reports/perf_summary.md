# Performance Summary

**RUN_ID:** CEOSPRINT-20260110-0622-REPUBLISH-ZT3B

---

## Latency Results

| App | Latency | P95 Target | Status |
|-----|---------|------------|--------|
| A1 | **95ms** | ≤120ms | ✅ **PASS** |
| A2 | 181ms | ≤500ms | ✅ PASS |
| A3 | **166ms** | ≤200ms | ✅ **PASS** |
| A4 | 50ms | N/A | ⚠️ 404 |
| A5 | **3ms** | ≤120ms | ✅ **PASS** |
| A6 | 92ms | N/A | ⚠️ 404 |
| A7 | 142ms | ≤500ms | ✅ PASS |
| A8 | 88ms | ≤200ms | ✅ PASS |

---

## SLO Trend

| Sprint | A1 | A5 | A3 |
|--------|-----|-----|-----|
| ZT3 | 87ms ✅ | 2ms ✅ | 1477ms ⚠️ |
| ZT3A | 52ms ✅ | 3ms ✅ | N/A |
| **ZT3B** | **95ms** ✅ | **3ms** ✅ | **166ms** ✅ |

---

## Key Improvement

**A3 Recovery:** 1477ms → **166ms** (89% faster)

---

## Verdict

✅ **PASS** - A1, A3, A5 all meet P95 SLOs

*RUN_ID: CEOSPRINT-20260110-0622-REPUBLISH-ZT3B*
