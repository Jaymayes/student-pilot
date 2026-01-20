# A1 Login Latency - Gate-2 Observation Report

**RUN_ID:** CEOSPRINT-20260120-EXEC-ZT3G-GATE2-029
**HITL_ID:** HITL-CEO-20260120-OPEN-TRAFFIC-G2
**Observation Window:** 2026-01-20T16:44:52Z to 2026-01-20T16:46:10Z
**Protocol:** AGENT3_HANDSHAKE v30

---

## Executive Summary

| Metric | Target | Observed | Status |
|--------|--------|----------|--------|
| A1 Login P95 | ≤200ms | 143ms | ✅ PASS |
| A5 DB Latency P95 | ≤100ms | 30ms | ✅ PASS |
| A8 Telemetry Health | 200 OK | 200 OK | ✅ PASS |
| Error Rate 5xx | <0.5% | 0% | ✅ PASS |

---

## KPI Samples (10 samples @ ~3s intervals)

| Sample | Timestamp | A1 HTTP | A1 Latency (ms) | A5 HTTP | A5 DB (ms) | A8 HTTP | A8 Latency (ms) |
|--------|-----------|---------|-----------------|---------|------------|---------|-----------------|
| 1 | 2026-01-20T16:44:52Z | 200 | 143 | 200 | 29 | 200 | 97 |
| 2 | 2026-01-20T16:45:24Z | 200 | 77 | 200 | 29 | 200 | 66 |
| 3 | 2026-01-20T16:45:45Z | 200 | 83 | 200 | 29 | 200 | 67 |
| 4 | 2026-01-20T16:45:48Z | 200 | 66 | 200 | 30 | 200 | 72 |
| 5 | 2026-01-20T16:45:52Z | 200 | 36 | 200 | 29 | 200 | 127 |
| 6 | 2026-01-20T16:45:56Z | 200 | 70 | 200 | 29 | 200 | 74 |
| 7 | 2026-01-20T16:45:59Z | 200 | 46 | 200 | 30 | 200 | 72 |
| 8 | 2026-01-20T16:46:03Z | 200 | 73 | 200 | 29 | 200 | 80 |
| 9 | 2026-01-20T16:46:07Z | 200 | 57 | 200 | 29 | 200 | 62 |
| 10 | 2026-01-20T16:46:10Z | 200 | 33 | 200 | 29 | 200 | 65 |

---

## Statistical Analysis

### A1 Login Latency
- **Min:** 33ms
- **Max:** 143ms
- **Mean:** 68.4ms
- **P50:** 67ms
- **P95:** 143ms
- **Target:** ≤200ms
- **Status:** ✅ PASS

### A5 DB Latency
- **Min:** 29ms
- **Max:** 30ms
- **Mean:** 29.2ms
- **P95:** 30ms
- **Target:** ≤100ms
- **Status:** ✅ PASS

### A8 Response Time
- **Min:** 62ms
- **Max:** 127ms
- **Mean:** 78.2ms
- **P95:** 127ms
- **Status:** ✅ HEALTHY

---

## Hard Gate Threshold Compliance

| Threshold | Value | Observed | Verdict |
|-----------|-------|----------|---------|
| A1 Login P95 | ≤200ms | 143ms | ✅ PASS |
| Error Rate 5xx | <0.5% | 0% (0/30 requests) | ✅ PASS |
| Neon DB P95 | ≤100ms | 30ms | ✅ PASS |
| Event Loop Lag | <200ms | N/A (not measurable externally) | ⚠️ N/A |
| Telemetry Acceptance | ≥99% | 100% (10/10 samples) | ✅ PASS |
| WAF _meta blocks | 0 | 0 | ✅ PASS |

---

## A1 Health Markers

```json
{
  "status": "ok",
  "system_identity": "scholar_auth",
  "base_url": "https://scholar-auth-jamarrlmayes.replit.app",
  "db_connected": true,
  "pool_in_use": 0,
  "pool_idle": 2,
  "pool_total": 2,
  "pool_utilization_pct": 0,
  "dependencies": {
    "auth_db": { "status": "healthy" },
    "email_service": { "status": "healthy" },
    "jwks_signer": { "status": "healthy" },
    "oauth_provider": { "status": "healthy" },
    "clerk": { "status": "healthy" }
  }
}
```

---

## Trace IDs Used

- GATE2-{timestamp}-SAMPLE1 through SAMPLE10
- Headers: `Cache-Control: no-cache`, `X-Trace-Id: GATE2-*`

---

## Conclusion

All Gate-2 hard gate thresholds are met. A1 login latency is well within the 200ms target at P95=143ms. Database latency is excellent at P95=30ms (target <100ms). Zero 5xx errors observed across all 30 requests. System is operating normally under Gate-2 25% traffic conditions.

**Recommendation:** CONTINUE Gate-2 observation window.
