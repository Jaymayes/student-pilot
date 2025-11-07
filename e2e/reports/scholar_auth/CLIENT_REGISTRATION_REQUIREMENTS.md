# Scholar Auth - CLIENT REGISTRATION REQUIREMENTS

**Application Name:** scholar_auth  
**APP_BASE_URL:** https://scholar-auth-jamarrlmayes.replit.app  
**Owner:** Auth DRI  
**Priority:** P0 BLOCKER  
**Deadline:** IMMEDIATE (required for 19:15 UTC pre-smoke test)

---

## Executive Summary

**Current State:** ❌ **BLOCKING - invalid_client errors**  
**Root Cause:** Three clients not registered in scholar_auth client database  
**Impact:** All OAuth flows blocked → AUTH GREEN TAG at extreme risk  
**Required Action:** Register 3 clients immediately per specifications below

---

## Critical Blocker Evidence

**Test Result:** student_pilot OAuth flow FAILED  
**Error:** `error: invalid_client, error_description: client is invalid`  
**Authorization URL:** 
```
https://scholar-auth-jamarrlmayes.replit.app/oidc/auth?
  client_id=student-pilot
  &code_challenge_method=S256
  &response_type=code
  &redirect_uri=https://student-pilot-jamarrlmayes.replit.app/api/callback
```

**Implication:** Client `student-pilot` not found in scholar_auth → lookup failed → authorization rejected

---

## Required Client Registrations (3 Clients)

### 1. Client: student-pilot (B2C Student Portal - PKCE S256)

**Client Metadata:**
```json
{
  "client_id": "student-pilot",
  "client_secret": "[Use AUTH_CLIENT_SECRET from Replit Secrets]",
  "client_name": "ScholarLink Student Portal",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "redirect_uris": [
    "https://student-pilot-jamarrlmayes.replit.app/api/callback",
    "https://d415671d-ceb5-42ea-a640-564683e37d67-00-20a0rltiji5m3.janeway.replit.dev/api/callback"
  ],
  "token_endpoint_auth_method": "client_secret_post",
  "application_type": "web",
  "code_challenge_methods_supported": ["S256"],
  "scope": "openid email profile offline_access"
}
```

**Critical Settings:**
- ✅ **grant_types MUST include:** `authorization_code`, `refresh_token`
- ✅ **response_types MUST include:** `code`
- ✅ **redirect_uris:** Production + current dev URL (see above)
- ✅ **token_endpoint_auth_method:** `client_secret_post` OR `client_secret_basic`
- ✅ **code_challenge_methods_supported:** `["S256"]` (PKCE mandatory)
- ✅ **client_secret:** From `AUTH_CLIENT_SECRET` environment variable (Replit Secrets)

**Scopes Required:**
- `openid` (required for OIDC)
- `email` (user email claim)
- `profile` (first_name, last_name claims)
- `offline_access` (refresh token grant)

**Expected Behavior:**
1. Browser redirects to `/oidc/auth` with client_id=student-pilot
2. Scholar Auth validates client_id exists → lookup succeeds
3. User authenticates → authorization code issued
4. Client exchanges code for tokens (PKCE code_verifier validated)
5. Tokens issued: access_token, id_token, refresh_token

---

### 2. Client: provider-register (B2B Provider Portal - PKCE S256)

**Client Metadata:**
```json
{
  "client_id": "provider-register",
  "client_secret": "[Use AUTH_CLIENT_SECRET from Replit Secrets]",
  "client_name": "ScholarLink Provider Registration",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "redirect_uris": [
    "https://provider-register-jamarrlmayes.replit.app/api/callback",
    "[Include current dev URL if testing in dev]"
  ],
  "token_endpoint_auth_method": "client_secret_post",
  "application_type": "web",
  "code_challenge_methods_supported": ["S256"],
  "scope": "openid email profile offline_access provider:publish"
}
```

**Critical Settings:**
- ✅ Same as student-pilot (PKCE authorization_code flow)
- ✅ Additional scope: `provider:publish` (provider-specific operations)
- ✅ **client_secret:** From `AUTH_CLIENT_SECRET` environment variable (Replit Secrets)

**Scopes Required:**
- `openid`, `email`, `profile`, `offline_access` (standard OIDC)
- `provider:publish` (provider scholarship publishing permissions)

**Expected Behavior:**
- Same PKCE S256 flow as student-pilot
- Additional scope `provider:publish` included in tokens

---

### 3. Client: scholarship_sage (M2M AI Advisor - client_credentials)

