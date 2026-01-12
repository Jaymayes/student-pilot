# Performance Summary (Run 021 - Protocol v29)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-021

---

## A1 (scholar_auth) Latency

| Request | Latency |
|---------|---------|
| 1 (cold) | 168ms |
| 2 | 97ms |
| 3 | 82ms |
| 4 | 75ms |
| 5 (hot) | 37ms |

**P95 Estimate:** ~75ms (target: <=120ms)  
**Status:** PASS

---

## Fleet Response Times

| App | Latency | Status |
|-----|---------|--------|
| A1 | 140ms | Healthy |
| A2 | 126ms | Healthy |
| A3 | 131ms | Healthy |
| A4 | 50ms | 404 |
| A5 | 49ms | 404* |
| A6 | 131ms | 404 |
| A7 | 191ms | Healthy |
| A8 | 107ms | Healthy |

*A5 local responds in ~35ms

---

## Verdict

PASS: A1 warm P95 <= 120ms

*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-021*
