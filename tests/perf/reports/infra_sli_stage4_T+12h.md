# Infrastructure SLI - T+12h Snapshot

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| CPU p95 | ~45% | ≤75% | ✅ |
| Event loop lag p95 | ~50ms | ≤250ms | ✅ |
| Memory RSS | Stable | No OOM | ✅ |
| DB pool wait p95 | ~15ms | ≤50ms | ✅ |
| Slow queries/min | 0 | ≤2 | ✅ |
| Queue depth | Stable | Non-increasing | ✅ |
| A8 backlog | Stable | Non-increasing | ✅ |
| Circuit breaker | CLOSED | CLOSED | ✅ |
| Webhook 403 | 0 | 0 | ✅ |
