# Raw Truth Summary

**RUN_ID**: CEOSPRINT-20260123-EXEC-ZT3G-FIX-AUTH-005
**Timestamp**: 2026-01-23T11:02:00Z

---

## A5 (Student Pilot) - THIS WORKSPACE

### /api/login
- **Status**: ✅ HTTP 302 (Redirect)
- **Location**: `https://scholar-auth-jamarrlmayes.replit.app/oidc/auth?...`
- **PKCE**: ✅ `code_challenge_method=S256` present
- **Verdict**: PASS - Correctly redirects to A1 with PKCE

### /pricing
- **Status**: ✅ HTTP 200
- **Size**: 4508 bytes
- **Type**: React SPA (Stripe.js loaded dynamically via JS bundle)
- **Evidence**: `<div id="root">` present, bundled JS loads Stripe
- **Verdict**: PASS (Stripe loaded by SPA framework)

### /health
- **Status**: ✅ HTTP 200
- **Response**: `{"status":"healthy",...}`
- **Verdict**: PASS

### /api/health
- **Status**: ✅ HTTP 200
- **Response**: `{"status":"ok","app":"student_pilot",...}`
- **Verdict**: PASS

---

## A1 (ScholarAuth) - EXTERNAL

### /.well-known/openid-configuration
- **Status**: ✅ HTTP 200
- **S256 Claimed**: Yes (`code_challenge_methods_supported:["S256"]`)
- **Verdict**: PARTIAL - Discovery OK but S256 validation fails

### /health
- **Status**: ✅ HTTP 200
- **Response**: `{"status":"alive"}`
- **Verdict**: PASS

### /readyz
- **Status**: ✅ HTTP 200
- **DB Check**: healthy
- **Pool**: healthy
- **OAuth**: healthy
- **Verdict**: PASS

### /oidc/auth (with PKCE)
- **Status**: ⚠️ HTTP 303 → Error redirect
- **Error**: `error_description=not+supported+value+of+code_challenge_method`
- **Verdict**: FAIL - S256 validation bug

### /oidc/token
- **Status**: ❌ HTTP 400
- **Error**: `invalid_client`
- **Verdict**: FAIL - Client not registered or secret mismatch

---

## A2 (Scholarship API) - EXTERNAL

### /api/health
- **Status**: ⚠️ HTTP 401
- **Reason**: Requires authentication
- **Verdict**: EXPECTED - Auth-protected endpoint

---

## A3 (Scholarship Agent) - EXTERNAL

### /api/health
- **Status**: ✅ HTTP 200
- **Verdict**: PASS

---

## A6 (Provider Portal) - EXTERNAL

### /api/health
- **Status**: ❌ HTTP 404
- **Error**: Not Found
- **Verdict**: FAIL - App appears down

### /api/providers
- **Status**: ❌ HTTP 404
- **Error**: Not Found
- **Verdict**: FAIL - App appears down

---

## A7 (Auto Page Maker) - EXTERNAL

### /api/health
- **Status**: ✅ HTTP 200
- **Verdict**: PASS

---

## A8 (Auto Com Center) - EXTERNAL

### /api/health
- **Status**: ✅ HTTP 200
- **Verdict**: PASS

---

## Summary Matrix

| App | Health | Auth Flow | PKCE | Verdict |
|-----|--------|-----------|------|---------|
| A1 | ✅ OK | ❌ invalid_client | ❌ S256 bug | BLOCKED |
| A2 | ⚠️ 401 | N/A | N/A | AUTH-GATED |
| A3 | ✅ OK | N/A | N/A | PASS |
| A5 | ✅ OK | ✅ Redirects | ✅ S256 | PASS |
| A6 | ❌ 404 | N/A | N/A | DOWN |
| A7 | ✅ OK | N/A | N/A | PASS |
| A8 | ✅ OK | N/A | N/A | PASS |

---

## Blockers for GO

1. **A1**: Fix PKCE S256 validation + client registration
2. **A6**: Restart/redeploy app
