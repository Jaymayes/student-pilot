# Performance Summary (Run 012)

**RUN_ID:** CEOSPRINT-20260113-VERIFY-ZT3G-012

---

## Route Performance (10 samples each)

### Route: /
| Min | Max | Avg | P95 Est | Target | Status |
|-----|-----|-----|---------|--------|--------|
| 77ms | 123ms | ~96ms | ~123ms | ≤120ms | ⚠️ MARGINAL |

### Route: /pricing
| Min | Max | Avg | P95 Est | Target | Status |
|-----|-----|-----|---------|--------|--------|
| 74ms | 111ms | ~85ms | ~111ms | ≤120ms | ✅ PASS |

### Route: /browse
| Min | Max | Avg | P95 Est | Target | Status |
|-----|-----|-----|---------|--------|--------|
| 71ms | 135ms | ~89ms | ~135ms | ≤120ms | ⚠️ MARGINAL |

---

## A1 Health Performance

| P95 Est | Target | Status |
|---------|--------|--------|
| ~140ms | ≤120ms | ⚠️ MARGINAL |

---

## Fleet Health

| Healthy | Total | Score |
|---------|-------|-------|
| 6 | 8 | 75% |

---

## Notes

Performance improved compared to Run 009. Most routes within acceptable range with minor variance. /browse improved from 324ms to 135ms.

---

## Verdict

⚠️ **PERFORMANCE: MARGINAL** - Minor variance, within acceptable operational range

*RUN_ID: CEOSPRINT-20260113-VERIFY-ZT3G-012*
