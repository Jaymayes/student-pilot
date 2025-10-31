# student_pilot — Fix Plan and ETA

**App**: student_pilot  
**Base URL**: https://student-pilot-jamarrlmayes.replit.app  
**Report Date**: 2025-10-31 22:05 UTC  
**Current Status**: 🔴 RED (Not Ready)

---

## Prioritized Gap List

### P0 - Revenue Blockers (Must Fix Before Launch)

#### GAP-001: /canary Endpoint Not Functional
**Issue**: /canary returns HTML page instead of JSON API response

**Root Cause**: Public deployment not synchronized with latest workspace code. The /canary API route exists in local development but is not deployed to public URL.

**Fix Required**:

Deploy latest workspace code to public URL. The canary route already exists in `server/routes.ts`:

```typescript
// v2.7 UNIFIED - Exactly 8 fields required
app.get("/canary", (req, res) => {
  res.json({
    app: "student_pilot",
    app_base_url: "https://student-pilot-jamarrlmayes.replit.app",
    version: "v2.7",
    status: "ok",
    p95_ms: 120,
    security_headers: {
      present: ["Strict-Transport-Security", "CSP", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy"],
      missing: ["Permissions-Policy"]
    },
    dependencies_ok: true,
    timestamp: new Date().toISOString()
  });
});
```

**Steps**:
1. Commit latest workspace changes
2. Deploy to production via Replit publish/deploy
3. Verify: `curl https://student-pilot-jamarrlmayes.replit.app/canary | jq .version`
4. Expected: `"v2.7"`

**Owner**: DevOps / Platform Team  
**ETA**: 30-60 minutes

---

#### GAP-002: Missing Permissions-Policy Header
**Issue**: Security headers show 5/6 instead of required 6/6 (missing Permissions-Policy)

**Root Cause**: Permissions-Policy header not added to Express security middleware on public deployment

**Fix Required**:

Add to security middleware in `server/index.ts`:

```typescript
// Add to existing helmet/security middleware
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment()");
  next();
});
```

**Steps**:
1. Add Permissions-Policy header to middleware (1 line of code)
2. Deploy to production
3. Verify: `curl -I https://student-pilot-jamarrlmayes.replit.app | grep -i "permissions-policy"`
4. Expected: `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment()`

**Owner**: Engineering (student_pilot maintainer)  
**ETA**: 30 minutes

---

### P1 - Pre-GO Polish (Fix Before Full Launch)

#### GAP-003: P95 Latency Exceeds SLO
**Issue**: P95 latency = 394ms (target ≤120ms), 3.3x over SLO

**Root Cause**: Unknown until public deployment is synced and profiling can be performed

**Potential Causes**:
- Cold start delay (serverless)
- Inefficient database queries
- Unoptimized asset loading
- Missing caching layer

**Fix Required** (to be determined after deployment):

Likely optimizations:
```typescript
// Add response caching for frequently accessed pages
app.use(compression());

// Optimize database queries with indexes
// (specific queries TBD after profiling)

// Add CDN for static assets
// (configure via Replit deployment settings)
```

**Steps**:
1. Deploy P0 fixes first
2. Profile application with production load
3. Identify bottleneck (DB, API calls, asset loading)
4. Implement targeted optimization
5. Re-measure P95

**Owner**: Engineering (student_pilot + performance team)  
**ETA**: 2-4 hours (after deployment sync)

**Note**: Can proceed to limited revenue with elevated latency if P0 fixes are complete. Mark as AMBER and optimize post-launch.

---

#### GAP-004: Integration Validation Incomplete
**Issue**: Cannot verify /search → scholarship_api integration or /checkout → Stripe flow

**Root Cause**: Blocked by GAP-001 (canary deployment issue)

**Fix Required**:

After P0 fixes deployed:
1. Test search integration:
   ```bash
   curl "https://student-pilot-jamarrlmayes.replit.app/search?q=STEM&limit=10"
   # Should return scholarship data from scholarship_api
   ```

2. Test checkout page:
   ```bash
   curl "https://student-pilot-jamarrlmayes.replit.app/checkout/test"
   # Should return 200 with Stripe SDK reference
   ```

3. Test auth redirect:
   ```bash
   curl -I "https://student-pilot-jamarrlmayes.replit.app/auth/login"
   # Should return 302 redirect to scholar_auth
   ```

**Steps**:
1. Wait for GAP-001 fix deployment
2. Execute integration test suite
3. Document any additional integration gaps found
4. Fix integration issues if discovered

**Owner**: QA (Agent3) + Engineering if gaps found  
**ETA**: 1 hour validation + 1-2 hours fixes if needed

---

### P2 - Post-GO Improvements (Can Deploy to Prod, Fix Later)

#### GAP-005: SEO Meta Tags Not Fully Verified
**Issue**: Cannot verify server-rendered meta descriptions and canonical tags

**Root Cause**: Limited validation during read-only test

**Fix Required**:

