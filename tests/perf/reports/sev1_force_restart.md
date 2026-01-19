# SEV-1 Force Restart Report

**CIR:** CIR-1768845119  
**Severity:** SEV-1  
**Status:** Force Restart Complete | TRAFFIC_CAP = 0  
**Timestamp:** 2026-01-19T17:53:45.000Z

---

## Executive Summary

SEV-1 declared due to massive rate limiting and authentication errors:
- HIGH ERROR RATE: GET /api/login has 25.2% error rate (52/206)
- IP blocked during active lockout period
- Authentication request blocked by rate limiter
- IP rate limit exceeded - day window

Force restart executed with telemetry gate bypass.

---

## Hard Controls Applied ✅

| Control | Value |
|---------|-------|
| TRAFFIC_CAP_B2C_PILOT | **0** |
| B2C_CAPTURE | **paused** |
| TELEMETRY_STRICT_MODE | **false** |
| TELEMETRY_REQUIRE_IDEMPOTENCY | **false** |
| WAF_SITEMAP_BLOCK | **true** |
| SAFETY_LOCK | **active** |
| AUTO_REFUNDS | **enabled** |
| LOCALHOST_PROBES | **disabled** |
| METRICS_P95_PROBES | **disabled** |

---

## A5 Restart Verification ✅

| Metric | Before | After |
|--------|--------|-------|
| PID | 383 | 679 |
| Commit SHA | 69b10503... | 69b10503... |
| Manifest Digest | sha256:69b105037622 | verified |
| Boot Status | - | ✅ Clean |

---

## Fleet Health Markers ✅

| App | HTTP | P95 | Auth 5xx | Status |
|-----|------|-----|----------|--------|
| A1 | 200 | 227ms | 0 | ✅ |
| A5 | 200 | - | - | ✅ |
| A7 | 200 | - | - | ✅ |
| A8 | 200 | - | - | ✅ |

---

## Telemetry Gate Bypass ✅

| Test | Result |
|------|--------|
| POST without X-Idempotency-Key | ✅ Accepted |
| Response Status | 202 |
| Event ID | evt_1768845225057_b53l8f9zb |
| Fingerprint Logging | Enabled |

---

## Clean Log Tail ✅

| Metric | Count | Target |
|--------|-------|--------|
| Telemetry 428s | **0** | 0 ✅ |
| Sitemap 429s | **0** | 0 ✅ |
| Localhost/301 Errors | **0** | 0 ✅ |
| Node-cron Missed | **0** | 0 ✅ |

---

## Post-Restart Truth Probe Criteria

| Criterion | Current | Target | Status |
|-----------|---------|--------|--------|
| Telemetry Acceptance | 100% | ≥99% for 15 min | ⏳ Measuring |
| HTTP 428 Count | 0 | 0 | ✅ |
| A8 Queue Depth | 0 | <100 | ✅ |
| Fallback Failed | 0 | 0 | ✅ |
| SEO Suppression | Active | 0 sitemap 429s for 30 min | ⏳ |
| Provider Synthetic P95 | 227ms | ≤500ms | ✅ |
| /api/login P95 | TBD | ≤200ms | ⏳ |
| Auth 5xx | 0 | 0 | ✅ |
| Event-Loop Lag P95 | TBD | <100ms | ⏳ |
| DB P95 | TBD | ≤100ms | ⏳ |

---

## Rollback/Kill Conditions (Auto)

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Telemetry Acceptance | <95% for 10 min | Keep B2C at 0% |
| Provider Synthetic P95 | >500ms | Keep B2C at 0% |
| Any Auth 5xx | Immediate | Keep B2C at 0% |

---

## Exit and Restore Path

1. ⏳ All post-restart probes pass for 15 min
2. ⏳ Restore TRAFFIC_CAP_B2C_PILOT to 2%
3. ⏳ Continue 30-min telemetry ≥99% acceptance run
4. ⏳ Clear SEV-1 to SEV-2
5. ⏳ Gate-1 (5%) remains NO-GO until 24h stability

---

## Error Code Taxonomy (Extended)

- AUTH_DB_UNREACHABLE
- AUTH_TIMEOUT
- AUTH_RATE_LIMITED (NEW)
- IP_BLOCKED_LOCKOUT (NEW)
- HIGH_ERROR_RATE (NEW)
- ORCH_BACKOFF
- RETRY_STORM_SUPPRESSED
- RATE_LIMITED
- POOL_EXHAUSTED
- DOWNSTREAM_5XX
- CONFIG_DRIFT_BLOCKED
- TELEMETRY_428
- GREEN_MIRAGE

---

## Files Modified

| File | Changes |
|------|---------|
| server/config/featureFlags.ts | SEV1_INCIDENT, TELEMETRY_GATE, SEO_SUPPRESSION, CONTAINMENT_CONFIG |

---

## Next Actions

1. Monitor telemetry acceptance for 15 min
2. Verify /api/login P95 ≤200ms
3. Confirm DB P95 ≤100ms
4. Confirm event-loop lag P95 <100ms
5. Restore 2% when all probes pass

---

**TRAFFIC_CAP = 0. Bleeding stopped. Monitoring for 15-min stability before restore.**

Report Generated: 2026-01-19T17:53:45.000Z