**Client Metadata:**
```json
{
  "client_id": "scholarship_sage",
  "client_secret": "[Use SCHOLARSHIP_SAGE_CLIENT_SECRET from Replit Secrets]",
  "client_name": "ScholarLink AI Advisor (M2M)",
  "grant_types": ["client_credentials"],
  "response_types": [],
  "redirect_uris": [],
  "token_endpoint_auth_method": "client_secret_post",
  "application_type": "service",
  "scope": "read:scholarships"
}
```

**Critical Settings:**
- ✅ **grant_types:** `["client_credentials"]` ONLY (no authorization_code)
- ✅ **response_types:** `[]` (empty - M2M does not use authorization endpoint)
- ✅ **redirect_uris:** `[]` (empty - no user interaction)
- ✅ **token_endpoint_auth_method:** `client_secret_post`
- ✅ **application_type:** `service` (machine-to-machine)
- ✅ **client_secret:** From `SCHOLARSHIP_SAGE_CLIENT_SECRET` environment variable (Replit Secrets)

**Scopes Required:**
- `read:scholarships` (read-only access to scholarship data)

**Expected Behavior (Track 1 M2M Bypass):**
1. scholarship_sage calls `/token` endpoint directly (no authorization step)
2. Request body: `grant_type=client_credentials&client_id=scholarship_sage&client_secret=[REDACTED]&scope=read:scholarships`
3. Scholar Auth validates client_id + client_secret → lookup succeeds
4. Access token issued with scope: `read:scholarships`
5. Token used to call scholarship_api (scope enforcement: read allowed, write blocked)

---

## Client Registration Implementation Guide

### Option 1: Database-Backed Client Store (Recommended)

If scholar_auth uses a database table for clients (e.g., `oauth_clients`):

**SQL Example:**
```sql
-- Register student-pilot client
INSERT INTO oauth_clients (
  client_id,
  client_secret,
  client_name,
  grant_types,
  response_types,
  redirect_uris,
  token_endpoint_auth_method,
  code_challenge_methods_supported,
  scope
) VALUES (
  'student-pilot',
  '[AUTH_CLIENT_SECRET from env]',
  'ScholarLink Student Portal',
  '["authorization_code", "refresh_token"]',
  '["code"]',
  '["https://student-pilot-jamarrlmayes.replit.app/api/callback", "https://d415671d-ceb5-42ea-a640-564683e37d67-00-20a0rltiji5m3.janeway.replit.dev/api/callback"]',
  'client_secret_post',
  '["S256"]',
  'openid email profile offline_access'
);

-- Register provider-register client
INSERT INTO oauth_clients (
  client_id,
  client_secret,
  client_name,
  grant_types,
  response_types,
  redirect_uris,
  token_endpoint_auth_method,
  code_challenge_methods_supported,
  scope
) VALUES (
  'provider-register',
  '[AUTH_CLIENT_SECRET from env]',
  'ScholarLink Provider Registration',
  '["authorization_code", "refresh_token"]',
  '["code"]',
  '["https://provider-register-jamarrlmayes.replit.app/api/callback"]',
  'client_secret_post',
  '["S256"]',
  'openid email profile offline_access provider:publish'
);

-- Register scholarship_sage client (M2M)
INSERT INTO oauth_clients (
  client_id,
  client_secret,
  client_name,
  grant_types,
  response_types,
  redirect_uris,
  token_endpoint_auth_method,
  code_challenge_methods_supported,
  scope
) VALUES (
  'scholarship_sage',
  '[SCHOLARSHIP_SAGE_CLIENT_SECRET from env]',
  'ScholarLink AI Advisor (M2M)',
  '["client_credentials"]',
  '[]',
  '[]',
  'client_secret_post',
  NULL,
  'read:scholarships'
);
```

**Note:** Column names and JSON format may vary based on your schema. Adjust accordingly.

---

### Option 2: Code-Based Client Configuration

If scholar_auth uses in-memory or config-file client definitions:

