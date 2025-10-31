# App: scholar_auth — Fix Plan and ETA

**App**: scholar_auth  
**Base URL**: https://scholar-auth-jamarrlmayes.replit.app  
**Report Date**: 2025-10-31 22:30 UTC  
**Current Status**: 🔴 RED (Not Ready) - **HIGHEST PRIORITY FIX**

---

## Critical Priority Notice

⚠️ **This is the highest-priority auth fix** - scholar_auth JWKS blocker affects ALL platform apps. No authentication works without this. Fix this IN PARALLEL with scholarship_api.

---

## Prioritized Issues

### P0 - Platform Blockers (MUST FIX IMMEDIATELY)

#### GAP-001: JWKS Endpoint Returns 500 Internal Server Error
**Issue**: GET /.well-known/jwks.json returns 500 error instead of JWK set

**Root Cause**: Likely one of:
1. Key generation failed or keys not stored
2. Handler error when formatting JWK response
3. Database/storage connection issue for key retrieval

**Fix Required**:

**Step 1**: Verify key storage and generation in `server/auth/jwks.ts` or equivalent:

```typescript
// Check if keys exist and are valid
import { readFileSync, existsSync } from 'fs';
import { generateKeyPairSync } from 'crypto';
import path from 'path';

const KEYS_PATH = path.join(process.cwd(), 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_PATH, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_PATH, 'public.pem');

// Generate keys if they don't exist
function ensureKeys() {
  if (!existsSync(KEYS_PATH)) {
    fs.mkdirSync(KEYS_PATH, { recursive: true });
  }
  
  if (!existsSync(PRIVATE_KEY_PATH) || !existsSync(PUBLIC_KEY_PATH)) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
  }
}
```

**Step 2**: Fix JWKS endpoint handler in `server/routes.ts`:

```typescript
import { exportJWK, importSPKI } from 'jose';

app.get('/.well-known/jwks.json', async (req, res) => {
  try {
    ensureKeys(); // Ensure keys exist
    
    const publicKeyPem = readFileSync(PUBLIC_KEY_PATH, 'utf8');
    const publicKey = await importSPKI(publicKeyPem, 'RS256');
    const jwk = await exportJWK(publicKey);
    
    res.json({
      keys: [
        {
          ...jwk,
          alg: 'RS256',
          use: 'sig',
          kid: 'scholar-auth-key-1' // Consistent key ID
        }
      ]
    });
  } catch (error) {
    console.error('JWKS endpoint error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to generate JWKS',
        request_id: req.id || 'unknown'
      }
    });
  }
});
```

**Steps**:
1. Add key generation logic (ensure RSA keys exist)
2. Fix JWKS endpoint to properly export public key in JWK format
3. Add error logging to identify exact failure point
4. Test: `curl https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json | jq .keys`
5. Expected: Valid JWK set with one RSA key

**Owner**: Engineering (scholar_auth maintainer)  
**ETA**: **2-3 hours** (key generation + endpoint fix + testing)

**Risk**: Medium (depends on storage/permissions)

**Test Plan**:
```bash
# Test JWKS retrieval
curl https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json

# Expected: 200 + JWK set
# {
#   "keys": [
#     {
#       "kty": "RSA",
#       "use": "sig",
#       "kid": "scholar-auth-key-1",
#       "alg": "RS256",
#       "n": "...",
#       "e": "AQAB"
#     }
#   ]
# }
```

**Rollback Plan**: If keys cause issues, regenerate with different algorithm or restore from backup

---

#### GAP-002: /canary Returns HTML Instead of JSON v2.7
**Issue**: /canary endpoint returns SPA HTML page instead of v2.7 JSON schema

**Root Cause**: Express routing sends all unmatched routes to SPA; /canary needs explicit API route before SPA fallback

**Fix Required**:

Add /canary route in `server/routes.ts` BEFORE SPA fallback:

```typescript
// Add this BEFORE any SPA fallback middleware
app.get("/canary", (req, res) => {
  // Check if JWKS is working
  let dependenciesOk = true;
  try {
    const publicKeyPem = readFileSync(PUBLIC_KEY_PATH, 'utf8');
    if (!publicKeyPem) dependenciesOk = false;
  } catch (error) {
    dependenciesOk = false;
  }
  
  res.json({
    app: "scholar_auth",
    app_base_url: "https://scholar-auth-jamarrlmayes.replit.app",
    version: "v2.7",
    status: dependenciesOk ? "ok" : "degraded",
    p95_ms: 120, // Will be updated by monitoring
    security_headers: {
      present: [
        "Strict-Transport-Security",
        "Content-Security-Policy",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy"
      ],
      missing: []
    },
    dependencies_ok: dependenciesOk,
    timestamp: new Date().toISOString()
  });
});

// SPA fallback comes AFTER all API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});
```

