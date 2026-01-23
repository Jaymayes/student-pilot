# Auth Incident Report - CRITICAL

**Timestamp**: 2026-01-23T10:35:00Z
**Incident ID**: AUTH-500-2026-01-23
**Severity**: CRITICAL (blocking all user acquisition)

---

## Executive Summary

The central authentication service (ScholarAuth/A1) is **operational** but returning client authentication failures. This is blocking both B2C (student) and B2B (provider) sign-up funnels.

---

## Root Cause Analysis

### What's Working
- A1 health endpoint: ✅ HTTP 200
- A1 OIDC discovery: ✅ HTTP 200 (returns valid configuration)
- A1 login page: ✅ HTTP 200 (renders correctly)
- A5 (Student Pilot): ✅ HTTP 200

### What's Failing

| Component | Error | HTTP Code | Root Cause |
|-----------|-------|-----------|------------|
| A1 Token Endpoint | `invalid_client` | 400 | Client credentials mismatch |
| A1 Auth Redirect | `Authorization Error` | 400 | Client not registered/misconfigured |
| A6 Provider Portal | `Not Found` | 404 | App appears to be down |

### Technical Details

1. **Client Authentication Failed**
   - Error: `{"error":"invalid_client","error_description":"client authentication failed"}`
   - A5 has `AUTH_CLIENT_SECRET` configured, but A1 is rejecting it
   - **Fix**: Re-register `student-pilot` client in A1 or update A5's client secret

2. **Provider Portal Down**
   - A6 returning 404 on all endpoints including `/api/health`
   - **Fix**: Restart/redeploy A6 (Provider Portal)

---

## Immediate Actions Required

### Priority 0: Fix A1 Client Registration
The `student-pilot` and `provider-register` clients must be properly registered in ScholarAuth (A1) with matching client secrets.

**In A1 (scholar-auth), verify these clients exist:**
```
Client ID: student-pilot
Redirect URI: https://student-pilot-jamarrlmayes.replit.app/api/auth/callback
Secret: [must match AUTH_CLIENT_SECRET in A5]

Client ID: provider-register  
Redirect URI: https://provider-portal-jamarrlmayes.replit.app/api/auth/callback
Secret: [must match secret in A6]
```

### Priority 1: Restart A6 (Provider Portal)
A6 is completely unresponsive. Needs restart/redeploy.

### Priority 2: Verify Secrets Match
Ensure `AUTH_CLIENT_SECRET` in A5 matches what's registered in A1 for `student-pilot` client.

---

## Verification Commands

After fixes are applied, run these to verify:

```bash
# Test A1 token endpoint
curl -X POST "https://scholar-auth-jamarrlmayes.replit.app/oidc/token" \
  -d "grant_type=client_credentials&client_id=student-pilot&client_secret=<SECRET>"

# Test A6 health
curl "https://provider-portal-jamarrlmayes.replit.app/api/health"
```

---

## Impact

- **B2C Funnel**: BLOCKED (students cannot sign up)
- **B2B Funnel**: BLOCKED (providers cannot register)
- **Existing Sessions**: May still work (session cookies valid)
- **Revenue Impact**: 100% of new user acquisition blocked

---

## Resolution Owner

This requires changes in **A1 (ScholarAuth)** - a separate Replit app not in this workspace.

