# PR Issue B: A7 Async Ingestion
**Priority:** P1 | **Risk:** MEDIUM | **Owner:** A7 Team

## Canonical Evidence

```
A7 /health P50=255ms, P95=323ms, P99=366ms (30 samples)
A7 /health P50=269ms, P95=406ms, P99=442ms (50 samples)
SLO Target: ≤150ms
```

## Root Cause Analysis

Suspected synchronous operations:
1. Database write on request path
2. Potential SendGrid API call (~330ms contribution unverified)
3. No async worker pattern

## Proposed Change

```python
from fastapi import BackgroundTasks

@router.post("/ingest", status_code=202)
async def ingest(event: Event, bg: BackgroundTasks):
    key = f"{event.source}:{event.id}"
    if await redis.exists(key):
        return {"status": "duplicate"}
    await redis.setex(key, 3600, "processing")
    bg.add_task(write_to_db, event)
    return {"status": "accepted", "id": event.id}
```

## Expected Improvement

| Metric | Current | Target | Change |
|--------|---------|--------|--------|
| P95 | 406ms | ≤100ms | -75% |
| P50 | 269ms | ≤50ms | -80% |

## Performance Test

```bash
for i in {1..100}; do
  curl -X POST "$A7_URL/ingest" -d '{"event":"test"}' &
done
wait
# Measure: P95 ≤100ms
```

## Rollback

`export ASYNC_INGESTION=false` (feature flag)