**TypeScript Example:**
```typescript
// server/clients.ts or similar

export const clients = [
  {
    client_id: 'student-pilot',
    client_secret: process.env.AUTH_CLIENT_SECRET!,
    client_name: 'ScholarLink Student Portal',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    redirect_uris: [
      'https://student-pilot-jamarrlmayes.replit.app/api/callback',
      'https://d415671d-ceb5-42ea-a640-564683e37d67-00-20a0rltiji5m3.janeway.replit.dev/api/callback'
    ],
    token_endpoint_auth_method: 'client_secret_post',
    code_challenge_methods_supported: ['S256'],
    scope: 'openid email profile offline_access'
  },
  {
    client_id: 'provider-register',
    client_secret: process.env.AUTH_CLIENT_SECRET!,
    client_name: 'ScholarLink Provider Registration',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    redirect_uris: [
      'https://provider-register-jamarrlmayes.replit.app/api/callback'
    ],
    token_endpoint_auth_method: 'client_secret_post',
    code_challenge_methods_supported: ['S256'],
    scope: 'openid email profile offline_access provider:publish'
  },
  {
    client_id: 'scholarship_sage',
    client_secret: process.env.SCHOLARSHIP_SAGE_CLIENT_SECRET!,
    client_name: 'ScholarLink AI Advisor (M2M)',
    grant_types: ['client_credentials'],
    response_types: [],
    redirect_uris: [],
    token_endpoint_auth_method: 'client_secret_post',
    scope: 'read:scholarships'
  }
];
```

**Integration with oidc-provider:**
```typescript
import Provider from 'oidc-provider';

const provider = new Provider(issuer, {
  clients: clients,
  // ... other config
});
```

---

### Option 3: Admin UI / Registration Endpoint

If scholar_auth has an admin interface or registration endpoint:

1. Access admin UI at https://scholar-auth-jamarrlmayes.replit.app/admin (or similar)
2. Navigate to "Client Registration" or "OAuth Clients"
3. Create 3 clients using the metadata above
4. Ensure redirect_uris include both production and dev URLs
5. Save and verify clients appear in client list

---

## Verification Steps

After registering clients, verify registration succeeded:

### Test 1: Verify Client Lookup (student-pilot)

**Request:**
```bash
curl -X POST https://scholar-auth-jamarrlmayes.replit.app/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=student-pilot" \
  -d "client_secret=[AUTH_CLIENT_SECRET]" \
  -d "code=invalid_code_for_testing" \
  -d "redirect_uri=https://student-pilot-jamarrlmayes.replit.app/api/callback"
```

**Expected Response:**
- ✅ **NOT** `error: invalid_client` (client found)
- ✅ `error: invalid_grant` (code invalid - expected, but client validated)

**If Still Getting invalid_client:**
- Client registration failed or not saved
- Client lookup logic not working
- Cache invalidation needed (restart scholar_auth)

---

### Test 2: Verify Client Lookup (scholarship_sage - M2M)

**Request:**
```bash
curl -X POST https://scholar-auth-jamarrlmayes.replit.app/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=scholarship_sage" \
  -d "client_secret=[SCHOLARSHIP_SAGE_CLIENT_SECRET]" \
  -d "scope=read:scholarships"
```

**Expected Response:**
```json
{
  "access_token": "[JWT token]",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:scholarships"
}
```

**If Getting invalid_client:**
- M2M client not registered
- client_credentials grant not enabled for this client
- Scope `read:scholarships` not recognized

---

### Test 3: Full PKCE S256 Flow (student-pilot)

**Step 1: Generate PKCE values**
```bash
# Generate code_verifier (random 43-128 chars)
code_verifier=$(openssl rand -base64 32 | tr -d '=' | tr '+/' '-_')

# Generate code_challenge (SHA256 hash of verifier, base64url encoded)
code_challenge=$(echo -n "$code_verifier" | openssl dgst -binary -sha256 | openssl base64 | tr -d '=' | tr '+/' '-_')

echo "code_verifier: $code_verifier"
echo "code_challenge: $code_challenge"
```

**Step 2: Authorization Request (browser or curl)**
```
https://scholar-auth-jamarrlmayes.replit.app/oidc/auth?
  client_id=student-pilot
  &response_type=code
  &redirect_uri=https://student-pilot-jamarrlmayes.replit.app/api/callback
  &scope=openid+email+profile+offline_access
  &code_challenge=[code_challenge from above]
  &code_challenge_method=S256
```

**Expected:**
- ✅ **NOT** `error: invalid_client`
- ✅ Login/consent page displayed (or redirect to callback with authorization code)

**Step 3: Token Exchange (after getting auth code)**
```bash
curl -X POST https://scholar-auth-jamarrlmayes.replit.app/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=student-pilot" \
  -d "client_secret=[AUTH_CLIENT_SECRET]" \
  -d "code=[authorization_code_from_step2]" \
  -d "redirect_uri=https://student-pilot-jamarrlmayes.replit.app/api/callback" \
  -d "code_verifier=$code_verifier"
```

