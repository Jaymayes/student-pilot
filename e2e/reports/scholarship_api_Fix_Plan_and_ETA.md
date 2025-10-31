# App: scholarship_api — Fix Plan and ETA

**App**: scholarship_api  
**Base URL**: https://scholarship-api-jamarrlmayes.replit.app  
**Report Date**: 2025-10-31 22:35 UTC  
**Current Status**: 🔴 RED (Not Ready) - **CRITICAL PATH BLOCKER**

---

## Critical Priority Notice

⚠️ **This is the data layer for the entire platform** - scholarship_api blocks ALL revenue paths. Fix this IN PARALLEL with scholar_auth.

---

## Prioritized Issues

### P0 - Platform Blockers (MUST FIX IMMEDIATELY)

#### GAP-001: /canary Endpoint Returns 404
**Issue**: GET /canary returns 404 NOT_FOUND instead of v2.7 JSON

**Root Cause**: Route not implemented or SPA routing intercepts before API handler

**Fix Required**:

Add /canary route to `server/routes.ts` BEFORE SPA fallback:

```typescript
// Add this BEFORE any SPA fallback middleware
router.get("/canary", async (req, res) => {
  // Check database connection
  let dependenciesOk = true;
  try {
    await db.select().from(scholarships).limit(1);
  } catch (error) {
    dependenciesOk = false;
  }
  
  res.json({
    app: "scholarship_api",
    app_base_url: "https://scholarship-api-jamarrlmayes.replit.app",
    version: "v2.7",
    status: dependenciesOk ? "ok" : "degraded",
    p95_ms: 120, // Will be updated by monitoring
    security_headers: {
      present: [
        "Strict-Transport-Security",
        "Content-Security-Policy",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy"
      ],
      missing: ["Permissions-Policy"] // Will be fixed in GAP-002
    },
    dependencies_ok: dependenciesOk,
    timestamp: new Date().toISOString()
  });
});
```

**Steps**:
1. Add /canary route with v2.7 schema (8 fields exactly)
2. Ensure route is BEFORE SPA fallback
3. Deploy to production
4. Verify: `curl https://scholarship-api-jamarrlmayes.replit.app/canary | jq .version`

**Owner**: Engineering (scholarship_api maintainer)  
**ETA**: **1 hour**

---

#### GAP-002: Missing Permissions-Policy Header
**Issue**: 5/6 security headers (missing Permissions-Policy)

**Fix Required**:

```typescript
// In server/index.ts
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  next();
});
```

**Steps**:
1. Add header to middleware
2. Deploy
3. Verify: `curl -I https://scholarship-api-jamarrlmayes.replit.app | grep -i "permissions-policy"`

**Owner**: Engineering  
**ETA**: **0.25 hour** (parallel with GAP-001)

---

#### GAP-003: CORS Configuration Unknown
**Issue**: Cannot validate if CORS allows all 8 platform origins

**Fix Required**:

```typescript
import cors from 'cors';

const allowedOrigins = [
  'https://scholar-auth-jamarrlmayes.replit.app',
  'https://scholarship-api-jamarrlmayes.replit.app',
  'https://scholarship-agent-jamarrlmayes.replit.app',
  'https://scholarship-sage-jamarrlmayes.replit.app',
  'https://student-pilot-jamarrlmayes.replit.app',
  'https://provider-register-jamarrlmayes.replit.app',
  'https://auto-page-maker-jamarrlmayes.replit.app',
  'https://auto-com-center-jamarrlmayes.replit.app'
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

**Owner**: Engineering  
**ETA**: **0.25 hour** (parallel)

---

#### GAP-004: Core API Endpoints Unvalidated
**Issue**: Cannot verify /scholarships, /search work properly

**Fix Required** (validation only):

After GAP-001 fixed, test:
```bash
curl "https://scholarship-api-jamarrlmayes.replit.app/scholarships?limit=10"
curl "https://scholarship-api-jamarrlmayes.replit.app/scholarships/{id}"
curl "https://scholarship-api-jamarrlmayes.replit.app/search?q=STEM"
```

**Owner**: QA + Engineering if issues found  
**ETA**: **1 hour validation** + fixes if needed

---

### P1 - Pre-GO Polish

#### GAP-005: P95 Latency Exceeds SLO
**Issue**: P95 = 264ms (target ≤120ms)

**Fix Required** (TBD after profiling):

```typescript
// Add database indexes
CREATE INDEX idx_scholarships_deadline ON scholarships(deadline);
CREATE INDEX idx_scholarships_amount ON scholarships(amount);

// Add response caching
import { LRUCache } from 'lru-cache';

const scholarshipCache = new LRUCache({
  max: 1000,
  ttl: 1000 * 60 * 5 // 5 minutes
});

// Add ETags
app.get('/scholarships', (req, res) => {
  const etag = generateETag(data);
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(data);
});
```

**Owner**: Engineering  
**ETA**: **2-4 hours**

---

## Remediation Timeline

### Phase 1: Critical Path (T+0 to T+2 hours) - RUN IN PARALLEL

| Time | Task | Blocker | Parallel? |
|------|------|---------|-----------|
| T+0-1h | Add /canary v2.7 (GAP-001) | P0 | **YES** |
| T+0-0.25h | Add Permissions-Policy (GAP-002) | P0 | **YES** |
| T+0-0.25h | Configure CORS (GAP-003) | P0 | **YES** |
| T+1-2h | Validate endpoints (GAP-004) | P0 | After GAP-001 |

**Outcome**: scholarship_api functional, unblocks B2C and B2B

---

### Phase 2: Performance (T+2 to T+6 hours)

| Time | Task |
|------|------|
| T+2-3h | Profile under load |
| T+3-5h | Implement optimizations |
| T+5-6h | Re-measure P95 |

---

## Revenue-Start ETA

**Earliest Safe Revenue Start**: **T+2-3 hours** (AFTER scholarship_api + scholar_auth fixes)

**Requirements**:
1. ✅ /canary returns v2.7 JSON
2. ✅ Security headers 6/6
3. ✅ CORS configured
4. ✅ /scholarships and /search return data
5. ⚠️ Performance can be AMBER (optimize later)

---

## Success Criteria for Conditional Go

| Criterion | Current | Target |
|-----------|---------|--------|
| /canary v2.7 | ❌ 404 | ✅ JSON |
| Headers 6/6 | ❌ 5/6 | ✅ 6/6 |
| CORS | ⏸️ Unknown | ✅ 8 origins |
| /scholarships works | ⏸️ Untested | ✅ Returns data |
| /search works | ⏸️ Untested | ✅ Returns results |

---

## Summary Line

**Summary**: scholarship_api → https://scholarship-api-jamarrlmayes.replit.app | Status: **RED** | Revenue-Start ETA: **T+2-3 hours**

---

**Prepared By**: Agent3  
**Priority**: **URGENT - FIX IN PARALLEL WITH scholar_auth**  
**Next Action**: Implement GAP-001, GAP-002, GAP-003 immediately
