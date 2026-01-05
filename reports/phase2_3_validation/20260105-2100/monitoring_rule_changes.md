# Monitoring Rule Changes
**Date:** 2026-01-05T21:22Z

---

## Phase 1 Identified False Positives

| Alert | Root Cause | Resolution |
|-------|------------|------------|
| AUTH_FAILURE | Threshold 100ms too low | Raise to 500ms |
| A2_DOWN | Using /ready (404) instead of /health | Use /health, add /ready when available |
| STALE_HEARTBEAT | Cache bug, events still flowing | Fix heartbeat update in A8 |

---

## Proposed Threshold Changes

### AUTH_FAILURE Alert

**Before:**
```yaml
- alert: AuthServiceSlow
  expr: probe_duration_seconds{job="a1-health"} > 0.1  # 100ms
  for: 1m
```

**After:**
```yaml
- alert: AuthServiceSlow
  expr: probe_duration_seconds{job="a1-health"} > 0.5  # 500ms
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "A1 Auth service responding slowly"
```

**Rationale:** A1 occasionally hits 130ms during peak, well under degraded threshold.

---

### A2_DOWN Alert

**Before:**
```yaml
- alert: A2ServiceDown
  expr: probe_success{job="a2-ready"} == 0
  for: 1m
```

**After:**
```yaml
- alert: A2ServiceDown
  expr: probe_success{job="a2-health"} == 0
  for: 2m
  labels:
    severity: critical

- alert: A2ReadinessFailure
  expr: probe_success{job="a2-ready"} == 0
  for: 5m
  labels:
    severity: warning
```

**Rationale:** Separate liveness (critical) from readiness (warning). /ready may 503 during deploys.

---

### STALE_HEARTBEAT Alert

**Before:**
```yaml
- alert: StaleHeartbeat
  expr: time() - system_last_heartbeat > 300  # 5 min
  for: 1m
```

**After:**
```yaml
- alert: StaleHeartbeat
  expr: time() - system_last_heartbeat > 600  # 10 min
  for: 5m
  labels:
    severity: warning
  annotations:
    runbook: "Check A8 heartbeat cron job and Redis cache"
```

**Rationale:** Extend window to reduce noise while A8 heartbeat fix is implemented.

---

## Deduplication Rules

### Incident Grouping

```yaml
group_by: ['alertname', 'app']
group_wait: 30s
group_interval: 5m
repeat_interval: 4h
```

### Silencing During Deployments

```yaml
matchers:
  - name: alertname
    value: ".*"
  - name: during_deploy
    value: "true"
startsAt: {{ deploy_start }}
endsAt: {{ deploy_start + 15m }}
```

---

## New Alerts to Add

### A7 Queue Depth (after Issue B)

```yaml
- alert: A7IngestQueueBackup
  expr: redis_list_length{key="ingest_queue"} > 1000
  for: 5m
  labels:
    severity: warning
    app: auto_page_maker
  annotations:
    summary: "A7 ingest queue backing up"
    description: "Queue depth {{ $value }} exceeds 1000"
```

### A7 Worker Health (after Issue B)

```yaml
- alert: A7WorkerDown
  expr: up{job="a7-worker"} == 0
  for: 2m
  labels:
    severity: critical
    app: auto_page_maker
```

### A2 Readiness (after Issue A)

```yaml
- alert: A2ReadinessProbeFailure
  expr: probe_success{job="a2-ready"} == 0
  for: 2m
  labels:
    severity: warning
    app: scholarship_api
```

---

## Evidence of Noise Reduction

| Metric | Before | After |
|--------|--------|-------|
| False positive rate | ~15% | Target <5% |
| Alert fatigue | High | Reduced |
| Mean time to acknowledge | Variable | Faster (less noise) |

---

## Implementation Status

| Change | Status |
|--------|--------|
| AUTH_FAILURE threshold | 📝 PROPOSED |
| A2_DOWN separation | 📝 PROPOSED |
| STALE_HEARTBEAT extension | 📝 PROPOSED |
| A7 queue alerts | 📝 PROPOSED (post Issue B) |
| A2 readiness alerts | 📝 PROPOSED (post Issue A) |

Requires access to monitoring infrastructure to apply.
