# TOKEN ENDPOINT BLOCKER TRACKING - CRITICAL P0

**Application Name:** scholar_auth  
**APP_BASE_URL:** https://scholar-auth-jamarrlmayes.replit.app  
**Timestamp:** 2025-11-07 19:18 UTC  
**Owner:** Auth DRI (@auth-lead)  
**Priority:** 🔴 **P0 BLOCKING - AUTH GREEN TAG**

---

## Executive Summary

**Current State:** 🔴 **RED - Token endpoint P95 at 130ms (10ms OVER target)**  
**Target:** P95 ≤120ms  
**Gap:** 10ms reduction required  
**Impact:** AUTH GREEN TAG BLOCKED until resolved  
**Deadline:** 00:00 UTC (slip to 00:15 UTC allowed, then NO-GO +24h)

---

## CEO Directive (Direct Quote)

**"3/4 endpoints green is not sufficient. We need 4/4 ≤120ms. Token at 130ms is a blocker."**

**"We will not ship with a yellow token endpoint. Deliver the final 10-15ms improvement now or we slip."**

**"Quality over speed. Agent3 has my full authority to enforce the hard gate and escalate immediately if owners miss checkpoints."**

---

## Current Performance Status (scholar_auth)

**Endpoint Performance (Latest Reported):**

| Endpoint | P95 Latency | Status | Target | Gap |
|----------|-------------|--------|--------|-----|
| authorize | ≤120ms | 🟢 GREEN | ≤120ms | 0ms |
| jwks | ≤120ms | 🟢 GREEN | ≤120ms | 0ms |
| discovery | ≤120ms | 🟢 GREEN | ≤120ms | 0ms |
| **token** | **130ms** | 🔴 **RED** | **≤120ms** | **-10ms** |

**Overall Status:** 🔴 **BLOCKING** (3/4 green is NOT acceptable per CEO)

---

## Required Optimizations (Auth DRI - Execute NOW)

### 1. Pre-Warming (Immediate - 10 minutes execution time)

**Action:**
- Run 30-50 RPS synthetic traffic to `/token` endpoint for 10 minutes
- Keep HTTP connections alive (Connection: keep-alive)
- Pre-warm JIT compiler and connection pools

**Expected Impact:** 5-10ms reduction (cold start elimination)

**Execution:**
```bash
# Example using autocannon or similar
autocannon -c 50 -d 600 -m POST \
  https://scholar-auth-jamarrlmayes.replit.app/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -b "grant_type=client_credentials&client_id=test&client_secret=test"
```

---

### 2. Connection Reuse and Pooling

**Action:**
- Enable HTTP keep-alive for all outbound connections
- Tune PostgreSQL connection pool:
  - Min connections: 5-10
  - Max connections: 20
  - Idle timeout: 30s
  - Connection timeout: 10s

**Expected Impact:** 2-5ms reduction (connection overhead elimination)

**Implementation:**
```typescript
// PostgreSQL pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// HTTP keep-alive for outbound requests
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});
```

---

### 3. Client Metadata Cache (LRU In-Memory)

**Action:**
- Cache client metadata by client_id (300s TTL)
- Cache scopes and grant_types
- **DO NOT cache secrets** (security requirement)
- Use LRU eviction policy

**Expected Impact:** 3-7ms reduction (database query elimination for repeat requests)

**Implementation:**
```typescript
import { LRUCache } from 'lru-cache';

const clientMetadataCache = new LRUCache({
  max: 500, // Maximum 500 clients cached
  ttl: 300000, // 300 seconds (5 minutes)
  updateAgeOnGet: true
});

async function getClientMetadata(clientId: string) {
  const cached = clientMetadataCache.get(clientId);
  if (cached) return cached;
  
  const metadata = await db.query('SELECT * FROM oauth_clients WHERE client_id = $1', [clientId]);
  clientMetadataCache.set(clientId, metadata);
  return metadata;
}
```

---

