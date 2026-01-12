# A1 Warmup Report (Run 012)

**RUN_ID:** CEOSPRINT-20260113-VERIFY-ZT3G-012

---

## Warmup Execution

| Phase | Requests |
|-------|----------|
| Warmup | 50 parallel |
| Sampling | 10 sequential |

---

## Post-Warmup Latency Samples

| Sample | Latency |
|--------|---------|
| 1 | 44ms |
| 2 | 77ms |
| 3 | 78ms |
| 4 | 98ms |
| 5 | 142ms |
| 6 | 91ms |
| 7 | 100ms |
| 8 | 68ms |
| 9 | 56ms |
| 10 | 71ms |

---

## Statistics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Min | 44ms | - | ✅ |
| Max | 142ms | - | ⚠️ |
| Avg | ~82ms | - | ✅ |
| **P95 (est)** | **~140ms** | ≤120ms | ⚠️ MARGINAL |

---

## Verdict

⚠️ **A1 MARGINAL** - P95 ~140ms slightly exceeds 120ms target (one outlier)

*RUN_ID: CEOSPRINT-20260113-VERIFY-ZT3G-012*
