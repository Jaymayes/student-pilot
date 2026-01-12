# A1 Warmup Report (Run 015)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-015

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
| 1 | 52ms |
| 2 | 47ms |
| 3 | 40ms |
| 4 | 42ms |
| 5 | 42ms |
| 6 | 40ms |
| 7 | 38ms |
| 8 | 42ms |
| 9 | 45ms |
| 10 | 46ms |

---

## Statistics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Min | 38ms | - | ✅ |
| Max | 52ms | - | ✅ |
| Avg | ~43ms | - | ✅ |
| **P95 (est)** | **~47ms** | ≤120ms | ✅ **PASS** |

---

## Improvement

| Run | P95 | Status |
|-----|-----|--------|
| Run 009 | ~65ms | OK |
| Run 012 | ~140ms | MARGINAL |
| **Run 015** | **~47ms** | ✅ **EXCELLENT** |

---

## Verdict

✅ **A1 WARMUP: PASS** - P95 47ms well below 120ms target

*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-015*
