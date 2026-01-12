# Performance Summary (Run 025 - Protocol v30)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-025

---

## A1 (scholar_auth) Latency (10 samples)

| Request | Latency |
|---------|---------|
| 1 | 110ms |
| 2 | 71ms |
| 3 | 54ms |
| 4 | 87ms |
| 5 | 88ms |
| 6 | 40ms |
| 7 | 50ms |
| 8 | 104ms |
| 9 | 63ms |
| 10 | 91ms |

**Average:** ~76ms  
**P95 Estimate:** ~104ms (target: <=120ms)  
**Status:** PASS

---

## Fleet Response Times

| App | Latency | HTTP | Status |
|-----|---------|------|--------|
| A1 | ~100ms | 200 | Healthy |
| A2 | ~120ms | 200 | Healthy |
| A3 | ~130ms | 200 | Healthy |
| A4 | ~50ms | 404 | Degraded |
| A5* | ~35ms | 200 | Local Healthy |
| A6 | ~130ms | 404 | Blocked |
| A7 | ~190ms | 200 | Healthy |
| A8 | ~110ms | 200 | Healthy |

*A5 local server; deployed pending

---

## Verdict

PASS: A1 warm P95 <= 120ms

*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-025*
