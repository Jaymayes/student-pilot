# PR: Monitoring Rules Tuning
**Priority:** P2 | **Risk:** LOW | **Scope:** Alert Configuration

---

## Current Issues

| Alert | Trigger Condition | False Positives | Root Cause |
|-------|-------------------|-----------------|------------|
| AUTH_FAILURE | DB response > 100ms | HIGH | A1 DB typically 130ms (slow but healthy) |
| A2_DOWN | /ready returns non-200 | HIGH | /ready not implemented (expected 404) |
| REVENUE_BLOCKED | A3 automation 404 | MEDIUM | A3 endpoints not yet implemented |
| STALE_HEARTBEAT | Heartbeat > 5min old | HIGH | Cache not updating despite events flowing |

---

## Proposed Changes

### 1. AUTH_FAILURE Threshold Adjustment

**Current:**
```yaml
- alert: AUTH_FAILURE
  expr: auth_db_response_time_ms > 100
  for: 1m
  severity: critical
```

**Proposed:**
```yaml
- alert: AUTH_FAILURE
  expr: auth_db_response_time_ms > 500 OR auth_db_circuit_breaker_failures > 3
  for: 5m
  severity: warning
  annotations:
    description: "A1 auth_db slow (>500ms) or circuit breaker tripped"
```

**Rationale:** Current 100ms threshold triggers on normal operation (P50=130ms). Raise to 500ms and add circuit breaker check.

### 2. A2_DOWN Alert Suppression

**Current:**
```yaml
- alert: A2_DOWN
  expr: probe_success{endpoint="/ready"} == 0
  for: 1m
  severity: critical
```

**Proposed:**
```yaml
- alert: A2_DOWN
  expr: probe_success{endpoint="/health"} == 0
  for: 1m
  severity: critical
  # NOTE: /ready alert disabled until PR Issue A implemented
```

**Rationale:** Use /health (which returns 200) until /ready is implemented.

### 3. REVENUE_BLOCKED Reclassification

**Current:**
```yaml
- alert: REVENUE_BLOCKED
  expr: a3_automation_success == 0
  for: 5m
  severity: critical
```

**Proposed:**
```yaml
- alert: REVENUE_BLOCKED
  expr: stripe_webhook_failures > 5 OR payment_processing_errors > 0
  for: 5m
  severity: critical
  
- alert: A3_AUTOMATION_UNAVAILABLE
  expr: a3_automation_endpoint_status != 200
  for: 10m
  severity: info
  annotations:
    description: "A3 automation endpoints not implemented (expected during Phase 3)"
```

**Rationale:** Separate actual revenue faults from missing automation features.

### 4. STALE_HEARTBEAT Duration Extension

**Current:**
```yaml
- alert: STALE_HEARTBEAT
  expr: time() - last_heartbeat_timestamp > 300
  for: 1m
  severity: warning
```

**Proposed:**
```yaml
- alert: STALE_HEARTBEAT
  expr: time() - last_heartbeat_timestamp > 3600 AND events_persisted_last_hour == 0
  for: 10m
  severity: warning
  annotations:
    description: "No heartbeat AND no events for 1 hour"
```

**Rationale:** Current alert fires constantly due to heartbeat cache bug. Add events check to reduce noise.

---

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Daily False Positive Alerts | ~15-20 | ~2-3 |
| Mean Time to Acknowledge | 45 min | 10 min |
| Alert Fatigue Score | HIGH | LOW |

---

## Rollback

All changes are configuration-only. Rollback via:
```bash
kubectl apply -f monitoring/rules-v1-backup.yaml
```

---

## Acceptance Criteria

- [ ] No AUTH_FAILURE alerts during 130ms DB response
- [ ] No A2_DOWN alerts when /health returns 200
- [ ] REVENUE_BLOCKED only fires on actual payment failures
- [ ] STALE_HEARTBEAT does not fire when events are flowing
