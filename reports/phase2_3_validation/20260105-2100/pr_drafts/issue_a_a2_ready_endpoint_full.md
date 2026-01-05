# PR Draft: Issue A - A2 /ready Endpoint
**App:** A2 (scholarship_api)
**Priority:** P1 | **Risk:** LOW | **Status:** DRAFT
**Feature Flag:** `ENABLE_READY_ENDPOINT=true`

---

## Executive Summary

Implement a canonical `/ready` endpoint distinct from `/health` (liveness) to provide orchestrator-friendly readiness signals with dependency checks.

---

## Before/After Architecture

### Before
```
┌─────────────────┐     ┌──────────────┐
│  Orchestrator   │────▶│ A2 /health   │
│  (k8s/Replit)   │     │  (liveness)  │
└─────────────────┘     └──────────────┘
         │                     │
         │              Returns 200 if
         │              process is alive
         ▼              (no dep checks)
    Routes traffic
    immediately
```

### After
```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│  Orchestrator   │────▶│ A2 /ready    │────▶│ Dependency   │
│  (k8s/Replit)   │     │  (readiness) │     │   Checks     │
└─────────────────┘     └──────────────┘     └──────────────┘
         │                     │                    │
         │              Returns 200 only      ├─ PostgreSQL
         │              if ALL deps ready     ├─ Redis/Cache
         ▼                                    └─ Upstream (A1)
    Routes traffic
    only when ready
```

---

## Implementation Specification

### Endpoint Contract

| Path | Method | Success | Degraded | Notes |
|------|--------|---------|----------|-------|
| `/ready` | GET | 200 + `{"status":"ok","checks":{...}}` | 503 + `{"status":"degraded","checks":{...}}` | Orchestrator retries on 503 |
| `/health` | GET | 200 | 200 | Always 200 if process alive (no change) |

### Code Implementation

```python
# server/routes/health.py
from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse
import asyncio
import time

router = APIRouter()

# Feature flag
ENABLE_READY_ENDPOINT = os.getenv("ENABLE_READY_ENDPOINT", "true") == "true"

async def check_database():
    """Check PostgreSQL connectivity with timeout."""
    try:
        start = time.time()
        result = await db.execute("SELECT 1")
        latency_ms = (time.time() - start) * 1000
        return {"healthy": True, "latency_ms": round(latency_ms, 2)}
    except Exception as e:
        return {"healthy": False, "error": str(e)[:100]}

async def check_cache():
    """Check Redis/cache connectivity."""
    try:
        start = time.time()
        await redis.ping()
        latency_ms = (time.time() - start) * 1000
        return {"healthy": True, "latency_ms": round(latency_ms, 2)}
    except Exception as e:
        return {"healthy": False, "error": str(e)[:100]}

async def check_upstream():
    """Check critical upstream dependencies."""
    try:
        # A1 Scholar Auth
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{AUTH_URL}/health")
            return {"healthy": resp.status_code == 200, "status_code": resp.status_code}
    except Exception as e:
        return {"healthy": False, "error": str(e)[:100]}

@router.get("/ready")
async def ready():
    """Readiness probe - returns 503 if any dependency is unhealthy."""
    if not ENABLE_READY_ENDPOINT:
        # Fallback to simple liveness when disabled
        return JSONResponse({"status": "ok", "feature_flag": "disabled"})
    
    # Run all checks concurrently with 5s timeout
    try:
        checks = await asyncio.wait_for(
            asyncio.gather(
                check_database(),
                check_cache(),
                check_upstream()
            ),
            timeout=5.0
        )
        
        result = {
            "database": checks[0],
            "cache": checks[1],
            "upstream_auth": checks[2]
        }
        
        all_healthy = all(c.get("healthy", False) for c in checks)
        
        return JSONResponse(
            {
                "status": "ok" if all_healthy else "degraded",
                "checks": result,
                "timestamp": datetime.utcnow().isoformat()
            },
            status_code=200 if all_healthy else 503
        )
    except asyncio.TimeoutError:
        return JSONResponse(
            {"status": "timeout", "message": "Health checks timed out"},
            status_code=503
        )
```

### CI Integration