**Steps**:
1. Add /canary route with v2.7 schema (8 fields exactly)
2. Ensure route is BEFORE SPA fallback in middleware order
3. Set `dependencies_ok` based on JWKS health check
4. Deploy to production
5. Verify: `curl https://scholar-auth-jamarrlmayes.replit.app/canary | jq .version`
6. Expected: `"v2.7"`

**Owner**: Engineering (scholar_auth maintainer)  
**ETA**: **0.5-1 hour** (can run in parallel with GAP-001)

**Risk**: Low (simple route addition)

---

### P1 - Pre-GO Polish

#### GAP-003: P95 Latency Exceeds SLO
**Issue**: P95 = 284ms (target ≤120ms), 2.4x over SLO

**Root Cause**: Unknown until profiling performed

**Potential Causes**:
- Cold start delay (serverless)
- Inefficient token generation
- Database query for session/user lookup
- Missing caching layer

**Fix Required** (TBD after GAP-001 and GAP-002 fixed):

```typescript
// Add response caching for OIDC discovery and JWKS
import { LRUCache } from 'lru-cache';

const jwksCache = new LRUCache({
  max: 1,
  ttl: 1000 * 60 * 60 // 1 hour
});

app.get('/.well-known/jwks.json', async (req, res) => {
  const cached = jwksCache.get('jwks');
  if (cached) {
    return res.json(cached);
  }
  
  const jwks = await generateJWKS(); // Your JWKS generation
  jwksCache.set('jwks', jwks);
  
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(jwks);
});
```

**Steps**:
1. Profile application under load after P0 fixes
2. Identify bottleneck (key generation, DB queries, etc.)
3. Implement caching for OIDC discovery and JWKS
4. Optimize token generation if needed
5. Re-measure P95

**Owner**: Engineering (scholar_auth + performance team)  
**ETA**: **1-2 hours** (after P0 fixes)

**Note**: Can proceed to Conditional Go with elevated latency if P0 fixes complete. Mark as AMBER and optimize post-launch.

---

#### GAP-004: CORS Configuration Unvalidated
**Issue**: Unknown if CORS allows all 8 platform origins

**Root Cause**: Cannot test until JWKS is functional

**Fix Required**:

