# student_pilot Integration Requirements & Timeline
**APP NAME:** student_pilot | **APP_BASE_URL:** https://student-pilot-jamarrlmayes.replit.app

**Document Version:** 1.0  
**Last Updated:** Nov 14, 2025 18:00 UTC  
**Owner:** Agent3 (Program Integrator)

---

## Executive Summary

**Current Status:** 🟡 INTEGRATION-READY (awaiting upstream services)

student_pilot has completed all in-scope Section D objectives and is prepared to snap into the ecosystem once scholar_auth, scholarship_api, and auto_com_center deploy their respective Gate 0/1 features.

**Go-Live Date:** **Nov 20, 2025, 17:00 MST** (conditional on upstream dependencies)  
**ARR Ignition Date:** **Dec 1, 2025** (B2C credit sales via first_document_upload activation)

---

## Completed student_pilot Features (Integration-Ready)

### ✅ 1. GA4 Analytics Instrumentation
**Status:** COMPLETE with network resilience

| Event | Trigger | Metadata | Status |
|-------|---------|----------|--------|
| `first_document_upload` | Document creation success | documentType, documentId, fileSize | ✅ LIVE |
| `application_submitted` | Status change to 'submitted' | applicationId, scholarshipId, scholarshipTitle | ✅ LIVE |
| `application_status_viewed` | Application card click | applicationId, status, scholarshipId | ✅ LIVE |

