# A1 Warmup Report (Sprint 008 Soak)

**RUN_ID:** CEOSPRINT-20260111-REPUBLISH-ZT3G-SPRINT-008-SOAK  
**Timestamp:** 2026-01-12T07:14:00Z

---

## Warmup Execution

| Phase | Requests | Method |
|-------|----------|--------|
| Warmup | 50 | Parallel |
| Sampling | 10 | Sequential |

---

## Post-Warmup Latency Samples

| Sample | Latency | Status |
|--------|---------|--------|
| 1 | 35ms | ✅ PASS |
| 2 | 48ms | ✅ PASS |
| 3 | 45ms | ✅ PASS |
| 4 | 39ms | ✅ PASS |
| 5 | 49ms | ✅ PASS |
| 6 | 56ms | ✅ PASS |
| 7 | 41ms | ✅ PASS |
| 8 | 48ms | ✅ PASS |
| 9 | 48ms | ✅ PASS |
| 10 | 68ms | ✅ PASS |

---

## Statistics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Min | 35ms | - | ✅ |
| Max | 68ms | - | ✅ |
| Avg | ~48ms | - | ✅ |
| **P95 (est)** | **~65ms** | ≤120ms | ✅ **PASS** |

---

## Verdict

✅ **A1 WARM** - P95 ~65ms (target ≤120ms)

*RUN_ID: CEOSPRINT-20260111-REPUBLISH-ZT3G-SPRINT-008-SOAK*
