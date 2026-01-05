# Conflicts Reconciliation Table v2.0
**Audit Date:** 2026-01-05T19:36Z
**Sample Size:** 200 per endpoint
**Confidence:** 95% CI

---

## Canonical Resolutions

| Conflict | Prior Claim | Measured Result (n=200) | Explanation | Status |
|----------|-------------|-------------------------|-------------|--------|
| **A2 /ready** | "404 vs 200 conflicting" | **0/200 success = 100% 404** | Endpoint not implemented | ✅ RESOLVED |
| **A7 P95** | "216-559ms varying" | **P95=331ms (P50=235ms, P99=480ms)** | Consistent latency, no spikes | ✅ RESOLVED |
| **A1 AUTH_FAILURE** | "Database unreachable" | **auth_db: "slow" (130ms), circuit CLOSED** | DB slow but reachable | ✅ FALSE POSITIVE |
| **A8 Stale Banners** | "Incidents persist" | **lastHeartbeat: 2025-11-29 (37 days stale)** | Heartbeat tracking bug | ✅ CONFIRMED BUG |
| **A8 $0 Revenue** | "Revenue missing" | **Events persisted, filter=stripe_mode='live'** | Demo/test data filtered by design | ✅ EXPLAINED |
| **A8 Revenue Blocked** | "Pipeline fault" | **A3 /api/automations/won-deal: 404** | Feature gap, not fault | ✅ EXPLAINED |

---

## Statistical Evidence

### A2 /ready (200 samples)
```
Success Rate: 0.0% (0/200)
HTTP 404: 200/200
Verdict: ENDPOINT MISSING (requires PR Issue A)
```

### A7 /health (200 samples)
```
P50: 235ms
P95: 331ms
P99: 480ms
Min: 155ms
Max: 519ms
SLO Target: 150ms
SLO Met: ❌ NO
Verdict: LATENCY EXCEEDS SLO (requires PR Issue B)
```

### A8 /health (200 samples)
```
P50: 115ms
P95: 137ms
P99: 158ms
SLO Target: 150ms
SLO Met: ✅ YES (only app meeting SLO)
```

### A1 AUTH_FAILURE Investigation
```json
{
  "auth_db": {
    "status": "slow",
    "responseTime": 130,
    "circuitBreaker": {"state": "CLOSED", "failures": 0, "isHealthy": true}
  }
}
```
**Verdict:** Database is SLOW (130ms) but REACHABLE. "Database unreachable" is FALSE POSITIVE.

---

## Resolution Summary

| Issue | Root Cause | Fix Required | PR |
|-------|------------|--------------|-----|
| A2 /ready 404 | Endpoint not implemented | Add /ready endpoint | Issue A |
| A7 P95 331ms | Synchronous operations | Async worker pattern | Issue B |
| A1 AUTH_FAILURE | Stale alert threshold | Adjust alert rules | monitoring_rule_pr |
| A8 Stale Banners | Heartbeat not updating | TTL + auto-clear | Issue C |
| A8 $0 Revenue | Demo filter by design | Add Demo Mode toggle | Issue D |
| A8 Revenue Blocked | A3 endpoints missing | A3 team implements | N/A (A3 scope) |