**Network Resilience:**
- 3 retry attempts with exponential backoff (1s, 2s, 4s)
- localStorage queue for failed events
- Non-blocking (analytics failures don't break UX)

**Evidence:** Code in `client/src/hooks/useTtvTracking.ts` and `client/src/pages/applications.tsx`

---

### ✅ 2. Environment Configuration (Gate 2 Standards)
**Status:** COMPLETE

- Zero hardcoded URLs (grep verified: 0 matches)
- Environment-aware validation (development vs production)
- Fail-fast validation for required microservice URLs in staging/prod
- Graceful degradation with structured operator alerts

**Evidence:** `server/environment.ts`, `server/serviceConfig.ts`, `CONFIG_LINTER_PROOF.md`

---

### ✅ 3. Current Auth Flow (Replit OIDC)
**Status:** OPERATIONAL (fallback mode)

- Replit OIDC authentication working
- Session management (PostgreSQL-backed)
- 401/403 detection with logout flow

**Ready for Migration:** Feature-flag infrastructure prepared for RS256 JWT (see Task 3 below)

---

## Critical Dependencies (BLOCKING Go-Live)

### 🔴 1. scholar_auth (Gate 0 Security)
**Status:** NOT DEPLOYED  
**Owner:** scholar_auth DRI  
**Required By:** Nov 18, 2025, 12:00 MST (48h before student_pilot Go-Live)

#### Required Features:
- **RS256 JWT Issuance** with finalized claims:
  ```json
  {
    "sub": "user-uuid",
    "email": "user@example.com",
    "role": "student",
    "scopes": ["scholarships:read", "applications:write"],
    "iss": "https://scholar-auth-jamarrlmayes.replit.app",
    "aud": "scholar-platform",
    "iat": 1700000000,
    "exp": 1700000300
  }
  ```
- **JWKS Endpoint:** `/.well-known/jwks.json` (live and accessible)
- **OAuth2 Endpoints:**
  - `/oauth/token` (password grant for user login)
  - Refresh token rotation
- **CORS:** Allow `https://student-pilot-jamarrlmayes.replit.app` (exact origin, no wildcards)
- **MFA:** Email OTP for initial rollout (SMS via Twilio as stretch)

#### Integration Contract:
```typescript
// student_pilot will:
1. Redirect to scholar_auth for login/registration
2. Receive authorization code
3. Exchange code for access + refresh tokens
4. Store tokens securely (httpOnly cookie or secure localStorage)
5. Attach Authorization: Bearer <token> to all API calls
6. Refresh tokens before expiry (5min TTL)
7. Handle 401 with token refresh attempt → logout on failure
```

#### Acceptance Criteria:
- [ ] JWKS endpoint returns valid RS256 public key
- [ ] JWT signature validates against JWKS
- [ ] student_pilot can complete full auth flow (login → token → API call)
- [ ] CORS preflight succeeds from student_pilot origin

---

### 🔴 2. scholarship_api (Gate 0/1 Security + Integration)
**Status:** NOT DEPLOYED  
**Owner:** scholarship_api DRI  
**Required By:** Nov 18, 2025, 17:00 MST (concurrent with scholar_auth)

#### Required Features:
- **JWT Validation Middleware:**
  - Signature verification using scholar_auth JWKS
  - Claims validation (exp, nbf, iss, aud)
  - RBAC enforcement (role/scopes)
- **CORS:** Allow `https://student-pilot-jamarrlmayes.replit.app`
- **OpenAPI Spec:** `/docs` endpoint (for developer reference)
- **Webhooks to auto_com_center:**
  - Trigger on application submission
  - Trigger on status changes
- **Health Endpoints:** `/healthz`, `/readyz`

#### API Endpoints Required by student_pilot:
```
GET  /api/scholarships         - List scholarships (public or student-scoped)
GET  /api/scholarships/:id     - Get scholarship details
POST /api/applications         - Create application
GET  /api/applications         - List user's applications
PUT  /api/applications/:id     - Update application (status, progress, notes)
GET  /api/profile              - Get student profile
PUT  /api/profile              - Update student profile
POST /api/documents            - Create document record (after GCS upload)
GET  /api/documents            - List user's documents
DELETE /api/documents/:id      - Delete document
```

#### Integration Contract:
```typescript
// All requests from student_pilot will include:
Headers: {
  'Authorization': 'Bearer <RS256_JWT>',
  'Content-Type': 'application/json',
  'Origin': 'https://student-pilot-jamarrlmayes.replit.app'
}

// scholarship_api will:
1. Validate JWT signature + claims
2. Extract user ID from token.sub
3. Enforce RBAC (students can only access own data)
4. Return 401 for invalid/expired tokens
5. Return 403 for insufficient permissions
6. Return standardized error responses:
   { "error": "message", "code": "ERROR_CODE" }
```

#### Acceptance Criteria:
- [ ] JWT middleware blocks requests without valid tokens
- [ ] RBAC blocks students from accessing other users' data
- [ ] CORS preflight succeeds from student_pilot
- [ ] All required endpoints return expected data
- [ ] Webhooks trigger on application events

---

### 🔴 3. auto_com_center (Gate 1 Notifications)
**Status:** NOT DEPLOYED  
**Owner:** auto_com_center DRI  
**Required By:** Nov 19, 2025, 12:00 MST (24h before ARR Ignition)

#### Required Features:
- **SendGrid Integration:** Email delivery (verified domain)
- **Twilio SMS Integration:** (optional for initial rollout)
- **S2S Auth:** OAuth2 client_credentials enforcement
- **Templates:**
  - Registration welcome email
  - Application submitted confirmation
  - Status update notifications
  - Deadline reminders
  - MFA OTP emails

#### Integration Flow:
```
student_pilot → scholarship_api → auto_com_center
                                      ↓
                                 SendGrid/Twilio
                                      ↓
                                  User's inbox/phone
```

student_pilot does NOT directly call auto_com_center (all notifications routed through scholarship_api webhooks).

#### Acceptance Criteria:
- [ ] Canary email delivers to controlled inbox within 30s
- [ ] Bounce/complaint webhooks log failures
- [ ] Templates use env-driven URLs (no hardcoded links)
- [ ] S2S auth blocks unauthorized webhook calls

---

## Third-Party Prerequisites

### ✅ 1. Google Analytics (GA4)
**Status:** READY  
**Environment Variable:** `GA_MEASUREMENT_ID` (already configured)  
**Evidence:** Events firing to `/api/analytics/ttv-event` backend endpoint

### ✅ 2. PostgreSQL Database
**Status:** OPERATIONAL  
**Provider:** Neon (Replit-integrated)  
**Evidence:** `DATABASE_URL` secret configured, app running

### ✅ 3. Google Cloud Storage (Object Storage)
**Status:** OPERATIONAL  
**Provider:** Replit Object Storage sidecar  
**Evidence:** Document uploads working via presigned URLs

### 🟡 4. SendGrid (Email Delivery)
**Status:** PENDING auto_com_center deployment  
**Required:** Verified domain + API key  
**Fallback:** Postmark with Sender Signature if DNS >24h

### 🟡 5. Twilio (SMS - Optional)
**Status:** PENDING auto_com_center deployment  
**Required:** Account SID, Auth Token, Phone Number  
**Fallback:** Email-only notifications for initial rollout

---

## Realistic Timeline & Milestones

### Phase 1: Upstream Service Deployment (Nov 15-18)
**Owner:** scholar_auth, scholarship_api, auto_com_center DRIs

| Service | Gate 0 Deadline | Gate 1 Deadline | Blocker Risk |
|---------|-----------------|-----------------|--------------|
| scholar_auth | Nov 18, 12:00 MST | N/A | 🔴 HIGH (no RS256 yet) |
| scholarship_api | Nov 18, 17:00 MST | Nov 19, 12:00 MST | 🔴 HIGH (no JWT middleware) |
| auto_com_center | N/A | Nov 19, 12:00 MST | 🟡 MEDIUM (ESP DNS may delay) |

### Phase 2: Integration Testing (Nov 18-19)
**Owner:** Agent3 (student_pilot)

**Tasks:**
1. Update auth flow to use scholar_auth RS256 tokens (4 hours)
2. Test E2E student journey with real JWT validation (2 hours)
3. Verify CORS from student_pilot to scholarship_api (1 hour)
4. Validate notification delivery (canary test) (1 hour)
5. Load testing (optional, k6 smoke) (2 hours)

**Evidence Required:**
- Screenshot: Successful login via scholar_auth
- Screenshot: API call with valid JWT accepted
- Screenshot: Application submission triggers email/SMS
- GA4 DebugView: All three events firing with correct metadata

### Phase 3: Go-Live (Nov 20, 17:00 MST)
**Owner:** CEO (final approval)

**Go/No-Go Criteria:**
- [ ] scholar_auth RS256 tokens validated by scholarship_api
- [ ] student_pilot E2E journey passes (register → apply → notify)
- [ ] GA4 events visible in DebugView
- [ ] Zero P0 security issues (CORS, JWT, RBAC)
- [ ] Notifications deliver to controlled inbox/phone

**Rollout Plan:**
1. Open student_pilot to internal testers (10 users)
2. Monitor for 24h (error rates, activation metrics)
3. If stable, open to controlled beta (100 users)
4. Monitor activation funnel: signup → profile → first_document_upload
5. If activation ≥20%, expand to public launch

### Phase 4: ARR Ignition (Dec 1, 2025)
**Owner:** Finance + Product

**B2C Revenue Path:**
- Stripe Checkout integration (credit purchase flow)
- Pricing: 4× AI cost markup for essay assistance
- Target: $10K MRR by Dec 31, 2025

**B2B Revenue Path (Future):**
- Provider fees (3% of transactions)
- Target: Dec 8, 2025 (1 week after B2C launch)

---

## student_pilot Pending Tasks (Blocked Until Upstream Ready)

### Task 3: Auth Flow Enhancement (Feature-Flag RS256 Support)
**Estimated Time:** 4 hours  
**Dependencies:** scholar_auth JWKS live

**Implementation Plan:**
1. Add feature flag: `FEATURE_AUTH_PROVIDER` (env variable)
   - `replit`: Current Replit OIDC (default)
   - `scholar_auth`: New RS256 JWT flow
2. Create auth abstraction layer:
   ```typescript
   interface AuthProvider {
     login(): Promise<void>;
     logout(): Promise<void>;
     getToken(): Promise<string | null>;
     refreshToken(): Promise<string | null>;
   }
   ```
3. Implement `ScholarAuthProvider` class:
   - PKCE S256 flow
   - Token storage (httpOnly cookie or secure localStorage)
   - Automatic refresh before expiry
4. Update `apiRequest` to attach `Authorization: Bearer` header
5. Handle 401 responses: refresh → retry → logout

**Acceptance Criteria:**
- Toggling `FEATURE_AUTH_PROVIDER` switches auth flow without code changes
- RS256 tokens validate against scholarship_api
- Token refresh works seamlessly

---

### Task 4: Standardized Error Handling UX
**Estimated Time:** 3 hours  
**Dependencies:** None (can start now)

**Implementation Plan:**
1. Create centralized error handler utility:
   ```typescript
   async function apiRequestWithResilience(method, url, data?, options?) {
     const maxRetries = 3;
     for (let i = 0; i <= maxRetries; i++) {
       try {
         return await apiRequest(method, url, data);
       } catch (error) {
         if (error.status === 401) {
           // Try token refresh
           const refreshed = await refreshToken();
           if (refreshed && i < maxRetries) continue;
           // Logout if refresh fails
           window.location.href = '/api/logout';
           return;
         }
         if (error.status === 403) {
           throw new InsufficientPermissionsError();
         }
         if (i === maxRetries) throw error;
         await backoff(i);
       }
     }
   }
   ```
2. Add network outage banner component (shows when offline)
3. Standardize toast messages for common errors
4. Add idempotency keys for mutations

**Acceptance Criteria:**
- 401 triggers token refresh → retry (not immediate logout)
- 403 shows clear "insufficient permissions" message
- Network errors retry with backoff
- User sees helpful error messages (not raw JSON)

---

### Task 5: CORS Configuration Validation
**Estimated Time:** 1 hour  
**Dependencies:** scholarship_api CORS allowlist configured

**Implementation Plan:**
1. Validate `serviceConfig.ts` CORS origin list
2. Add developer-mode CORS bypass (localhost)
3. Document required origins in OpenAPI spec
4. Test preflight requests from student_pilot

**Acceptance Criteria:**
- Preflight OPTIONS requests succeed
- scholarship_api allows student_pilot origin
- Developer mode allows localhost for local testing
- CORS errors logged with clear guidance

---

## Risk Assessment & Mitigation

### 🔴 CRITICAL RISKS

**1. scholar_auth Deployment Delay**
- **Impact:** student_pilot cannot authenticate users
- **Probability:** HIGH (no RS256 implementation yet)
- **Mitigation:**
  - Option A: Continue using Replit OIDC as fallback (delays ARR Ignition)
  - Option B: Implement lightweight JWT signing in student_pilot temporarily
  - **Recommendation:** Option A (maintain Replit OIDC until scholar_auth ready)
- **Go-Live Impact:** If scholar_auth not ready by Nov 18, push Go-Live to Nov 22

**2. scholarship_api JWT Middleware Missing**
- **Impact:** student_pilot can't call protected endpoints
- **Probability:** HIGH (no middleware implementation yet)
- **Mitigation:**
  - scholarship_api can temporarily accept session cookies from Replit OIDC
  - Migrate to JWT post-launch
- **Go-Live Impact:** Possible with session-based fallback (not ideal for microservices)

**3. SendGrid DNS Verification >24h**
- **Impact:** Email notifications delayed
- **Probability:** MEDIUM
- **Mitigation:**
  - Fallback to Postmark with Sender Signature (instant verification)
  - Use in-app notifications only until email ready
- **Go-Live Impact:** Can proceed with in-app notifications; email follows

### 🟡 MEDIUM RISKS

**4. CORS Configuration Mismatches**
- **Impact:** student_pilot API calls blocked
- **Probability:** MEDIUM
- **Mitigation:**
  - Pre-coordinate exact origin URLs with all DRIs
  - Test preflight requests in staging
- **Go-Live Impact:** Requires config update + redeploy (30 min fix)

**5. GA4 Event Schema Changes**
- **Impact:** Analytics dashboards break
- **Probability:** LOW
- **Mitigation:**
  - Lock event schema in integration contract
  - Version GA4 events (v1, v2)
- **Go-Live Impact:** Analytics gap until fixed (non-blocking)

---

## Cross-Service Readiness Checkpoint

**Scheduled:** Nov 18, 2025, 10:00 MST  
**Attendees:** All service DRIs + CEO

**Agenda:**
1. Gate 0 status review (scholar_auth, scholarship_api)
2. Gate 1 status review (auto_com_center, frontends)
3. Integration test results (E2E journeys)
4. Go/No-Go decision for Nov 20 launch
5. Fallback plan if gates not met

**Evidence Required from Each Service:**
- Commit IDs for Gate 0/1 features
- Test results (unit, integration, E2E)
- Performance metrics (P95 latency, error rates)
- CORS/JWT validation screenshots
- Notification delivery receipts

---

## Success Metrics (Post-Launch)

### Week 1 (Nov 20-27)
- **Activation:** 20% of signups complete first_document_upload
- **Uptime:** ≥99.5%
- **Error Rate:** ≤1%
- **P95 Latency:** ≤500ms (frontend), ≤200ms (API)

### Week 2-4 (Nov 28 - Dec 18)
- **B2C Revenue:** $1K MRR from credit sales
- **Student Engagement:** 50% return within 7 days
- **Application Submissions:** 100+ via student_pilot
- **Support Tickets:** ≤5/day

### Month 2 (Dec 19 - Jan 18)
- **B2C Revenue:** $5K MRR
- **B2B Revenue:** $2K MRR from provider fees
- **Total ARR:** $84K run rate
- **Activation Funnel:** 30% signup → first_document_upload

---

## Appendix: Environment Variables Required

```bash
# Auth (scholar_auth integration)
AUTH_ISSUER=https://scholar-auth-jamarrlmayes.replit.app
AUTH_AUDIENCE=scholar-platform
AUTH_JWKS_URL=https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json
FEATURE_AUTH_PROVIDER=scholar_auth  # or 'replit' for fallback

# APIs
API_BASE_URL=https://scholarship-api-jamarrlmayes.replit.app
FRONTEND_ORIGIN_STUDENT=https://student-pilot-jamarrlmayes.replit.app

# Database
DATABASE_URL=<postgres-connection-string>

# Object Storage
OBJECT_STORAGE_URL=<replit-object-storage-url>
OBJECT_STORAGE_BUCKET=<bucket-name>

# Analytics
GA_MEASUREMENT_ID=<google-analytics-id>

# Stripe (future B2C)
STRIPE_SECRET_KEY=<stripe-secret>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
```

---

**End of Integration Requirements Document**

**Next Steps:**
1. Distribute to all service DRIs (scholar_auth, scholarship_api, auto_com_center)
2. Schedule cross-service readiness checkpoint (Nov 18, 10:00 MST)
3. Monitor upstream progress hourly via R/A/G updates
4. Prepare student_pilot Tasks 3-5 (ready to execute upon upstream deployment)
