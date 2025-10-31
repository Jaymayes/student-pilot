# scholarship_api — Fix Plan and ETA

**App**: scholarship_api  
**Base URL**: https://scholarship-api-jamarrlmayes.replit.app  
**Report Date**: 2025-10-31 22:10 UTC  
**Current Status**: 🔴 RED (Not Ready) - **HIGHEST PRIORITY FIX**

---

## Critical Priority Notice

⚠️ **This is the highest-priority fix** - scholarship_api is the data layer for the entire platform. All revenue paths (B2C and B2B) depend on this API. Fix this FIRST before other apps.

---

## Prioritized Gap List

### P0 - Platform Blockers (MUST FIX IMMEDIATELY)

#### GAP-001: /canary Endpoint Returns 404
**Issue**: GET /canary returns 404 NOT_FOUND error instead of v2.6 JSON schema

**Root Cause**: /canary route not implemented or not deployed to public URL

**Fix Required**:

Add /canary route to `server/routes.ts`:

```typescript
// Add this route to server/routes.ts
router.get("/canary", (req, res) => {
  res.json({
    app: "scholarship_api",
    app_base_url: "https://scholarship-api-jamarrlmayes.replit.app",
    version: "v2.6",
    status: "ok",
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
    dependencies_ok: true,
    timestamp: new Date().toISOString(),
    revenue_role: "enables"
  });
});
```

**Steps**:
1. Add /canary route to Express router
2. Deploy to production
3. Verify: `curl https://scholarship-api-jamarrlmayes.replit.app/canary | jq .version`
4. Expected: `"v2.6"`

**Owner**: Engineering (scholarship_api maintainer)  
**ETA**: 1 hour (code + deploy + verify)

---

#### GAP-002: Missing Permissions-Policy Header
**Issue**: 5/6 security headers present (missing Permissions-Policy)

**Root Cause**: Header not configured in Express security middleware

**Fix Required**:

Add to security middleware:

```typescript
// In server/index.ts or security middleware
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment()");
  next();
});
```

**Steps**:
1. Add Permissions-Policy header (1 line of code)
2. Deploy to production
3. Verify: `curl -I https://scholarship-api-jamarrlmayes.replit.app | grep -i "permissions-policy"`

**Owner**: Engineering (scholarship_api maintainer)  
**ETA**: 30 minutes (can be done in parallel with GAP-001)

---

#### GAP-003: CORS Configuration Unvalidated
**Issue**: Unknown if CORS allows student_pilot and provider_register origins

**Root Cause**: Cannot test until core API endpoints are functional

**Fix Required**:

Ensure CORS middleware allows required origins:

```typescript
// In server/index.ts
import cors from 'cors';

const allowedOrigins = [
  'https://student-pilot-jamarrlmayes.replit.app',
  'https://provider-register-jamarrlmayes.replit.app',
  'https://scholarship-agent-jamarrlmayes.replit.app',
  'https://scholarship-sage-jamarrlmayes.replit.app',
  'https://scholar-auth-jamarrlmayes.replit.app',
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
1. Add/update CORS middleware with all 8 app origins
2. Deploy to production
3. Test from student_pilot: `fetch('https://scholarship-api.../scholarships')`
4. Verify no CORS errors in browser console

**Owner**: Engineering (scholarship_api maintainer)  
**ETA**: 30 minutes

---

#### GAP-004: Core API Endpoints Unvalidated
**Issue**: Cannot verify /scholarships, /search, or other core endpoints work

**Root Cause**: Validation deferred until /canary is fixed

**Fix Required** (validation only, may reveal additional gaps):

After GAP-001 fixed, test core endpoints:

```bash
# Test scholarship listing
curl "https://scholarship-api-jamarrlmayes.replit.app/scholarships?limit=10&sort=deadline"
# Expected: 200 + JSON array of scholarships

# Test individual scholarship
curl "https://scholarship-api-jamarrlmayes.replit.app/scholarships/{known-id}"
# Expected: 200 + JSON object

# Test search
curl "https://scholarship-api-jamarrlmayes.replit.app/search?q=STEM&limit=10"
# Expected: 200 + JSON search results
```

**Steps**:
1. Wait for GAP-001 fix
2. Execute API endpoint validation suite
3. Document any endpoints returning errors
4. Fix endpoint-specific issues if found

**Owner**: QA (Agent3) + Engineering if issues found  
**ETA**: 1 hour validation + 1-2 hours fixes if needed

---

### P1 - Pre-GO Polish

#### GAP-005: P95 Latency Exceeds SLO
**Issue**: P95 = 264ms (target ≤120ms), 2.2x over SLO

**Root Cause**: Unknown until profiling performed

**Potential Causes**:
- Database queries without indexes
- N+1 query pattern
- Missing caching layer
- Inefficient serialization

**Fix Required** (TBD after profiling):

Likely optimizations:
```typescript
// Add database indexes for common queries
CREATE INDEX idx_scholarships_deadline ON scholarships(deadline);
CREATE INDEX idx_scholarships_amount ON scholarships(amount);
CREATE INDEX idx_scholarships_tags ON scholarships USING GIN(tags);

// Add response caching
import memoizee from 'memoizee';

const getCachedScholarships = memoizee(
  async (filters) => {
    return await db.select().from(scholarships).where(...);
  },
  { maxAge: 300000, promise: true } // 5-minute cache
);

// Add ETag support for conditional requests
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

