# Manual Intervention Manifest

**RUN_ID**: CEOSPRINT-20260123-EXEC-ZT3G-FIX-AUTH-005
**Generated**: 2026-01-23T11:00:00Z
**Status**: EXTERNAL ACCESS REQUIRED

---

## Summary

The following issues **cannot be fixed** from the A5 (student-pilot) workspace. They require direct access to external Replit apps.

---

## BLOCKER 1: A1 (ScholarAuth) - PKCE Validation Bug

**Replit URL**: https://replit.com/@jamarrlmayes/scholar-auth  
**Production URL**: https://scholar-auth-jamarrlmayes.replit.app

### Issue
A1's OIDC discovery claims S256 PKCE support, but the `/oidc/auth` endpoint rejects S256 challenges with:
```
error=invalid_request
error_description=not supported value of code_challenge_method
```

### Evidence
- Discovery shows: `"code_challenge_methods_supported":["S256"]`
- Test with S256: Returns 303 redirect with error "not supported value of code_challenge_method"
- Test without PKCE: Returns error "Authorization Server policy requires PKCE to be used"

### Required Fix

**File**: Look for OIDC/OAuth provider configuration (likely `server/oidc.ts` or similar)

```javascript
// BEFORE (broken):
// PKCE validation is rejecting valid S256 challenges

// AFTER (fixed):
// Ensure code_challenge_method is validated case-insensitively
// and the S256 algorithm is properly implemented

// In the authorization endpoint handler:
const code_challenge_method = req.query.code_challenge_method;
if (code_challenge_method && code_challenge_method.toUpperCase() !== 'S256') {
  return res.status(400).json({
    error: 'invalid_request',
    error_description: 'Only S256 code_challenge_method is supported'
  });
}

// In the token endpoint handler:
// Verify code_verifier matches code_challenge using SHA256
const crypto = require('crypto');
const expectedChallenge = crypto
  .createHash('sha256')
  .update(code_verifier)
  .digest('base64url');

if (expectedChallenge !== stored_code_challenge) {
  return res.status(400).json({
    error: 'invalid_grant',
    error_description: 'code_verifier does not match code_challenge'
  });
}
```

### Verification Command
```bash
# After fix, this should redirect to login page (not error redirect):
curl -sI "https://scholar-auth-jamarrlmayes.replit.app/oidc/auth?client_id=student-pilot&response_type=code&redirect_uri=https://student-pilot-jamarrlmayes.replit.app/api/callback&scope=openid%20profile%20email&state=test&code_challenge=PQAVMKPH1BBOLAOhh0Sq5H9uUfM-WeVp55i-7v6exkA&code_challenge_method=S256" | grep "location:"
# Should NOT contain "error="
```

---

## BLOCKER 2: A1 (ScholarAuth) - Client Registration Invalid

**Replit URL**: https://replit.com/@jamarrlmayes/scholar-auth  

### Issue
Token endpoint returns `invalid_client` for both `student-pilot` and `provider-register` clients.

### Evidence
```json
{"error":"invalid_client","error_description":"client authentication failed"}
```

### Required Fix

**File**: Look for client registration (likely in a database, config file, or environment)

Ensure these clients are registered:

```javascript
// Client 1: student-pilot
{
  client_id: "student-pilot",
  client_secret: process.env.STUDENT_PILOT_CLIENT_SECRET, // Must match AUTH_CLIENT_SECRET in A5
  redirect_uris: [
    "https://student-pilot-jamarrlmayes.replit.app/api/callback"
  ],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "client_secret_basic", // or "client_secret_post"
}

// Client 2: provider-register
{
  client_id: "provider-register", 
  client_secret: process.env.PROVIDER_REGISTER_CLIENT_SECRET, // Must match secret in A6
  redirect_uris: [
    "https://provider-portal-jamarrlmayes.replit.app/api/callback"
  ],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "client_secret_basic",
}
```

### Environment Variables Required in A1
```bash
STUDENT_PILOT_CLIENT_SECRET=<same value as AUTH_CLIENT_SECRET in A5>
PROVIDER_REGISTER_CLIENT_SECRET=<same value as secret in A6>
```

### Verification Command
```bash
# After fix, this should return tokens (not invalid_client):
curl -X POST "https://scholar-auth-jamarrlmayes.replit.app/oidc/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "student-pilot:<SECRET>" \
  -d "grant_type=client_credentials"
```

---

## BLOCKER 3: A6 (Provider Portal) - App Down

**Replit URL**: https://replit.com/@jamarrlmayes/provider-portal  
**Production URL**: https://provider-portal-jamarrlmayes.replit.app

### Issue
A6 returns 404 on all endpoints including `/api/health`.

### Evidence
```bash
$ curl "https://provider-portal-jamarrlmayes.replit.app/api/health"
Not Found
HTTP: 404
```

### Required Fix
1. Open the provider-portal Replit workspace
2. Check if the app is running (Restart if needed)
3. Verify the server is binding to `0.0.0.0:${PORT}`
4. Check logs for crash errors
5. Republish if deployment is stale

### Verification Command
```bash
curl -sL "https://provider-portal-jamarrlmayes.replit.app/api/health" | jq .
# Should return: {"status":"ok",...}
```

---

## Summary of Required Actions

| Priority | App | Issue | Action |
|----------|-----|-------|--------|
| P0 | A1 | PKCE S256 validation bug | Fix PKCE validation logic |
| P0 | A1 | Client registration invalid | Register student-pilot and provider-register clients with correct secrets |
| P1 | A6 | App returning 404 | Restart/redeploy app |

---

## A5 Status (This Workspace)

✅ **A5 is correctly configured:**
- `FEATURE_AUTH_PROVIDER=scholar-auth`
- `AUTH_CLIENT_ID=student-pilot`
- `AUTH_CLIENT_SECRET=[configured]`
- `AUTH_ISSUER_URL=https://scholar-auth-jamarrlmayes.replit.app/oidc`
- Uses openid-client v6 with automatic PKCE S256 support
- Cookie configuration correct: `secure=true, sameSite='none', httpOnly=true`

**No changes required in A5.** The auth flow will work once A1 issues are resolved.

---

## Attestation

```
Attestation: BLOCKED (External Access Required)
See Manual Intervention Manifest for A1 and A6 fixes.
```