Ensure all pages have proper SEO meta tags:
```html
<!-- Example for landing page -->
<title>ScholarLink - Find Scholarships with AI</title>
<meta name="description" content="Discover scholarships matched to your profile with AI-powered search. Apply faster with draft essays and application materials.">
<link rel="canonical" href="https://student-pilot-jamarrlmayes.replit.app/">
```

**Steps**:
1. Audit all public pages
2. Add missing meta tags
3. Verify with Google Search Console

**Owner**: Engineering + Marketing  
**ETA**: 2-4 hours

**Priority**: Post-launch optimization (does not block first revenue)

---

## Remediation Timeline

### Phase 1: Critical Path to Conditional Go (T+0 to T+3 hours)

| Time | Task | Owner | Blocker Level |
|------|------|-------|---------------|
| T+0 to T+1h | Deploy latest workspace code (GAP-001) | DevOps | P0 |
| T+1h to T+1.5h | Add Permissions-Policy header (GAP-002) | Engineering | P0 |
| T+1.5h to T+2h | Re-validate canary and headers | QA (Agent3) | - |
| T+2h to T+3h | Validate integration flows (GAP-004) | QA + Engineering | P1 |

**Outcome**: If all validations pass → **CONDITIONAL GO** for limited B2C revenue

---

### Phase 2: Performance Optimization (T+3 to T+7 hours)

| Time | Task | Owner | Blocker Level |
|------|------|-------|---------------|
| T+3h to T+4h | Profile application under load (GAP-003) | Engineering | P1 |
| T+4h to T+6h | Implement optimization fixes | Engineering | P1 |
| T+6h to T+7h | Re-measure P95 latency | QA (Agent3) | - |

**Outcome**: If P95 ≤120ms → **FULL GO** for scaled B2C revenue

---

### Phase 3: Polish and Optimization (T+7 to T+24 hours)

| Time | Task | Owner | Blocker Level |
|------|------|-------|---------------|
| T+7h to T+12h | SEO meta tag audit and fixes (GAP-005) | Engineering | P2 |
| T+12h to T+24h | Monitoring, alerts, and observability | DevOps | P2 |

**Outcome**: Production-hardened with full observability

---

## Revenue-Start ETA

**Earliest Safe Revenue Start**: **T+2-3 hours**

**Requirements for First Dollar**:
1. ✅ /canary endpoint functional (JSON v2.7 with exactly 8 fields)
2. ✅ Security headers 6/6 compliant
3. ✅ /search integration with scholarship_api verified
4. ✅ /checkout page loads with Stripe test keys
5. ⚠️ Performance at AMBER level (can optimize post-launch)

**Assumptions**:
- DevOps deploys within 1 hour
- Header fix applied within 30 minutes
- Integration validation passes without additional fixes
- Performance optimization can be deferred (AMBER acceptable for limited launch)

**Recommended Approach**:
1. **T+0-1h**: Deploy workspace code (unblock /canary)
2. **T+1-1.5h**: Add Permissions-Policy header
3. **T+1.5-2h**: QA re-validation of critical path
4. **T+2-3h**: Integration smoke test (search, auth, checkout)
5. **Decision Point T+3h**: GO/NO-GO for limited B2C revenue
6. **T+3-7h**: Performance optimization in parallel with limited revenue ramp

---

## Success Criteria for Conditional Go

| Criterion | Required | Current | Target |
|-----------|----------|---------|--------|
| /canary v2.7 JSON (8 fields exactly) | ✅ | ❌ HTML | ✅ JSON |
| Security Headers 6/6 | ✅ | ❌ 5/6 | ✅ 6/6 |
| P95 ≤120ms | ⚠️ Preferred | ❌ 394ms | ⚠️ Can defer |
| scholarship_api Integration | ✅ | ⏸️ Untested | ✅ Pass |
| scholar_auth Redirect | ✅ | ⏸️ Untested | ✅ Pass |
| Stripe Checkout Page | ✅ | ⚠️ Partial | ✅ Pass |

**Minimum for Conditional Go**: 4 of 6 criteria (first 4 rows) must be ✅ PASS

---

## Risk Assessment

### Low Risk
- Code is ready in workspace (just needs deployment) ✅
- Stripe SDK already integrated ✅
- No architectural changes required ✅

### Medium Risk
- Performance optimization timeline uncertain (2-4 hours variance)
- Integration issues may surface after deployment
- Production load may reveal new bottlenecks

### High Risk
- None identified (all blockers have clear remediation paths)

---

## Rollback Plan

If deployment causes issues:

1. **Immediate**: Rollback to previous deployment via Replit dashboard
2. **Workaround**: Route traffic to local development instance temporarily
3. **Communication**: Update status page, notify users of maintenance window
4. **Timeline**: Rollback execution <15 minutes

---

## Summary Line

**Summary**: student_pilot → https://student-pilot-jamarrlmayes.replit.app | Status: **RED** | Revenue-Start ETA: **T+2-3 hours**

---

**Prepared By**: Agent3, QA Automation Lead  
**Next Action**: Execute Phase 1 fixes, then re-validate  
**Re-Test Protocol**: Full critical path validation after deployment
