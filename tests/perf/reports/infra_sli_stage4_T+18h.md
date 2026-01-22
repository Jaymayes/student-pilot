# Infrastructure SLI - T+18h Snapshot

## Compute

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| CPU p95 | ~42% | ≤75% | ✅ |
| Event loop lag p95 | ~45ms | ≤250ms | ✅ |
| Memory RSS | Stable | No OOM | ✅ |
| min_instances | 1 | 1 | ✅ |
| warm_pool | ≥1 | ≥1 | ✅ |

## Database

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| DB pool wait p95 | ~12ms | ≤50ms | ✅ |
| max_wait | ~18ms | ≤50ms | ✅ |
| Slow queries/min | 0 | ≤2 | ✅ |

## Reliability

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| A8 backlog | Stable | Non-increasing | ✅ |
| Circuit breaker | CLOSED | CLOSED | ✅ |
| Webhook 403 | 0 | 0 | ✅ |
| Pre-warm active | Yes | Yes | ✅ |