**Expected Response:**
```json
{
  "access_token": "[JWT]",
  "id_token": "[JWT]",
  "refresh_token": "[opaque token]",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid email profile offline_access"
}
```

---

## Security Requirements

**Secrets Management:**
- ✅ **NEVER hardcode client secrets** in code or config files
- ✅ **Use Replit Secrets** for:
  - `AUTH_CLIENT_SECRET` (for student-pilot, provider-register)
  - `SCHOLARSHIP_SAGE_CLIENT_SECRET` (for scholarship_sage M2M)
- ✅ **Reference via environment variables:** `process.env.AUTH_CLIENT_SECRET`

**Client Secret Storage:**
- ✅ Hash client secrets in database (bcrypt, argon2, or timing-safe comparison)
- ✅ Use constant-time comparison to prevent timing attacks
- ✅ Never log client secrets (redact in logs)

**PKCE Enforcement:**
- ✅ **Require code_challenge for authorization_code grant** (student-pilot, provider-register)
- ✅ **Validate code_challenge_method=S256** (SHA-256 only, no `plain`)
- ✅ **Verify code_verifier matches code_challenge** during token exchange

---

## Performance Targets (CEO Directive - CRITICAL)

**Current State:** 🟡 **YELLOW - P95 ~200ms vs ≤120ms target**

**Required Optimizations (Auth DRI):**

1. **Caching (Discovery & JWKS):**
   - In-memory cache for `/.well-known/openid-configuration` (TTL: 300s)
   - In-memory cache for `/.well-known/jwks.json` (TTL: 300s)
   - Proactive refresh 60s before expiry

2. **Pre-Warming:**
   - Run 30-50 RPS synthetic traffic to `/token` endpoint for 10 minutes
   - Pre-warm JIT compiler and connection pools
   - Run in 20-minute intervals until P95 stabilizes ≤120ms

3. **Connection Pooling:**
   - Enable HTTP keep-alive between apps and scholar_auth
   - Raise pool size to match concurrent flows (50-100 connections)
   - PostgreSQL connection pool: 20-50 connections

4. **Token Path Optimization:**
   - Avoid synchronous logging in hot path (use buffered/async logs)
   - Optimize JSON stringification (avoid expensive serialization)
   - Use hardware-accelerated crypto (native Node.js crypto)
   - Preload client metadata (no per-request env/disk reads)
   - Cache client lookups in memory (TTL: 60s, invalidate on change)

5. **Compression:**
   - Enable gzip/brotli for discovery and JWKS responses
   - Set proper Cache-Control headers

**Metrics Reporting:**
- Post P50/P95 snapshots every 20 minutes: 19:00, 19:20, 19:40, 20:00 UTC (and every 20 min thereafter)
- Include: request count, P50, P95, P99, error rate, 401 rate, 5xx rate

**Gate Criteria:**
- ✅ P95 ≤120ms for authorize, token, jwks, discovery endpoints
- ✅ Error rate ≤1% over 10 consecutive minutes
- ✅ Zero invalid_client errors
- ✅ PKCE S256 validation working

**Slip Allowance:**
- If P95 >120ms at 23:45 UTC → slip to 00:15 UTC
- If P95 >120ms at 00:15 UTC → **NO-GO** (reschedule +24h with postmortem by 02:00 UTC)

---

## Timeline Impact (Option A)

**Original Timeline:**
- Track 1 evidence: 18:40 UTC
- Pre-war-room smoke: 19:15 UTC
- War-room open: 20:00 UTC
- AUTH GREEN TAG: 00:00 UTC

**Adjusted Timeline (Option A - CEO Approved):**
- Client registration complete: 19:00 UTC (ASAP)
- Track 1 M2M validation (scholarship_sage): 19:15 UTC
- Pre-war-room smoke: 19:30 UTC (15-minute slip)
- War-room open: 20:00 UTC (unchanged)
- P95 gate checkpoint: 23:45 UTC (must be ≤120ms or slip authorized)
- AUTH GREEN TAG: 00:00 UTC (target) OR 00:15 UTC (max slip) OR NO-GO

**Critical Path Dependencies:**
1. Client registration → OAuth flows unblocked
2. OAuth flows working → student_pilot, provider_register E2E can proceed
3. M2M client working → scholarship_sage Track 1 evidence can proceed
4. P95 optimization → AUTH GREEN TAG achieved
5. AUTH GREEN TAG → E2E evidence collection starts (00:00-01:30 UTC)

