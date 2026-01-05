# PR Draft: Issue B - A7 Async Ingestion Refactor
**App:** A7 (auto_page_maker)
**Priority:** P1 | **Risk:** MEDIUM | **Status:** DRAFT
**Feature Flag:** `ASYNC_INGESTION=true`

---

## Executive Summary

Refactor A7 to move all blocking operations (database writes, SendGrid API calls) off the hot request path using a 202-Accepted + Worker pattern. Target: P95 ≤150ms (currently 331ms).

---

## Before/After Architecture

### Before (Synchronous)
```
┌──────────┐   POST /ingest   ┌──────────┐   SYNC   ┌──────────┐
│  Client  │ ───────────────▶ │   A7     │ ───────▶ │ Database │
└──────────┘                  │  (sync)  │          └──────────┘
                              │          │   SYNC   ┌──────────┐
     Total Time: ~331ms       │          │ ───────▶ │ SendGrid │
                              └──────────┘          └──────────┘
```

### After (Async Worker Pattern)
```
┌──────────┐  POST /ingest  ┌──────────┐  ASYNC  ┌──────────┐
│  Client  │ ─────────────▶ │   A7     │ ──────▶ │  Queue   │
└──────────┘                │ (async)  │         │ (Redis)  │
      │                     └──────────┘         └──────────┘
      │                           │                   │
      │   202 Accepted            │                   ▼
      │   (P95 ≤50ms)             │            ┌──────────┐
      ◀───────────────────────────┘            │  Worker  │
                                               │ (async)  │
                                               └──────────┘
                                                    │
                                          ┌────────┴────────┐
                                          ▼                 ▼
                                    ┌──────────┐     ┌──────────┐
                                    │ Database │     │ SendGrid │
                                    └──────────┘     └──────────┘
```

---

## Implementation Specification

### API Contract

| Path | Method | Response | Latency Target |
|------|--------|----------|----------------|
| `POST /ingest` | POST | 202 Accepted | ≤50ms P95 |
| `GET /ingest/:id/status` | GET | 200 + status | ≤20ms P95 |

### Response Format

```json
// POST /ingest - 202 Accepted
{
  "status": "accepted",
  "id": "evt_abc123",
  "idempotency_key": "src:evt_abc123",
  "estimated_processing_ms": 5000
}

// GET /ingest/:id/status - 200 OK
{
  "id": "evt_abc123",
  "status": "completed", // pending | processing | completed | failed
  "processed_at": "2026-01-05T21:00:00Z",
  "result": { ... }
}
```

### Code Implementation

```python
# server/routes/ingest.py
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse
import redis
import time
import os

router = APIRouter()

# Feature flag
ASYNC_INGESTION = os.getenv("ASYNC_INGESTION", "true") == "true"

# Redis for queue and idempotency
redis_client = redis.Redis.from_url(os.getenv("REDIS_URL"))

@router.post("/ingest", status_code=202)
async def ingest(event: EventPayload, background_tasks: BackgroundTasks):
    """Accept event for async processing."""
    start = time.time()
    
    # Idempotency check
    idempotency_key = f"{event.source}:{event.id}"
    if redis_client.exists(idempotency_key):
        existing = redis_client.get(idempotency_key)
        return JSONResponse(
            {"status": "duplicate", "original_id": existing.decode()},
            status_code=200
        )
    
    if ASYNC_INGESTION:
        # Async path: queue for worker
        redis_client.setex(idempotency_key, 3600, event.id)
        redis_client.lpush("ingest_queue", event.json())
        redis_client.set(f"status:{event.id}", "pending")
        
        latency_ms = (time.time() - start) * 1000
        return JSONResponse({
            "status": "accepted",
            "id": event.id,
            "idempotency_key": idempotency_key,
            "latency_ms": round(latency_ms, 2)
        }, status_code=202)
    else:
        # Sync fallback (feature flag disabled)
        await process_event_sync(event)
        latency_ms = (time.time() - start) * 1000
        return JSONResponse({
            "status": "processed",
            "id": event.id,
            "latency_ms": round(latency_ms, 2)
        }, status_code=200)


@router.get("/ingest/{event_id}/status")
async def get_status(event_id: str):
    """Check processing status of an event."""
    status = redis_client.get(f"status:{event_id}")
    if not status:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {
        "id": event_id,
        "status": status.decode(),
        "processed_at": redis_client.get(f"processed_at:{event_id}")
    }
```

### Worker Implementation

```python
# workers/ingest_worker.py
import redis
import time
import asyncio
from circuitbreaker import circuit

redis_client = redis.Redis.from_url(os.getenv("REDIS_URL"))

# Circuit breaker for external services
@circuit(failure_threshold=5, recovery_timeout=30)
async def send_email_with_circuit(payload):
    """SendGrid call with circuit breaker."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        return await client.post(SENDGRID_URL, json=payload)

async def process_event(event_json: str):
    """Process a single event from queue."""
    event = json.loads(event_json)
    event_id = event["id"]
    
    try:
        redis_client.set(f"status:{event_id}", "processing")
        
        # Database write
        await db.execute(
            "INSERT INTO events (id, source, payload, created_at) VALUES ($1, $2, $3, NOW())",
            event_id, event["source"], event_json
        )
        
        # SendGrid (if needed) - with exponential backoff
        for attempt in range(3):
            try:
                await send_email_with_circuit(event)
                break
            except Exception as e:
                wait = 2 ** attempt
                await asyncio.sleep(wait)
        
        # Mark complete
        redis_client.set(f"status:{event_id}", "completed")
        redis_client.set(f"processed_at:{event_id}", datetime.utcnow().isoformat())
        
    except Exception as e:
        redis_client.set(f"status:{event_id}", "failed")
        redis_client.set(f"error:{event_id}", str(e)[:500])
        raise

async def worker_loop():
    """Main worker loop - pop from queue and process."""
    while True:
        try:
            # Blocking pop with 5s timeout
            item = redis_client.brpop("ingest_queue", timeout=5)
            if item:
                _, event_json = item
                await process_event(event_json)
        except Exception as e:
            print(f"Worker error: {e}")
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(worker_loop())
```

