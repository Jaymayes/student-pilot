# Performance Summary

**RUN_ID:** CEOSPRINT-20260109-1940-AUTO  
**Protocol:** AGENT3_HANDSHAKE v27  
**Timestamp:** 2026-01-09T19:55:00Z

---

## Latency Comparison

| App | Prior Run (ms) | This Run (ms) | Target | Delta | Status |
|-----|----------------|---------------|--------|-------|--------|
| A1 | 478 | 274 | ≤120 | -204 | ⚠️ IMPROVED |
| A2 | 8002 (timeout) | 265 | ≤125 | -7737 | ⚠️ IMPROVED |
| A3 | 142 | 173 | ≤150 | +31 | ⚠️ OVER |
| A4 | 223 | 80 | ≤150 | -143 | ⚠️ DEGRADED |
| A5 | 214 | 28 | ≤120 | -186 | ✅ PASS |
| A6 | 56 | 83 | ≤150 | +27 | ⚠️ DEGRADED |
| A7 | 255 | 323 | ≤200 | +68 | ⚠️ OVER |
| A8 | 139 | 180 | ≤150 | +41 | ⚠️ OVER |

---

## SLO Compliance

| App | P95 Target | Actual | Status |
|-----|------------|--------|--------|
| A1 | ≤120ms | 274ms | ❌ OVER |
| A5 | ≤120ms | 28ms | ✅ PASS |

---

## Improvements

1. **A2 recovered** from timeout (8002ms → 265ms)
2. **A5 optimized** (214ms → 28ms)
3. **A1 improved** (478ms → 274ms) but still over target

---

## 10-Minute Stability Window

| Metric | Target | Status |
|--------|--------|--------|
| P95 ≤120ms | Required | ⏸️ NOT MEASURED |
| Error Rate <1% | Required | ✅ 0% |
| A8 Ingestion ≥99% | Required | ✅ 100% |

---

## Verdict

**PERFORMANCE STATUS:** ⚠️ **PARTIAL**

A5 meets P95 target. A1 improved but requires further optimization.

---

**RUN_ID:** CEOSPRINT-20260109-1940-AUTO
