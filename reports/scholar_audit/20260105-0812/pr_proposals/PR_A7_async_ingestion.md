# PR: A7 - Async Ingestion Path + Idempotency

**Priority:** P1
**Owner:** A7 Team (auto_page_maker)
**Risk:** Medium (requires idempotency)
**Rollback:** Revert to sync writes

---

## Problem Statement

A7 ingestion uses synchronous database writes, causing:
- P95 latency 269-477ms (target: ≤150ms)
- Upstream backpressure during traffic spikes
- Potential A8 telemetry delays

**Evidence:**
```
| Sample | Latency | SLO Met |
| 1      | 477ms   | ❌      |
| 2      | 337ms   | ❌      |
| 3      | 269ms   | ❌      |
| 4      | 370ms   | ❌      |
| 5      | 278ms   | ❌      |
```

---

## Proposed Change

### Option 1: FastAPI BackgroundTasks (Minimal)

```python
from fastapi import BackgroundTasks

@router.post("/ingest", status_code=202)
async def ingest_event(event: EventSchema, background_tasks: BackgroundTasks):
    """Accept event immediately, process asynchronously."""
    idempotency_key = f"{event.source}:{event.event_id}"
    
    # Check idempotency
    if await redis.exists(idempotency_key):
        return {"status": "duplicate", "event_id": event.event_id}
    
    # Mark as processing
    await redis.setex(idempotency_key, 3600, "processing")
    
    # Enqueue background write
    background_tasks.add_task(write_to_db, event)
    
    return {"status": "accepted", "event_id": event.event_id}

async def write_to_db(event: EventSchema):
    try:
        await db.execute(INSERT_EVENT_SQL, event.dict())
        await redis.set(f"{event.source}:{event.event_id}", "completed")
    except Exception as e:
        await redis.set(f"{event.source}:{event.event_id}", f"failed:{str(e)}")
```

### Option 2: Celery + Redis (Production-Grade)

```python
from celery import Celery

celery = Celery('a7', broker=os.getenv('REDIS_URL'))

@router.post("/ingest", status_code=202)
async def ingest_event(event: EventSchema):
    idempotency_key = f"{event.source}:{event.event_id}"
    if await redis.exists(idempotency_key):
        return {"status": "duplicate"}
    
    await redis.setex(idempotency_key, 3600, "queued")
    process_event.delay(event.dict())
    return {"status": "accepted", "event_id": event.event_id}

@celery.task(bind=True, max_retries=3)
def process_event(self, event_dict):
    try:
        db.execute(INSERT_EVENT_SQL, event_dict)
    except Exception as e:
        self.retry(exc=e, countdown=2 ** self.request.retries)
```

---

## Performance Test Plan

```bash
# Generate 100 concurrent events
for i in {1..100}; do
  curl -X POST "$A7_URL/ingest" \
    -H "Content-Type: application/json" \
    -H "x-idempotency-key: test-$i" \
    -d '{"event_type":"PageView","source":"perf_test"}' &
done
wait

# Measure P50/P95/P99
# Target: P95 ≤ 100ms
```

---

## Rollback Plan

1. Feature flag `ASYNC_INGESTION=false`
2. Sync path remains in codebase
3. Toggle via environment variable
4. No data loss (queue drains before disable)

---

## Success Criteria

- [ ] P95 latency ≤ 100ms at 100-event load
- [ ] No duplicate events (idempotency verified)
- [ ] No upstream backpressure
- [ ] Zero data loss during rollback test
