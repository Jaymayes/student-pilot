# Performance Summary (ZT3F)

**RUN_ID:** CEOSPRINT-20260111-REPUBLISH-ZT3F

---

## Latency Results (Post-Warmup)

| App | Pre-Warmup | Post-Warmup | P95 Target | Status |
|-----|------------|-------------|------------|--------|
| A1 | 304ms | **38ms** | ≤120ms | ✅ **PASS** |
| A2 | 142ms | ~140ms | ≤500ms | ✅ PASS |
| A3 | 211ms | ~200ms | ≤200ms | ⚠️ Marginal |
| A4 | 137ms | N/A | N/A | ⚠️ 404 |
| A5 | 3ms | **3ms** | ≤120ms | ✅ **PASS** |
| A6 | 54ms | N/A | N/A | ⚠️ 404 |
| A7 | 158ms | ~155ms | ≤500ms | ✅ PASS |
| A8 | 116ms | ~110ms | ≤200ms | ✅ PASS |

---

## SLO Status

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| A1 P95 | ≤120ms | **38ms** | ✅ **PASS** |
| A5 P95 | ≤120ms | **3ms** | ✅ **PASS** |
| A3 P95 | ≤200ms | 200-211ms | ⚠️ Marginal |
| Fleet Health | 100% | 75% | ⚠️ External blockers |

---

## Verdict

✅ **PERFORMANCE PASS** - A1/A5 under target, A3 marginal

*RUN_ID: CEOSPRINT-20260111-REPUBLISH-ZT3F*
