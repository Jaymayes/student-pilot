# PR: A2 - Add /ready Endpoint + Readiness Contract

**Priority:** P1
**Owner:** A2 Team (scholarship_api)
**Risk:** Low
**Rollback:** Remove endpoint

---

## Problem Statement

A2 `/ready` endpoint returns 404, causing:
- Orchestrator retries on startup
- Load balancer health check failures
- False "A2 Down" alerts

**Evidence:**
```
| Endpoint | HTTP | Latency |
| /ready   | 404  | 176ms   |
```

---

## Proposed Change

### Option 1: Minimal (FastAPI)

```python
# server/routes/health.py
from fastapi import APIRouter, Response

router = APIRouter()

@router.get("/ready")
def ready():
    """Readiness probe for orchestrators and load balancers."""
    return {"status": "ok", "ready": True}
```

### Option 2: Extended (with dependency checks)

```python
from fastapi import APIRouter, Response
import asyncpg

router = APIRouter()

@router.get("/ready")
async def ready():
    """Extended readiness with dependency checks."""
    checks = {
        "database": await check_db(),
        "cache": await check_redis(),
    }
    all_ok = all(checks.values())
    return Response(
        content=json.dumps({"status": "ok" if all_ok else "degraded", "checks": checks}),
        status_code=200 if all_ok else 503
    )

async def check_db():
    try:
        conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
        await conn.execute("SELECT 1")
        await conn.close()
        return True
    except:
        return False
```

---

## Unit Tests

```python
def test_ready_endpoint_returns_200():
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_ready_endpoint_returns_503_when_db_down(mock_db_failure):
    response = client.get("/ready")
    assert response.status_code == 503
```

---

## Runbook Update

Add to `A2_RUNBOOK.md`:

```markdown
### Readiness Endpoint

**Endpoint:** `GET /ready`
**Expected Response:** `{"status": "ok", "ready": true}`
**Status Codes:**
- 200: All dependencies healthy
- 503: One or more dependencies unhealthy

**Troubleshooting:**
1. If 503, check `checks` object for failed dependencies
2. Verify DATABASE_URL environment variable
3. Check network connectivity to Neon
```

---

## Rollback Plan

1. Revert PR
2. Deploy previous version
3. Orchestrator falls back to /health endpoint

---

## Success Criteria

- [ ] `/ready` returns 200 with healthy dependencies
- [ ] Orchestrator retry loops eliminated
- [ ] A8 "A2 Down" false positives eliminated
