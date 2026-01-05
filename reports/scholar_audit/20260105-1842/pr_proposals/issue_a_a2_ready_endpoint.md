# PR Issue A: A2 /ready Endpoint
**Priority:** P1 | **Risk:** LOW | **Owner:** A2 Team

## Canonical Evidence

```
A2 /ready: HTTP 404 (20/20 samples)
A2 /health: HTTP 200 (10/10 samples, P95=151ms)
```

Response: `{"error":{"code":"NOT_FOUND","message":"The requested resource '/ready' was not found"}}`

## Proposed Change

```python
@router.get("/ready")
async def ready():
    checks = {"db": await ping_db(), "cache": await ping_redis()}
    ok = all(checks.values())
    return JSONResponse(
        {"status": "ok" if ok else "degraded", "checks": checks},
        status_code=200 if ok else 503
    )
```

## Contract

| Path | Success | Degraded | Notes |
|------|---------|----------|-------|
| /ready | 200 + `{"status":"ok"}` | 503 | Orchestrator retries on 503 |
| /health | 200 | 200 | Always 200 if process alive |

## Tests

```python
def test_ready_200_when_healthy():
    assert client.get("/ready").status_code == 200

def test_ready_503_when_db_down(mock_db_fail):
    assert client.get("/ready").status_code == 503
```

## Rollback

1. `git revert <commit>`
2. Deploy previous version
3. Orchestrator uses /health fallback