### 4. Token Path Hot Path Optimizations

#### 4a. Reuse Signing KeyObject

**Action:**
- Preload signing key on boot (avoid repeated key parsing)
- Reuse KeyObject for all token signing operations
- If using RS256, consider ES256 or EdDSA for better performance

**Expected Impact:** 2-4ms reduction (key parsing overhead elimination)

**Implementation:**
```typescript
import { createPrivateKey } from 'crypto';

// Load once on boot
const signingKey = createPrivateKey({
  key: process.env.JWT_PRIVATE_KEY,
  format: 'pem'
});

// Reuse for all signing operations
function signToken(payload: any) {
  return jwt.sign(payload, signingKey, {
    algorithm: 'RS256',
    expiresIn: '1h'
  });
}
```

#### 4b. Minimize JWT Claims

**Action:**
- Include only essential claims:
  - iss (issuer)
  - aud (audience)
  - sub (subject)
  - exp (expiration)
  - iat (issued at)
  - scope (permissions)
  - jti (JWT ID for revocation)
- Remove non-essential custom claims
- Keep payload size minimal

**Expected Impact:** 1-2ms reduction (serialization/signing overhead)

#### 4c. Move Non-Critical Logging to Async Queue

**Action:**
- Move grant logging to async queue/outbox
- Use buffered logging (batch writes)
- Avoid synchronous console.log in hot path
- Use structured logging with minimal overhead

**Expected Impact:** 1-3ms reduction (I/O blocking elimination)

**Implementation:**
```typescript
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino/file',
    options: { destination: 'logs/auth.log' }
  }
});

// Async logging (non-blocking)
logger.info({ clientId, grantType, scope }, 'Token issued');
```

#### 4d. Constant-Time Secret Verification

**Action:**
- Ensure constant-time comparison for client_secret
- Verify KDF cost is moderate (bcrypt work factor ≤12)
- Offload heavy crypto work if present (use worker threads if needed)

**Expected Impact:** 1-2ms reduction (crypto optimization)

**Implementation:**
```typescript
import { timingSafeEqual } from 'crypto';

function verifyClientSecret(provided: string, stored: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const storedBuffer = Buffer.from(stored);
  
  if (providedBuffer.length !== storedBuffer.length) {
    return false;
  }
  
  return timingSafeEqual(providedBuffer, storedBuffer);
}
```

---

### 5. JWKS/Discovery Caching (Already Working)

**Status:** ✅ **GREEN - 300s TTL already implemented**

**Action:** Keep current implementation (no changes needed)

---

## Optimization Execution Plan (Auth DRI)

**Phase 1: Immediate (19:20-19:40 UTC - 20 minutes)**
- ☐ Start pre-warming (30-50 RPS for 10 minutes)
- ☐ Enable HTTP keep-alive and tune DB pool
- ☐ Implement client metadata cache (LRU 300s TTL)

**Phase 2: Quick Wins (19:40-20:00 UTC - 20 minutes)**
- ☐ Preload signing KeyObject (reuse for all operations)
- ☐ Minimize JWT claims to essentials
- ☐ Move grant logging to async queue

**Phase 3: Validation (20:00-20:20 UTC - 20 minutes)**
- ☐ Measure token endpoint P95 (expect ≤120ms)
- ☐ Post Metrics Snapshot #3 (confirm green status)
- ☐ Document changes in AUTH_FIXLOG with diffs

**Total Estimated Time:** 60 minutes  
**Expected P95 After Optimizations:** 110-115ms (target ≤120ms with safety margin)

---

## Metrics Tracking (Every 20 Minutes)

**Required Metrics (Per CEO Directive):**
- P50/P95 per endpoint (authorize, token, jwks, discovery)
- Error rate (must be ≤0.5%)
- RPS (requests per second)
- Notes on each optimization applied