```yaml
# .github/workflows/health-check.yml
- name: Verify /ready endpoint
  run: |
    response=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_URL/ready)
    if [ "$response" != "200" ]; then
      echo "Readiness check failed with status $response"
      curl -s $STAGING_URL/ready | jq .
      exit 1
    fi
```

### Monitoring Alert

```yaml
# monitoring/alerts/a2_readiness.yml
- alert: A2ReadinessProbeFailure
  expr: probe_success{job="a2-ready"} == 0
  for: 2m
  labels:
    severity: warning
    app: scholarship_api
  annotations:
    summary: "A2 readiness probe failing"
    description: "A2 /ready endpoint returning non-200 for >2 minutes"
    runbook: "https://docs.scholarlink.io/runbooks/a2-readiness"
```

---

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| False positive (dep check fails incorrectly) | Low | Medium | Timeout + retry logic in checks |
| Performance overhead | Very Low | Low | Async checks with 5s timeout |
| Breaking existing clients | None | None | New endpoint, /health unchanged |

---

## Rollback Plan

### Instant Rollback (Feature Flag)
```bash
# Disable ready endpoint immediately
export ENABLE_READY_ENDPOINT=false
# Restart service
pm2 restart a2
```

### Full Rollback (Git)
```bash
git revert <commit-sha>
git push origin main
# Deploy previous version
```

### Orchestrator Fallback
When /ready returns 404 or is disabled, orchestrator should fallback to /health for backward compatibility.

---

## Test Cases

```python
# tests/test_ready.py

def test_ready_200_when_all_healthy(mock_healthy_deps):
    """Returns 200 when all dependencies are healthy."""
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert all(c["healthy"] for c in response.json()["checks"].values())

def test_ready_503_when_db_down(mock_db_failure):
    """Returns 503 when database is unreachable."""
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["status"] == "degraded"
    assert response.json()["checks"]["database"]["healthy"] == False

def test_ready_503_when_cache_down(mock_cache_failure):
    """Returns 503 when cache is unreachable."""
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["checks"]["cache"]["healthy"] == False

def test_ready_timeout_handled():
    """Returns 503 when checks timeout."""
    with patch_slow_checks(delay=10):
        response = client.get("/ready")
        assert response.status_code == 503
        assert "timeout" in response.json()["status"]

def test_ready_disabled_via_flag():
    """Returns simple 200 when feature flag is disabled."""
    with patch.dict(os.environ, {"ENABLE_READY_ENDPOINT": "false"}):
        response = client.get("/ready")
        assert response.status_code == 200
        assert response.json()["feature_flag"] == "disabled"
```

---

## Documentation Updates

### ECOSYSTEM_README.md
```markdown
## Health Endpoints

| App | Liveness | Readiness | Notes |
|-----|----------|-----------|-------|
| A2  | GET /health | GET /ready | Readiness checks DB, cache, auth |
```

### Runbook Addition
```markdown
## A2 Readiness Failures

**Symptoms:** A2 /ready returning 503

**Diagnosis:**
1. Check which dependency is failing: `curl $A2_URL/ready | jq .checks`
2. Verify database: `psql $DATABASE_URL -c "SELECT 1"`
3. Verify cache: `redis-cli ping`
4. Verify A1: `curl $A1_URL/health`

**Resolution:**
1. If database: Check connection pool, restart if needed
2. If cache: Verify Redis is running
3. If A1: Escalate to A1 team
```

---

## A5 Integration (Client-Side)

A5 should gracefully handle A2 /ready unavailability:

```typescript
// server/services/scholarshipApi.ts
async function checkA2Ready(): Promise<boolean> {
  try {
    const resp = await fetch(`${A2_URL}/ready`, { timeout: 2000 });
    return resp.status === 200;
  } catch {
    // Fallback to /health if /ready not available (404)
    try {
      const healthResp = await fetch(`${A2_URL}/health`, { timeout: 2000 });
      return healthResp.status === 200;
    } catch {
      return false;
    }
  }
}
```

---

## Acceptance Criteria

- [ ] `/ready` returns 200 when all deps healthy
- [ ] `/ready` returns 503 when any dep unhealthy
- [ ] `/health` behavior unchanged (always 200 if alive)
- [ ] Feature flag allows instant disable
- [ ] Alert configured for readiness failures
- [ ] Runbook documented
- [ ] CI test added
- [ ] A5 client handles /ready gracefully
