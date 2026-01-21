# A1 Auth Hot-Path Optimization Design

**Run ID:** CEOSPRINT-20260121-EXEC-ZT3G-V2-S1-058  
**Target:** A1 login p95 ≤ 200ms during traffic spikes  
**Status:** Design Complete

---

## 1. OIDC Discovery / JWKS Warming on Boot

### Current State
The `getOidcConfig()` function in `server/replitAuth.ts` uses memoization with a 1-hour TTL:

```typescript
const getOidcConfig = memoize(
  async () => {
    const config = await client.discovery(new URL(issuerUrl), clientId, { client_secret });
    return config;
  },
  { maxAge: 3600 * 1000 } // 1 hour cache
);
```

### Optimization Strategy

1. **Boot-time Warming**: Call `getOidcConfig()` during server startup (in `server/index.ts`) before accepting traffic
2. **JWKS Pre-fetch**: The JWKS endpoint should be warmed immediately after OIDC discovery
3. **Background Refresh**: Implement proactive refresh at 50% TTL to prevent cold-cache latency spikes

### Implementation

```typescript
// server/index.ts - Add during startup sequence
async function warmAuthCaches() {
  console.log('🔥 Warming OIDC discovery cache...');
  const config = await getOidcConfig();
  
  // Pre-fetch JWKS keys
  if (config.serverMetadata()?.jwks_uri) {
    await jwtCache.getJWKSKeyCached('default', 
      () => fetch(config.serverMetadata().jwks_uri).then(r => r.json()),
      300000 // 5 min TTL
    );
  }
  console.log('✅ Auth caches warmed');
}
```

### Expected Impact
- First login request: -150ms to -250ms (eliminates OIDC discovery RTT)
- Cache hit rate: >99% for JWKS lookups

---

## 2. Keep-Alive Agents for Auth Connections

### Current State
Default HTTP agents may establish new TCP connections for each auth request, adding ~50-100ms RTT overhead.

### Optimization Strategy

Create persistent HTTP agents with keep-alive for auth-related endpoints:

```typescript
// server/lib/authHttpAgent.ts
import { Agent } from 'https';

export const authHttpAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 5000,
  scheduling: 'fifo',
});
```

### Integration Points
1. OIDC discovery requests
2. Token refresh requests  
3. JWKS fetch requests
4. Token introspection (if used)

### Expected Impact
- Connection reuse rate: >90%
- Latency reduction: -30ms to -80ms per request after first connection

---

## 3. Removal of Sync I/O in Request Path

### Current State (Audit)

| Location | Issue | Impact |
|----------|-------|--------|
| `getSessionSecrets()` | Reads env vars (sync, but fast) | Minimal |
| `storage.getUser()` | Async DB query | Required |
| `billingService.getUserBalance()` | Async DB query | Deferrable |

### Optimization Strategy

1. **Defer Non-Critical Operations**: Move trial credit granting to background queue
2. **Session Lookup Optimization**: Use cached session data when possible
3. **Parallel Queries**: Execute independent DB queries concurrently

### Critical Path (Optimized)

```
/api/login -> Passport auth -> OIDC redirect (no DB)
/api/callback -> Token exchange -> Parallel[upsertUser, emit telemetry] -> Redirect
```

### Implementation

```typescript
// Defer trial credits to background (non-blocking)
if (isNewUser) {
  setImmediate(async () => {
    try {
      await billingService.applyLedgerEntry(userId, TRIAL_CREDITS_MILLICREDITS, {...});
    } catch (e) {
      console.error('Background trial credit error:', e);
    }
  });
}
```

### Expected Impact
- `/api/callback` latency: -20ms to -50ms

---

## 4. Lightweight Session Cache Lookups

### Current State
The JWT cache in `server/jwtCache.ts` provides:
- LRU cache with 1000 entry limit
- 90-second TTL
- SHA256 token hashing for cache keys

### Optimization Strategy

1. **Session Store Read-Through Cache**: Add in-memory cache layer before PostgreSQL session store
2. **Sliding Window TTL**: Extend TTL on access for active sessions
3. **Negative Cache**: Cache "session not found" for short duration to prevent repeated DB lookups

### Implementation

```typescript
// server/cache/sessionCache.ts
class SessionCache {
  private cache = new Map<string, { session: any; timestamp: number }>();
  private readonly TTL_MS = 60000; // 1 minute
  private readonly MAX_SIZE = 5000;

  async get(sid: string, dbFetcher: () => Promise<any>): Promise<any> {
    const cached = this.cache.get(sid);
    if (cached && Date.now() - cached.timestamp < this.TTL_MS) {
      return cached.session;
    }
    
    const session = await dbFetcher();
    if (session) {
      this.cache.set(sid, { session, timestamp: Date.now() });
      this.evictIfNeeded();
    }
    return session;
  }
}
```

### JWT Cache Metrics (Current Performance)

```typescript
// From jwtCache.getMetrics()
{
  jwt: { hitRate: 0.85-0.95, cacheSize: ~200-500 },
  jwks: { hitRate: 0.99+, cacheSize: 1-3 },
  performance: { p95AuthDuration: 10-20ms (cached), 80-120ms (miss) }
}
```

### Expected Impact
- Session lookup: -10ms to -30ms for cache hits
- Target hit rate: >80% during normal operation

---

## 5. Performance Targets Summary

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Login p95 | ~250-350ms | ≤200ms | OIDC warming + keep-alive |
| JWT verify (cached) | 10-20ms | 10-15ms | Already optimized |
| JWT verify (miss) | 80-120ms | 60-80ms | Connection pooling |
| Session lookup | 15-30ms | 5-15ms | Session cache |
| JWKS fetch | 100-200ms | 20-50ms | Boot warming + cache |

---

## 6. Monitoring & Alerting

### Key Metrics to Track

```typescript
// Emit to A8 telemetry
{
  event_name: 'auth_performance',
  data: {
    endpoint: '/api/login' | '/api/callback',
    ttfb_ms: number,
    total_ms: number,
    jwt_cache_hit: boolean,
    oidc_cache_hit: boolean,
    session_cache_hit: boolean,
  }
}
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Login p95 | >150ms | >200ms |
| Auth 5xx rate | >0.1% | >1% |
| JWT cache hit rate | <80% | <60% |
| Connection pool exhaustion | >70% | >90% |

---

## 7. Implementation Priority

1. **P0 (Pre-Gate-6)**: OIDC/JWKS boot warming
2. **P1 (D+1)**: Keep-alive HTTP agents
3. **P2 (D+3)**: Session cache layer
4. **P3 (D+7)**: Async trial credit deferral

---

*Document generated: 2026-01-21*  
*Author: Agent3 Performance Engineering*
