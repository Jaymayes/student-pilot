App: scholarship_api | APP_BASE_URL: https://scholarship-api-jamarrlmayes.replit.app

# ⚠️ WRONG WORKSPACE ALERT

**Status:** PLANNING ONLY - Code changes BLOCKED  
**Current Workspace:** student-pilot (https://student-pilot-jamarrlmayes.replit.app)  
**Expected Workspace:** scholarship-api (https://scholarship-api-jamarrlmayes.replit.app)  
**Report Date:** 2025-11-24  
**Agent:** Agent3

---

## Executive Summary

**CRITICAL BLOCKER:** Agent3 is currently in the **student_pilot** workspace, not the **scholarship_api** workspace. Code changes are BLOCKED to prevent corrupting the student_pilot codebase.

**This document provides PLANNING and REQUIREMENTS for scholarship_api** based on the MASTER PROMPT. To execute this plan, Agent3 must be placed in the correct scholarship_api workspace.

**Current Status:** CANNOT ASSESS (wrong workspace)  
**Revenue Readiness:** CANNOT DETERMINE (wrong workspace)  
**Recommendation:** Switch Agent3 to scholarship_api workspace to begin execution

---

## Section A: What scholarship_api Must Deliver (Requirements)

Based on the MASTER PROMPT, scholarship_api must provide:

### 1. Public Scholarships API (Unauthenticated)

**Endpoints:**
- `GET /api/v1/scholarships?search=&category=&state=&page=&per_page=`
- `GET /api/v1/scholarships/:id`

**Requirements:**
- No authentication required (public data for SEO)
- CORS allowlist: All 8 app base URLs (especially auto_page_maker and student_pilot)
- P95 latency ≤120ms under typical load
- Stable pagination with deterministic sorting
- Filters: search, category, state, page, per_page

**Consumers:**
- auto_page_maker (SEO landing pages)
- student_pilot (browse/search UI)

---

### 2. Credits Ledger API (JWT-Protected)

**Endpoints:**

**POST /api/v1/credits/credit** (Grant credits)
```json
Request:
{
  "user_id": "string",
  "amount": int (positive),
  "reason": "string",
  "source": "string",
  "reference_id": "string?" (optional)
}

Response (201 Created):
{
  "user_id": "string",
  "new_balance": int,
  "ledger_entry_id": "string",
  "request_id": "string"
}
```

**POST /api/v1/credits/debit** (Spend credits)
```json
Request:
{
  "user_id": "string",
  "amount": int (positive),
  "feature": "string",
  "reference_id": "string?" (optional)
}
Headers:
{
  "Authorization": "Bearer <JWT>",
  "Idempotency-Key": "string (UUID)"
}

Response (201 Created):
{
  "user_id": "string",
  "new_balance": int,
  "ledger_entry_id": "string",
  "request_id": "string"
}

Error (402/409 Insufficient Funds):
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Balance insufficient",
    "current_balance": int,
    "requested_amount": int,
    "request_id": "string"
  }
}
```

**GET /api/v1/credits/balance?user_id=<id>**
```json
Request Headers:
{
  "Authorization": "Bearer <JWT>"
}

Response (200 OK):
{
  "user_id": "string",
  "balance": int,
  "last_updated": "ISO8601 timestamp",
  "request_id": "string"
}
```

**Requirements:**
- JWT authentication via scholar_auth JWKS
- JWKS URL: `https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json`
- Issuer: `https://scholar-auth-jamarrlmayes.replit.app`
- Audience: `scholarship_api`
- Role enforcement:
  - `credit` endpoint: requires `role=admin` or `role=system` (M2M)
  - `debit` endpoint: requires `role=student` or service acting on behalf
  - `balance` endpoint: students read own; admin/system read any
- Idempotency: Support `Idempotency-Key` header (prevent double spend/grant)
- Atomicity: All mutations in single database transaction
- Reject negative balances: Return 402/409 on insufficient funds
- P95 latency: ≤120ms for balance, ≤200ms for mutations

**Consumers:**
- scholarship_sage: Calls debit for AI features
- student_pilot: Calls debit (user actions) and balance (UI display)
- provider_register: May call credit for promotional grants

---

### 3. Platform Operability Endpoints

**GET /healthz**
```json
{
  "status": "ok",
  "db": "ok",
  "uptime_s": int,
  "version": "string",
  "request_id": "string"
}
```

**GET /version**
```json
{
  "version": "string",
  "git_sha": "string",
  "build_time": "ISO8601",
  "request_id": "string"
}
```

**GET /metrics**
- Prometheus exposition format
- Counters: `api_requests_total{route, method, status}`
- Histograms: `api_request_duration_seconds{route, method}`
- Gauges: `credits_balance_total`, `active_users`

---

## Section B: Integration Matrix

### Upstream Dependencies (scholarship_api CONSUMES from these)

| Service | Base URL | Integration Point | Status |
|---------|----------|-------------------|--------|
| **scholar_auth** | https://scholar-auth-jamarrlmayes.replit.app | JWKS endpoint for JWT validation | CANNOT VERIFY (wrong workspace) |
| **PostgreSQL** | (Neon or local) | Credits ledger + scholarships data | CANNOT VERIFY (wrong workspace) |
| **Redis** (optional) | N/A | Rate limiting + idempotency cache | CANNOT VERIFY (wrong workspace) |

### Downstream Consumers (scholarship_api PROVIDES to these)

| Service | Base URL | Consumes | Status |
|---------|----------|----------|--------|
| **auto_page_maker** | https://auto-page-maker-jamarrlmayes.replit.app | GET /api/v1/scholarships (public) | CANNOT VERIFY (wrong workspace) |
| **student_pilot** | https://student-pilot-jamarrlmayes.replit.app | GET /scholarships, POST /credits/debit, GET /balance | CANNOT VERIFY (wrong workspace) |
| **scholarship_sage** | https://scholarship-sage-jamarrlmayes.replit.app | POST /credits/debit, GET /balance | CANNOT VERIFY (wrong workspace) |
| **provider_register** | https://provider-register-jamarrlmayes.replit.app | POST /credits/credit (promotional grants) | CANNOT VERIFY (wrong workspace) |
| **auto_com_center** | https://auto-com-center-jamarrlmayes.replit.app | Webhook/events for credit mutations (optional) | CANNOT VERIFY (wrong workspace) |

---

## Section C: Revenue Readiness

**Can we start generating revenue today?**  
**CANNOT DETERMINE** - Agent3 is in the wrong workspace.

**Blockers:**
1. ❌ Agent3 not in scholarship_api workspace
2. ❌ Cannot assess current code state
3. ❌ Cannot verify endpoints exist
4. ❌ Cannot test JWT validation
5. ❌ Cannot measure P95 latency
6. ❌ Cannot verify CORS configuration

**ETA to Revenue Readiness:**  
**UNKNOWN** until Agent3 is placed in correct workspace.

**Estimated Implementation Time (once in correct workspace):**
- Workspace verification: 10 min
- Health/version/metrics endpoints: 30-45 min
- Public scholarships API: 60-90 min (depends on existing schema)
- Credits ledger (credit/debit/balance): 90-120 min
- JWT integration with scholar_auth: 45-60 min
- Database migrations + indices: 45-90 min
- Rate limiting + idempotency: 30-60 min
- End-to-end testing: 45-90 min
- Deliverables + deployment: 30-60 min

**Total: 6.5 - 10.5 hours** (assuming database and scholar_auth JWKS are operational)

---

## Section D: Risks, Mitigations, and Rollback Plan

### Top 3 Risks

**Risk 1: Database Schema Not Ready**
- **Severity:** HIGH
- **Impact:** Cannot implement credits ledger or scholarships API
- **Mitigation:** Check for existing tables (`credits_ledger`, `credit_balances`, `scholarships`, `users`)
- **Rollback:** Use in-memory ledger for testing; document migration plan

**Risk 2: scholar_auth JWKS Not Available**
- **Severity:** HIGH
- **Impact:** Cannot validate JWTs; all protected endpoints fail 401
- **Mitigation:** Test JWKS endpoint accessibility; cache keys with TTL
- **Rollback:** Stub JWT validation for internal testing only; document blocker

**Risk 3: Performance Targets Not Met**
- **Severity:** MEDIUM
- **Impact:** P95 > 120ms; may degrade user experience
- **Mitigation:** Add database indices; implement response caching; optimize queries
- **Rollback:** Document current P95; create performance improvement plan

### Rollback Plan

If scholarship_api deployment fails:
1. Revert to previous stable version (if exists)
2. Disable new endpoints via feature flags
3. Return 503 Service Unavailable with clear error messages
4. Alert all downstream consumers (student_pilot, scholarship_sage, auto_page_maker)
5. Restore database from last known good backup

---

## Third-Party Systems Required

### Critical (Must Have)

1. **PostgreSQL Database**
   - Connection string: `DATABASE_URL`
   - Required tables: `users`, `credits_ledger`, `credit_balances`, `scholarships`
   - Migrations must be applied and indices created

2. **scholar_auth (JWT/OIDC Provider)**
   - Issuer: `https://scholar-auth-jamarrlmayes.replit.app`
   - JWKS endpoint: `https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json`
   - Must issue JWTs with `aud=scholarship_api` and appropriate roles/scopes

3. **Monitoring Stack**
   - Sentry DSN or equivalent for error tracking
   - Prometheus scraper for /metrics endpoint
   - Request ID correlation across logs

### Recommended (Should Have)

4. **Redis (or equivalent)**
   - Rate limiting store
   - Idempotency key cache
   - Response caching for public endpoints
   - **Fallback:** In-memory implementation with documented limitations

5. **Load Balancer / Reverse Proxy**
   - HTTPS termination
   - CORS preflight handling
   - DDoS protection
   - **Fallback:** Application-level CORS and rate limiting

---

## Next Steps to Unblock

### Immediate Action Required

**Step 1: Switch Agent3 to scholarship_api Workspace**
- Open the scholarship_api Replit project
- Verify APP_BASE_URL: `https://scholarship-api-jamarrlmayes.replit.app`
- Confirm no React/Vite frontend (backend API only)

**Step 2: Run Workspace Verification Checklist**
```bash
# Verify correct workspace
curl -sS https://scholarship-api-jamarrlmayes.replit.app/healthz

# Expected: 200 OK or 404 (if not implemented yet)
# Should NOT redirect to student_pilot

# Check package.json
cat package.json | grep "name"
# Expected: "scholarship-api" or similar (NOT "rest-express" with React deps)

# Check for API-only structure
ls -la
# Expected: server/ directory, NO client/ directory
```

**Step 3: Begin Execution Plan**
Once workspace is verified, Agent3 will:
1. Assess current state (what exists vs. what's needed)
2. Implement missing endpoints per MASTER PROMPT
3. Test all integration contracts
4. Produce evidence pack with curl outputs
5. Deliver final GO/NO-GO verdict

---

## Summary

**Current State:** BLOCKED - Wrong workspace  
**Required Action:** Switch Agent3 to scholarship_api workspace  
**Implementation ETA:** 6.5 - 10.5 hours (once in correct workspace)  
**Revenue Readiness:** CANNOT DETERMINE (wrong workspace)  

**This document serves as the REQUIREMENTS SPECIFICATION for scholarship_api.** Code execution will begin once Agent3 is placed in the correct workspace.

---

**Prepared By:** Agent3 (currently in student_pilot workspace)  
**Workspace Mismatch Alert:** ⚠️ ACTIVE  
**Code Changes:** ❌ BLOCKED  
**Planning Status:** ✅ COMPLETE