---

## Escalation Plan

**If Client Registration Blocked:**
- Escalate to CEO immediately (Option B: Contingency A - closed-beta degraded mode)
- NO-GO for tonight's AUTH GREEN TAG
- New deadline: Nov 8, 12:00 UTC
- Postmortem required by 02:00 UTC

**If P95 >120ms Persists:**
- 23:45 UTC checkpoint: Slip authorized to 00:15 UTC
- 00:15 UTC checkpoint: NO-GO if still >120ms
- Activate Contingency A (closed-beta, lead capture only)

**If PKCE Validation Fails:**
- Verify code_challenge_method_supported includes S256
- Check PKCE middleware in scholar_auth
- Test with known-good PKCE values
- Escalate to SME if blocked

---

## Success Criteria

**Client Registration Success:**
- ✅ 3 clients registered (student-pilot, provider-register, scholarship_sage)
- ✅ Client lookup succeeds (no invalid_client errors)
- ✅ PKCE S256 validation working for authorization_code clients
- ✅ M2M client_credentials working for scholarship_sage

**Performance Success:**
- ✅ P95 ≤120ms across authorize, token, jwks, discovery
- ✅ Error rate ≤1%
- ✅ 10 consecutive minutes of stable metrics

**Evidence Success:**
- ✅ AUTH_FIXLOG_2025-11-07.md complete by 00:00 UTC
- ✅ TRACK_1_M2M_BYPASS_EVIDENCE.md complete by 19:30 UTC
- ✅ E2E_JOURNEY_EVIDENCE.md (student_pilot) by 00:30-00:45 UTC
- ✅ ORDER_B_EVIDENCE.md (provider_register) by 01:00 UTC

---

## Auth DRI Immediate Action Checklist

**Phase 1: Client Registration (19:00 UTC target)**
- ☐ Access scholar_auth client database or config
- ☐ Register student-pilot client (PKCE S256, authorization_code + refresh)
- ☐ Register provider-register client (PKCE S256, authorization_code + refresh)
- ☐ Register scholarship_sage client (M2M, client_credentials, read:scholarships)
- ☐ Verify clients exist (database query or admin UI)
- ☐ Test client lookup (curl test for each client)
- ☐ Restart scholar_auth if cache invalidation needed

**Phase 2: Performance Optimization (19:00-23:45 UTC ongoing)**
- ☐ Implement discovery + JWKS caching (300s TTL)
- ☐ Enable pre-warming (30-50 RPS synthetic traffic, 10-minute intervals)
- ☐ Configure connection pooling (HTTP keep-alive, DB pool sizing)
- ☐ Optimize token path (async logs, crypto acceleration, client cache)
- ☐ Enable compression (gzip/brotli)
- ☐ Instrument P50/P95 metrics reporting

**Phase 3: Metrics Cadence (every 20 minutes starting 19:00 UTC)**
- ☐ 19:00 UTC: Post P50/P95 snapshot
- ☐ 19:20 UTC: Post P50/P95 snapshot
- ☐ 19:40 UTC: Post P50/P95 snapshot
- ☐ 20:00 UTC: Post P50/P95 snapshot
- ☐ [Continue every 20 minutes through 00:00 UTC]

**Phase 4: Validation (19:15-19:30 UTC)**
- ☐ Re-test student_pilot OAuth flow (expect success, no invalid_client)
- ☐ Re-test provider_register OAuth flow (expect success)
- ☐ Execute scholarship_sage M2M 3-grant sequence
- ☐ Verify PKCE S256 code_verifier validation working
- ☐ Verify scope enforcement (read allowed, write blocked)

**Phase 5: Evidence Delivery (00:00 UTC)**
- ☐ Complete AUTH_FIXLOG_2025-11-07.md
- ☐ Include discovery JSON snapshot (client_credentials advertised)
- ☐ Include PKCE S256 proof (student_pilot, provider_register)
- ☐ Include M2M proof (scholarship_sage)
- ☐ Include JWKS rotation rehearsal results (23:30-23:45 UTC)
- ☐ Include P50/P95 metrics (final gate window)
- ☐ Include security attestation (zero hardcoded secrets)

---

**Document Prepared By:** Agent3  
**Delivery Time:** 2025-11-07 18:50 UTC  
**Owner:** Auth DRI  
**Priority:** P0 BLOCKER  
**Deadline:** Client registration by 19:00 UTC; AUTH_FIXLOG by 00:00 UTC