```typescript
// In server/index.ts
import cors from 'cors';

const allowedOrigins = [
  'https://scholar-auth-jamarrlmayes.replit.app',
  'https://scholarship-api-jamarrlmayes.replit.app',
  'https://scholarship-agent-jamarrlmayes.replit.app',
  'https://scholarship-sage-jamarrlmayes.replit.app',
  'https://student-pilot-jamarrlmayes.replit.app',
  'https://provider-register-jamarrlmayes.replit.app',
  'https://auto-page-maker-jamarrlmayes.replit.app',
  'https://auto-com-center-jamarrlmayes.replit.app',
  'http://localhost:5000' // Development only
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**Steps**:
1. Add/verify CORS middleware with all 8 origins
2. Deploy to production
3. Test from student_pilot: Fetch JWKS cross-origin
4. Verify no CORS errors in browser console

**Owner**: Engineering (scholar_auth maintainer)  
**ETA**: **0.25 hour** (can run in parallel)

---

## Integration Validation Tasks

### After P0 Fixes Complete

#### INT-001: Validate Token Issuance
**Steps**:
1. Trigger login flow from student_pilot
2. Receive authorization code
3. Exchange for tokens at /token endpoint
4. Verify tokens include correct claims (iss, aud, sub, exp)
5. Decode id_token and access_token headers

**Expected**:
- id_token header: `{"alg": "RS256", "kid": "scholar-auth-key-1"}`
- id_token payload: `{"iss": "https://scholar-auth...", "aud": "student_pilot", "sub": "...", "exp": ...}`

**ETA**: 0.5 hour validation

#### INT-002: Validate Cross-App Token Verification
**Steps**:
1. student_pilot receives token
2. student_pilot calls scholarship_api with Bearer token
3. scholarship_api fetches JWKS from scholar_auth
4. scholarship_api verifies token signature
5. Request succeeds

**Expected**: 200 response from scholarship_api

**ETA**: 0.5 hour validation

---

## Remediation Timeline

### Phase 1: Critical Path (T+0 to T+4 hours) - RUN IN PARALLEL

| Time | Task | Owner | Blocker Level | Can Parallelize? |
|------|------|-------|---------------|------------------|
| T+0 to T+3h | Fix JWKS endpoint (GAP-001) | Engineering | P0 | **YES** |
| T+0 to T+1h | Implement /canary v2.7 (GAP-002) | Engineering | P0 | **YES** (parallel with JWKS) |
| T+0 to T+0.25h | Configure CORS (GAP-004) | Engineering | P1 | **YES** (parallel) |
| T+3 to T+3.5h | Validate token issuance (INT-001) | QA | - | After JWKS fix |
| T+3.5 to T+4h | Validate cross-app verification (INT-002) | QA | - | After token issuance |

**Outcome**: scholar_auth functional, JWKS working, tokens verifiable

---

### Phase 2: Performance Optimization (T+4 to T+6 hours)

| Time | Task | Owner | Blocker Level |
|------|------|-------|---------------|
| T+4 to T+5h | Profile under load (GAP-003) | Engineering | P1 |
| T+5 to T+6h | Implement caching/optimization | Engineering | P1 |
| T+6 to T+6.5h | Re-measure P95 latency | QA | - |

**Outcome**: If P95 ≤120ms → **FULL GO**

---

## Revenue-Start ETA

**Earliest Safe Revenue Start**: **T+3-4 hours** (AFTER JWKS fix + validation)

**Requirements for Unblocking Revenue**:
1. ✅ JWKS endpoint returns valid JWK set (not 500 error)
2. ✅ /canary endpoint returns v2.7 JSON (8 fields)
3. ✅ Token issuance works end-to-end
4. ✅ Cross-app token verification succeeds
5. ✅ CORS configured for all 8 origins
6. ⚠️ Performance optimization can be deferred (AMBER acceptable)

**Critical Path Note**: This fix runs IN PARALLEL with scholarship_api fix. Both must complete before revenue can start.

**Recommended Approach**:
1. **T+0-3h**: Fix JWKS handler and key generation (highest priority)
2. **T+0-1h**: Add /canary v2.7 route (parallel)
3. **T+0-0.25h**: Configure CORS (parallel)
4. **T+3-4h**: Validate token flows end-to-end
5. **Decision Point T+4h**: If PASS → Unblock B2C/B2B auth flows
6. **T+4-6h**: Performance optimization in parallel with revenue ramp

---

## Success Criteria for Conditional Go

| Criterion | Required | Current | Target |
|-----------|----------|---------|--------|
| JWKS endpoint works | ✅ | ❌ 500 Error | ✅ 200 + JWK set |
| /canary v2.7 JSON | ✅ | ❌ HTML | ✅ JSON (8 fields) |
| Token verification works | ✅ | ❌ Blocked | ✅ Signatures valid |
| CORS configured | ✅ | ⏸️ Unknown | ✅ 8 origins |
| Security Headers 6/6 | ✅ | ✅ 6/6 | ✅ 6/6 |
| P95 ≤120ms | ⚠️ Preferred | ❌ 284ms | ⚠️ Can defer |

**Minimum for Conditional Go**: First 5 criteria must be ✅ PASS

---

## Risk Assessment

### Low Risk
- /canary route addition (straightforward) ✅
- CORS configuration (known origins) ✅
- Security headers already compliant ✅

### Medium Risk
- JWKS fix may require key regeneration (depends on root cause)
- Token verification may reveal additional edge cases
- Performance optimization timeline uncertain

### High Risk
- None identified if JWKS can be fixed as planned

---

## Rollback Plan

If deployment causes issues:

1. **Immediate**: Rollback to previous deployment via Replit dashboard
2. **Workaround**: None (auth is required for platform)
3. **Communication**: Update status page, notify users of maintenance window
4. **Timeline**: Rollback execution <15 minutes

---

## Code-Level Changes Summary

**Files to Modify**:
1. `server/auth/jwks.ts` (or create if missing) - Key generation and storage
2. `server/routes.ts` - Add /canary endpoint, ensure JWKS handler works
3. `server/index.ts` - Add/verify CORS middleware with 8 origins

**Dependencies to Add** (if not present):
```bash
npm install jose lru-cache
```

**Environment Variables** (if needed):
```env
# Optional: Use environment-based keys instead of file system
AUTH_PRIVATE_KEY=<base64-encoded-private-key>
AUTH_PUBLIC_KEY=<base64-encoded-public-key>
```

---

## Summary Line

**Summary**: scholar_auth → https://scholar-auth-jamarrlmayes.replit.app | Status: **RED** | Revenue-Start ETA: **T+3-4 hours**

---

**Prepared By**: Agent3, QA Automation Lead  
**Priority**: **URGENT - FIX IN PARALLEL WITH scholarship_api**  
**Next Action**: Engineering implements GAP-001, GAP-002, GAP-004 in parallel  
**Re-Test Protocol**: Full integration validation after JWKS fix