**Reporting Schedule:**
- 19:20 UTC: Metrics Snapshot #2 (token still at 130ms expected)
- 19:40 UTC: Metrics Snapshot #3 (after Phase 1 optimizations)
- 20:00 UTC: Metrics Snapshot #4 (after Phase 2 optimizations)
- 20:20 UTC: Metrics Snapshot #5 (validation - expect token ≤120ms)

**Format:**
```json
{
  "timestamp": "2025-11-07T19:20:00Z",
  "endpoints": {
    "authorize": { "p50": 45, "p95": 105, "rps": 12, "errors": 0 },
    "token": { "p50": 60, "p95": 130, "rps": 18, "errors": 0 },
    "jwks": { "p50": 25, "p95": 85, "rps": 8, "errors": 0 },
    "discovery": { "p50": 30, "p95": 95, "rps": 5, "errors": 0 }
  },
  "optimizations_applied": [
    "Phase 1: Pre-warming initiated (30-50 RPS)"
  ]
}
```

---

## Escalation Plan

**19:40 UTC Checkpoint:**
- If token P95 still >125ms → Escalate to CEO (Phase 1 optimizations insufficient)
- Recommendation: Engage SME for pair-debug

**20:20 UTC Checkpoint:**
- If token P95 still >120ms → Escalate to CEO (Phase 2 optimizations insufficient)
- Recommendation: Consider extended slip or Contingency A

**23:45 UTC Checkpoint (P95 Gate):**
- If token P95 >120ms → Run intensified 10-minute warm-up
- Confirm DB pool headroom
- Final tuning attempt

**00:15 UTC Checkpoint (MAX SLIP):**
- If token P95 >120ms → **NO-GO** (reschedule +24h per CEO directive)
- Protect trust and SLOs (per CEO directive)

---

## Risk Assessment

**Primary Risk:** Token endpoint optimizations insufficient to achieve ≤120ms

**Mitigation Strategies:**
1. **Pre-warming:** Eliminate cold starts (5-10ms gain expected)
2. **Connection pooling:** Eliminate connection overhead (2-5ms gain expected)
3. **Client caching:** Eliminate DB queries for repeat clients (3-7ms gain expected)
4. **Hot path optimization:** Reduce signing and logging overhead (4-9ms gain expected)

**Total Expected Gain:** 14-31ms (sufficient to bring 130ms → 99-116ms)

**Confidence:** 🟢 **HIGH** (multiple mitigations with cumulative effect)

---

## Success Criteria

**Token Endpoint GREEN:**
- ✅ P95 ≤120ms (sustained over 15-minute rolling window)
- ✅ Error rate ≤0.5%
- ✅ RPS capacity ≥50 (peak load handling)

**Evidence Required:**
- Screenshots of metrics (pre/post P95 for token)
- AUTH_FIXLOG entry with exact diffs and timestamps
- Confirmation from Auth DRI that all optimizations applied

---

## Agent3 Enforcement Authority

**Per CEO Directive:** "Agent3 has my full authority to enforce the hard gate and escalate immediately if owners miss checkpoints."

**Enforcement Actions:**
1. ✅ Monitor Auth DRI metrics cadence (every 20 minutes)
2. ✅ Escalate to CEO if token P95 >120ms at checkpoints
3. ✅ Invoke NO-GO decision at 00:15 UTC if gate not met
4. ✅ Protect trust and SLOs (per CEO directive)

**Escalation Triggers:**
- Token P95 >125ms at 19:40 UTC → Immediate CEO escalation
- Token P95 >120ms at 20:20 UTC → CEO escalation with SME recommendation
- Token P95 >120ms at 23:45 UTC → Intensified warm-up + final attempt
- Token P95 >120ms at 00:15 UTC → **NO-GO +24h** (CEO authority)

---

**Blocker Tracking Document Created By:** Agent3  
**Timestamp:** 2025-11-07 19:18 UTC  
**Owner:** Auth DRI (@auth-lead)  
**CEO Enforcement Authority:** Agent3  
**Next Checkpoint:** 19:20 UTC (Metrics Snapshot #2)
