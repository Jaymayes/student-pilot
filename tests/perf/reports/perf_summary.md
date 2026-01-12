# Performance Summary (ZT3G-RERUN-006 Persistence)

**RUN_ID:** CEOSPRINT-20260111-REPUBLISH-ZT3G-RERUN-006  
**Mode:** READ-ONLY

---

## Latency Results (Post-Warmup)

| App | Latency | P95 Target | Status |
|-----|---------|------------|--------|
| A1 | **40-65ms** | ≤120ms | ✅ **PASS** |
| A2 | 196ms | ≤300ms | ✅ PASS |
| A3 | **143ms** | ≤200ms | ✅ **PASS** |
| A4 | 64ms | N/A | ⚠️ 404 |
| A5 | **3ms** | ≤120ms | ✅ **PASS** |
| A6 | 41ms | N/A | ⚠️ 404 (REGRESSION) |
| A7 | 150ms | ≤300ms | ✅ PASS |
| A8 | **104ms** | ≤150ms | ✅ **PASS** |

---

## SLO Persistence

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| A1 P95 | ≤120ms | **~65ms** | ✅ **PASS** |
| A5 P95 | ≤120ms | **3ms** | ✅ **PASS** |
| A3 P95 | ≤200ms | **143ms** | ✅ **PASS** |

---

## Verdict

✅ **PERFORMANCE PERSISTENCE VERIFIED** (healthy apps)

*RUN_ID: CEOSPRINT-20260111-REPUBLISH-ZT3G-RERUN-006*
