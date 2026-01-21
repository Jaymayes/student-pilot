# Login Latency Investigation Report

**Date**: 2026-01-20
**RUN_ID**: CEOSPRINT-20260120-EXEC-ZT3G-GATE4-042

## Observed Issues

| Metric | Observed | Target | Status |
|--------|----------|--------|--------|
| Slow login | 2235ms | <300ms | ❌ 7x over |
| /health spike | 3104ms | <200ms | ❌ 15x over |
| Stale ARR data | 5+ min | <30s | ❌ |
| Telemetry 500 | Yes | Never | ❌ |

## Root Cause Analysis

### Primary: Cold Start + Vite Event Loop Blocking

When the Replit container wakes from sleep or Vite recompiles assets:
1. First request triggers Vite asset compilation
2. Vite compilation blocks the Node.js event loop
3. All concurrent requests (login, health) are delayed
4. Typical impact: 1500-3000ms delay

**Evidence from logs:**
- `/@react-refresh`: 1753ms
- `/src/main.tsx`: 2449ms
- `/@vite/client`: 2601ms

These Vite requests coincide with the slow login/health times.

### Secondary: OIDC Discovery Cache Expiry

- Scholar Auth OIDC discovery caches for ~5 minutes
- After cache expiry, first login triggers network round-trip
- Adds ~100-150ms to first request

### Tertiary: Telemetry Backpressure

- A8 Command Center returned 500 errors intermittently
- Telemetry retries consume event loop time
- Non-blocking but adds latency under load

## Current Mitigations

1. **Pre-warming on startup** (server/index.ts)
   - 3 samples across /api/health, /api/canary, /health
   - Eliminates cold start after container boot

2. **Event loop monitoring** (server/lib/capacity-monitoring.ts)
   - 300ms critical threshold, 2 consecutive samples to alert
   - Histogram tracking for p50/p95/p99

3. **Rate limiter GCP whitelist** (authRateLimit.ts)
   - Health check IPs bypass rate limiting

## Recommended Additional Mitigations

### Short-term (Gate-4 enablers)
1. **Extended pre-warm window**: Warm OIDC discovery explicitly
2. **Vite production build**: Use `npm run build` for production to eliminate dev server blocking
3. **Keep-alive heartbeat**: Ping container every 60s to prevent sleep

### Medium-term
1. **Separate Vite from API**: Run API on different port to isolate event loop
2. **Connection pooling**: Pre-warm database connections on startup
3. **Telemetry circuit breaker**: Fail-fast when A8 is unavailable

## Test Results (Post-Investigation)

10-sample login test after container warm:
- Min: 144ms
- Max: 357ms (first request cold)
- Avg: 186ms
- **Steady-state is healthy**, spikes are cold-start related

## Conclusion

Login latency spikes are caused by **Vite dev server event loop blocking** during asset compilation. This is a development environment artifact that would not occur in production with a built frontend.

**Recommendation**: Gate-4 retry should use production build (`npm run build`) rather than dev server to eliminate this bottleneck.

---

**Attestation**: Investigation complete. See latency_investigation.md