### Structured Tracing

```python
# Add tracing for observability
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

@router.post("/ingest", status_code=202)
async def ingest(event: EventPayload, background_tasks: BackgroundTasks):
    with tracer.start_as_current_span("ingest_enqueue") as span:
        span.set_attribute("event.id", event.id)
        span.set_attribute("event.source", event.source)
        
        # ... enqueue logic ...
        
        span.set_attribute("queue.depth", redis_client.llen("ingest_queue"))
        span.set_attribute("latency_ms", latency_ms)
```

---

## Expected Performance Improvement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| P50 | 269ms | ≤30ms | -89% |
| P95 | 331ms | ≤50ms | -85% |
| P99 | 442ms | ≤100ms | -77% |

---

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Queue backup | Medium | Medium | Monitoring + auto-scale workers |
| Lost events | Low | High | Redis persistence + dead letter queue |
| Worker crash | Low | Medium | Supervisor + restart policy |
| SendGrid rate limits | Medium | Low | Circuit breaker + backoff |

---

## Rollback Plan

### Instant Rollback (Feature Flag)
```bash
# Disable async ingestion - reverts to sync processing
export ASYNC_INGESTION=false
pm2 restart a7
```

### Queue Drain
```bash
# If rolling back, drain existing queue first
redis-cli llen ingest_queue  # Check depth
# Let workers process remaining items before disabling
```

### Full Rollback
```bash
git revert <commit-sha>
git push origin main
```

---

## Monitoring & Alerts

### Queue Depth Alert
```yaml
- alert: A7IngestQueueBackup
  expr: redis_list_length{key="ingest_queue"} > 1000
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "A7 ingest queue backing up"
```

### Worker Health
```yaml
- alert: A7WorkerDown
  expr: up{job="a7-worker"} == 0
  for: 2m
  labels:
    severity: critical
```

### Latency SLO
```yaml
- alert: A7IngestLatencyHigh
  expr: histogram_quantile(0.95, rate(ingest_latency_seconds_bucket[5m])) > 0.15
  for: 5m
  labels:
    severity: warning
```

---

## Test Cases

```python
# tests/test_async_ingest.py

def test_ingest_returns_202():
    """Async mode returns 202 Accepted."""
    response = client.post("/ingest", json={"id": "test1", "source": "a5"})
    assert response.status_code == 202
    assert response.json()["status"] == "accepted"

def test_ingest_idempotency():
    """Duplicate events return original ID."""
    event = {"id": "dup1", "source": "a5"}
    client.post("/ingest", json=event)
    response = client.post("/ingest", json=event)
    assert response.json()["status"] == "duplicate"

def test_ingest_p95_under_50ms():
    """P95 latency under 50ms."""
    latencies = []
    for i in range(100):
        start = time.time()
        client.post("/ingest", json={"id": f"perf{i}", "source": "a5"})
        latencies.append((time.time() - start) * 1000)
    
    p95 = sorted(latencies)[95]
    assert p95 < 50, f"P95 {p95}ms exceeds 50ms target"

def test_worker_processes_queue():
    """Worker processes queued events."""
    event_id = "worker_test"
    client.post("/ingest", json={"id": event_id, "source": "a5"})
    
    # Wait for worker
    time.sleep(2)
    
    status = client.get(f"/ingest/{event_id}/status")
    assert status.json()["status"] == "completed"

def test_circuit_breaker_opens():
    """Circuit breaker opens on repeated failures."""
    with mock_sendgrid_failure():
        for _ in range(10):
            client.post("/ingest", json={"id": f"cb{_}", "source": "a5"})
        
        # Circuit should be open
        assert circuit_breaker.state == "open"
```

---

## A5 Integration Notes

A5 should handle 202 responses from A7:

```typescript
// client/src/lib/a7Client.ts
async function ingestToA7(event: Event): Promise<IngestResult> {
  const response = await fetch(`${A7_URL}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
  
  if (response.status === 202) {
    // Async accepted - poll for completion if needed
    const result = await response.json();
    return { status: 'pending', eventId: result.id };
  }
  
  return { status: 'error' };
}
```

---

## Acceptance Criteria

- [ ] POST /ingest returns 202 with P95 ≤50ms
- [ ] Idempotency prevents duplicate processing
- [ ] Worker processes queue reliably
- [ ] Circuit breaker protects SendGrid calls
- [ ] Feature flag allows instant rollback to sync
- [ ] Queue depth monitoring in place
- [ ] Structured tracing for observability
