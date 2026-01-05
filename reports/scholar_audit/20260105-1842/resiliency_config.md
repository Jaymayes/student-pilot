# Resiliency Configuration v2.0
**Audit Date:** 2026-01-05T18:42Z

## Timeout Configuration

| Service | Default Timeout | Retry Count | Backoff |
|---------|-----------------|-------------|---------|
| A5 Telemetry | 5000ms | 3 | Exponential |
| A5 Auth | 10000ms | 2 | Fixed |
| A5 API | 30000ms | 1 | None |
| A8 Events | 5000ms | 0 | None |

## Circuit Breaker States

| Service | Breaker | Threshold | Current State |
|---------|---------|-----------|---------------|
| A5 → A8 | Enabled | 5 failures | CLOSED (healthy) |
| A5 → A1 | Enabled | 3 failures | CLOSED (healthy) |
| A5 → A2 | Enabled | 5 failures | CLOSED (healthy) |

## Fallback Behavior

| Scenario | Behavior | Verified |
|----------|----------|----------|
| A8 unreachable | Buffer locally, retry | ✅ |
| A1 unreachable | Session validation local | ✅ |
| Stripe failure | Retry with backoff | ✅ |

## False Positive Classification

| Alert | Reproduced | Classification | Evidence |
|-------|------------|----------------|----------|
| "A1 DB unreachable" | No | FALSE POSITIVE | A1 /health 200 |
| "A3 revenue_blocker" | Yes | OPERATIONAL MODE | A3 endpoints 404 |
| "stale" status | Yes | BUG | heartbeat not updating |

## Clock Skew Check

All services within 1 second of UTC (verified via event timestamps).