**Steps**:
1. Profile API under load
2. Identify slow queries
3. Add database indexes
4. Implement caching strategy
5. Re-measure P95

**Owner**: Engineering (scholarship_api + performance team)  
**ETA**: 2-4 hours

**Note**: Can proceed to Conditional Go with elevated latency if P0 fixes complete. Optimize in parallel with limited revenue ramp.

---

### P2 - Post-GO Improvements

#### GAP-006: Rate Limiting Not Verified
**Issue**: Unknown if rate limits are appropriate for UI operations (target ≥60 rpm)

**Fix Required** (validation + adjustment if needed):

```typescript
// Ensure rate limiting is configured appropriately
import rateLimit from 'express-rate-limit';

const scholarshipLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute minimum
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

app.use('/scholarships', scholarshipLimiter);
app.use('/search', scholarshipLimiter);
```

**Owner**: Engineering  
**ETA**: 1 hour

---

## Remediation Timeline

### Phase 1: Critical Path to API Functional (T+0 to T+2 hours)

| Time | Task | Owner | Blocker Level |
|------|------|-------|---------------|
| T+0 to T+1h | Add /canary route + deploy (GAP-001) | Engineering | P0 |
| T+0 to T+0.5h | Add Permissions-Policy header (GAP-002) | Engineering | P0 (parallel) |
| T+0.5h to T+1h | Configure CORS for 8 origins (GAP-003) | Engineering | P0 (parallel) |
| T+1h to T+2h | Validate core API endpoints (GAP-004) | QA + Engineering | P0 |

**Outcome**: If all validations pass → **API FUNCTIONAL** - Unblocks B2C and B2B revenue paths

---

### Phase 2: Performance Optimization (T+2 to T+6 hours)

| Time | Task | Owner | Blocker Level |
|------|------|-------|---------------|
| T+2h to T+3h | Profile API under load (GAP-005) | Engineering | P1 |
| T+3h to T+5h | Implement optimizations | Engineering | P1 |
| T+5h to T+6h | Re-measure P95 latency | QA | - |

**Outcome**: If P95 ≤120ms → **FULL GO** for scaled operations

---

### Phase 3: Polish (T+6 to T+12 hours)

| Time | Task | Owner | Blocker Level |
|------|------|-------|---------------|
| T+6h to T+8h | Validate and tune rate limits (GAP-006) | Engineering | P2 |
| T+8h to T+12h | Add observability and alerting | DevOps | P2 |

---

## Revenue-Start ETA

**Earliest Safe Revenue Start**: **T+2 hours** (AFTER scholarship_api fixes complete)

**This is the critical path blocker**. No revenue can be generated (B2C or B2B) until this API is functional.

**Requirements for Unblocking Revenue**:
1. ✅ /canary endpoint returns v2.6 JSON
2. ✅ Security headers 6/6 compliant
3. ✅ CORS configured for student_pilot and provider_register
4. ✅ /scholarships endpoint returns valid data
5. ✅ /search endpoint returns valid results
6. ⚠️ Performance optimization can be deferred (AMBER acceptable)

**Cascade Effect**:
- Once scholarship_api is functional → student_pilot can be validated
- Once student_pilot validated → B2C revenue can start
- Once provider_register validated → B2B revenue can start

**Recommended Approach**:
1. **T+0-1h**: Fix GAP-001, GAP-002, GAP-003 in parallel
2. **T+1-2h**: Validate core API endpoints (GAP-004)
3. **Decision Point T+2h**: If PASS → Unblock B2C/B2B testing
4. **T+2-6h**: Performance optimization in parallel with revenue validation

---

## Success Criteria for Conditional Go

| Criterion | Required | Current | Target |
|-----------|----------|---------|--------|
| /canary v2.6 JSON | ✅ | ❌ 404 | ✅ 200 + JSON |
| Security Headers 6/6 | ✅ | ❌ 5/6 | ✅ 6/6 |
| CORS Configured | ✅ | ⏸️ Unknown | ✅ 8 origins |
| /scholarships Works | ✅ | ⏸️ Untested | ✅ Returns data |
| /search Works | ✅ | ⏸️ Untested | ✅ Returns results |
| P95 ≤120ms | ⚠️ Preferred | ❌ 264ms | ⚠️ Can defer |

**Minimum for Conditional Go**: First 5 criteria must be ✅ PASS

---

## Risk Assessment

### Low Risk
- CORS configuration is straightforward ✅
- /canary route is simple to implement ✅
- Security header is 1-line fix ✅

### Medium Risk
- Core API endpoints may reveal additional issues
- Performance optimization timeline uncertain
- Database queries may need indexing

### High Risk
- None identified if fixes execute as planned

---

## Dependency Chain

**Blocks These Apps**:
- student_pilot (B2C) - Cannot search scholarships
- provider_register (B2B) - Cannot validate submissions
- auto_page_maker (SEO) - May need scholarship data for pages
- scholarship_agent (Marketing) - Reads scholarship data
- scholarship_sage (Analytics) - Reads scholarship data

**This is the single point of failure for the entire platform.**

---

## Summary Line

**Summary**: scholarship_api → https://scholarship-api-jamarrlmayes.replit.app | Status: **RED** | Revenue-Start ETA: **T+2 hours** (critical path)

---

**Prepared By**: Agent3, QA Automation Lead  
**Priority**: **URGENT - FIX FIRST**  
**Next Action**: Engineering implements GAP-001, GAP-002, GAP-003 immediately in parallel
