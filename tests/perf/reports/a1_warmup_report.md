# A1 Warmup Report (Run 025 - Protocol v30)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-025  
**Protocol:** AGENT3_HANDSHAKE v30 (Functional Deep-Dive)

---

## Warmup Results (10 requests)

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

## A1 Health Response

```json
{
  "status": "ok",
  "system_identity": "scholar_auth",
  "version": "1.0.0",
  "uptime_s": 803,
  "cached": true
}
```

---

## Verdict

PASS: A1 warm P95 <= 120ms (~104ms observed)

*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-025*
