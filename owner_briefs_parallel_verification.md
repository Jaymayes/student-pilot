# OWNER BRIEFS - PARALLEL VERIFICATION
**15-Minute Sprint: Individual Responsibilities**

**Generated:** 2025-11-23T17:30:00Z  
**Timeline:** T+0 to T+15 (all owners work in parallel)

---

## COMMUNICATION PROTOCOL

**Slack Channel:** #first-dollar-sprint

**Reporting Format:**
```
[TIME] [OWNER] [APP] [STATUS]
T+3  Auth Lead | scholar_auth | ✅ JWKS verified
T+5  Auth Lead | scholar_auth | ✅ COMPLETE
```

**Status Codes:**
- ✅ PASS - Criterion met
- ❌ FAIL - Criterion not met (explain why)
- ⚠️ WARN - Partial pass (explain)
- 🔄 IN PROGRESS

**Escalation:** Any ❌ FAIL → tag @CEO immediately

---

## OWNER 1: AUTH LEAD - scholar_auth

**App:** scholar_auth (Identity Provider)  
**Time Allotted:** 5 minutes  
**Critical Path:** No

### Your Mission

Verify that scholar_auth IdP is operational and correctly configured for all downstream apps to validate JWT tokens.

### Verification Tasks

#### Task 1: JWKS Endpoint (2 minutes)

**What to do:**
```bash
curl -s -w "\nHTTP:%{http_code} TIME:%{time_total}s\n" \
  https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json | head -5
```

**Pass Criteria:**
- ✅ HTTP status: 200
- ✅ Latency: < 250ms (P95 threshold)
- ✅ Response contains RSA key with `"kty":"RSA"`

**Expected Output:**
```json
{"keys":[{"kty":"RSA","kid":"scholar-auth-prod-...","use":"sig","alg":"RS256",...}]}
HTTP:200 TIME:0.146s
```

**If FAIL:**
- Check scholar_auth deployment status
- Verify JWKS cache is initialized
- Escalate if service is down

---

#### Task 2: Issuer and Audience Values (1 minute)

**What to do:**
Document the exact issuer and audience values that downstream apps must enforce.

**Expected Values:**
```
Issuer:   https://scholar-auth-jamarrlmayes.replit.app
Audience: student-pilot
```

**Verification:**
```bash
# Check student_pilot configuration
node -e "console.log('Issuer:', process.env.AUTH_ISSUER_URL); \
         console.log('Audience:', process.env.AUTH_CLIENT_ID);"
```

**Pass Criteria:**
- ✅ Issuer matches across all apps
- ✅ Audience set to `student-pilot`

---

#### Task 3: Auth Enforcement (2 minutes)

**What to do:**
Test that protected endpoints return 401 without a valid token.

**Command:**
```bash
curl -s https://student-pilot-jamarrlmayes.replit.app/api/billing/summary
```

**Expected Response:**
```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required"
  }
}
```

**Pass Criteria:**
- ✅ HTTP 401 returned
- ✅ Error code: UNAUTHENTICATED
- ✅ No sensitive data leaked in error

**Note:** Replit OIDC fallback is active (Scholar Auth degraded but working)

---

### Final Submission

**Format:**
```
Auth Lead | scholar_auth | ✅ COMPLETE | 4min

Results:
✅ JWKS: 200 OK, 146ms latency
✅ Issuer: https://scholar-auth-jamarrlmayes.replit.app
✅ Audience: student-pilot
✅ Auth Enforcement: 401 without token

Replit OIDC fallback active and operational.

Ready for GO.
```

---

## OWNER 2: API LEAD - scholarship_api

**App:** scholarship_api (Scholarship Search & Discovery)  
**Time Allotted:** 5 minutes  
**Critical Path:** No

### Your Mission

Verify that scholarship_api is healthy and understand the credit ledger architecture (ledger is in student_pilot, not here).

### Verification Tasks

#### Task 1: Service Health (1 minute)

**What to do:**
```bash
curl -s https://scholarship-api-jamarrlmayes.replit.app/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "trace_id": "..."
}
```

**Pass Criteria:**
- ✅ HTTP 200
- ✅ status: "healthy"

---

#### Task 2: Protected Endpoint Test (2 minutes)

**What to do:**
Test that protected endpoints enforce authentication.

**Command:**
```bash
curl -s -w "\nHTTP:%{http_code}\n" \
  https://scholarship-api-jamarrlmayes.replit.app/api/v1/search?q=engineering
```

**Expected:**
- ✅ HTTP 200 (public search endpoint)

**Note:** scholarship_api is primarily a search API. Credit ledger is managed by student_pilot billing service.

---

#### Task 3: Architecture Verification (2 minutes)

**What to confirm:**

**scholarship_api Role:**
- Scholarship search and discovery
- NOT the credit ledger system

**Credit Ledger Location:**
- Managed by **student_pilot** billing service
- Endpoints:
  - `POST /api/billing/create-checkout`
  - `GET /api/billing/summary`
  - `GET /api/billing/ledger`
  - `GET /api/billing/usage`

**Pass Criteria:**
- ✅ Understand architecture split
- ✅ Know credit ledger is in student_pilot
- ✅ Can explain to team if asked

---

### Final Submission

**Format:**
```
API Lead | scholarship_api | ✅ COMPLETE | 4min

Results:
✅ Health: 200 OK
✅ Service: Operational
✅ Architecture: Confirmed - Search API only
✅ Credit Ledger: In student_pilot billing (correct)

Ready for GO.
```

---

## OWNER 3: PAYMENTS LEAD - provider_register

**App:** provider_register (Stripe Payment Handler)  
**Time Allotted:** 10 minutes  
**Critical Path:** ⚠️ **YES - BLOCKING ISSUE IDENTIFIED**

### Your Mission

**CRITICAL:** Configure STRIPE_WEBHOOK_SECRET and verify all Stripe LIVE configuration is correct.

### ⚠️ BLOCKING ISSUE

**Current Status:**
```
Stripe Secret Key:  rk_live_51QO... ✅ (LIVE)
Stripe Public Key:  pk_live_51QO... ✅ (LIVE)
Stripe Webhook:     NOT_SET ❌ (BLOCKING!)
```

**Impact:** Without STRIPE_WEBHOOK_SECRET, payment webhooks will FAIL and credits cannot be posted.

### Verification Tasks

#### Task 1: Configure STRIPE_WEBHOOK_SECRET (5 minutes) **URGENT**

**What to do:**

1. **Get Webhook Secret from Stripe:**
   - Open Stripe Dashboard → Developers → Webhooks
   - Find endpoint: `https://provider-register-jamarrlmayes.replit.app/stripe/webhook`
   - Click "Reveal" on Signing secret
   - Copy value (starts with `whsec_`)

2. **Add to Replit Secrets:**
   - Open provider_register Repl
   - Go to Secrets tab (🔒 icon in left sidebar)
   - Click "+ New secret"
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: [paste whsec_... value]
   - Click "Add secret"

3. **Restart Workflow:**
   - Click "Restart" on workflow
   - Wait 30 seconds for reload

4. **Verify Configuration:**
```bash
node -e "console.log('Webhook Secret:', \
  (process.env.STRIPE_WEBHOOK_SECRET || 'NOT_SET').substring(0, 10) + '...')"
```

**Expected Output:**
```
Webhook Secret: whsec_abcd...
```

**Pass Criteria:**
- ✅ STRIPE_WEBHOOK_SECRET starts with `whsec_`
- ✅ Secret added to Replit Secrets (not hardcoded)
- ✅ Workflow restarted successfully

---

#### Task 2: Screenshot Stripe Secrets (2 minutes)

**What to do:**

1. Open provider_register Repl → Secrets tab
2. Take screenshot showing **PREFIXES ONLY:**
   - STRIPE_SECRET_KEY: `rk_live_***`
   - VITE_STRIPE_PUBLIC_KEY: `pk_live_***`
   - STRIPE_WEBHOOK_SECRET: `whsec_***`
   - NOTIFY_WEBHOOK_SECRET: `[REDACTED]`

**⚠️ CRITICAL: DO NOT show full secret values**

**Pass Criteria:**
- ✅ Screenshot shows all 4 secrets present
- ✅ Only prefixes visible, not full values
- ✅ All keys are LIVE mode (not TEST)

---

#### Task 3: Screenshot Stripe Webhook Config (3 minutes)

**What to do:**

1. Open Stripe Dashboard → Developers → Webhooks
2. Find endpoint: `https://provider-register-jamarrlmayes.replit.app/stripe/webhook`
3. Take screenshot showing:
   - ✅ Endpoint URL (correct)
   - ✅ Events: `payment_intent.succeeded` + `payment_intent.payment_failed`
   - ✅ Mode: **LIVE** (NOT Test)
   - ✅ Status: **Enabled**

**Pass Criteria:**
- ✅ Webhook endpoint is correct
- ✅ Mode is LIVE (critical!)
- ✅ Both payment events are enabled
- ✅ Status shows "Enabled"

---

#### Task 4: Verify NOTIFY_WEBHOOK_SECRET (1 minute)

**What to do:**
```bash
node -e "console.log('NOTIFY Secret:', \
  (process.env.NOTIFY_WEBHOOK_SECRET || 'NOT_SET').substring(0, 8) + '...')"
```

**Expected Output:**
```
NOTIFY Secret: aadd881e...
```

**Pass Criteria:**
- ✅ NOTIFY_WEBHOOK_SECRET is set
- ✅ First 8 chars: `aadd881e` (matches auto_com_center)

---

### Final Submission

**Format:**
```
Payments Lead | provider_register | ✅ COMPLETE | 9min

Results:
✅ STRIPE_WEBHOOK_SECRET: whsec_*** (CONFIGURED)
✅ Stripe Secret Key: rk_live_*** (LIVE)
✅ Stripe Public Key: pk_live_*** (LIVE)
✅ NOTIFY_WEBHOOK_SECRET: aadd881e*** (SET)
✅ Stripe Webhook: LIVE endpoint enabled

Screenshots attached:
1. Replit Secrets (prefixes only)
2. Stripe Dashboard Webhook (LIVE mode)

BLOCKER RESOLVED. Ready for GO.
```

**Attach:** 2 screenshots to Slack message

---

## OWNER 4: COMMS LEAD - auto_com_center

**App:** auto_com_center (Notification Delivery)  
**Time Allotted:** 5 minutes  
**Critical Path:** No

### Your Mission

Verify that auto_com_center is ready to receive and deliver payment notifications from provider_register.

### Verification Tasks

#### Task 1: Service Health (1 minute)

**What to do:**
```bash
curl -s -w "\nHTTP:%{http_code}\n" \
  https://auto-com-center-jamarrlmayes.replit.app/readyz
```

**Expected Response:**
```json
{"status":"ok"}
HTTP:200
```

**Pass Criteria:**
- ✅ HTTP 200
- ✅ status: "ok"

---

#### Task 2: NOTIFY_WEBHOOK_SECRET Verification (2 minutes)

**What to do:**
```bash
node -e "console.log('NOTIFY Secret:', \
  (process.env.NOTIFY_WEBHOOK_SECRET || 'NOT_SET').substring(0, 8) + '...')"
```

**Expected Output:**
```
NOTIFY Secret: aadd881e...
```

**Pass Criteria:**
- ✅ NOTIFY_WEBHOOK_SECRET is set
- ✅ First 8 chars: `aadd881e`
- ✅ **Matches provider_register** (confirm with Payments Lead)

---

#### Task 3: Notification Endpoint Test (2 minutes)

**What to verify:**

The `/send-notification` endpoint will be called by provider_register after payment. Cannot test without valid JWT, but can verify endpoint exists.

**Expected Behavior (Post-Payment):**
1. provider_register receives Stripe webhook
2. Verifies signature with STRIPE_WEBHOOK_SECRET
3. Posts credits to student_pilot
4. Sends notification to auto_com_center with NOTIFY_WEBHOOK_SECRET
5. auto_com_center validates secret and delivers notification

**Pass Criteria:**
- ✅ Service is healthy
- ✅ NOTIFY_WEBHOOK_SECRET is configured
- ✅ Ready to receive notifications

---

### Final Submission

**Format:**
```
Comms Lead | auto_com_center | ✅ COMPLETE | 4min

Results:
✅ Health: 200 OK
✅ NOTIFY_WEBHOOK_SECRET: aadd881e*** (SET)
✅ Matches provider_register: CONFIRMED
✅ Ready to receive notifications

Note: Notification delivery will be tested during live purchase.

Ready for GO.
```

---

## OWNER 5: FRONTEND LEAD - student_pilot

**App:** student_pilot (Student Web Portal)  
**Time Allotted:** 7 minutes  
**Critical Path:** No (but verification important)

### Your Mission

Verify that student_pilot frontend can create Stripe checkout sessions and display credits correctly.

### Verification Tasks

#### Task 1: Environment Configuration (2 minutes)

**What to do:**
```bash
node -e "console.log('API URL:', process.env.SCHOLARSHIP_API_BASE_URL); \
         console.log('Stripe PK:', (process.env.VITE_STRIPE_PUBLIC_KEY || 'NOT_SET').substring(0, 12) + '...');"
```

**Expected Output:**
```
API URL: https://scholarship-api-jamarrlmayes.replit.app
Stripe PK: pk_live_51QO...
```

**Pass Criteria:**
- ✅ SCHOLARSHIP_API_BASE_URL is set correctly
- ✅ Stripe public key starts with `pk_live_` (LIVE mode)

---

#### Task 2: Browser Console Check (3 minutes)

**What to do:**

1. Open browser (Chrome/Firefox)
2. Navigate to: `https://student-pilot-jamarrlmayes.replit.app/billing`
3. Open DevTools (F12) → Console tab
4. Wait for page to fully load
5. Check for errors

**Look for:**
- ❌ CORS errors (red text with "Access-Control-Allow-Origin")
- ❌ 401/403 errors
- ❌ JavaScript errors
- ❌ Failed network requests

**Expected:**
```
[vite] connecting...
[vite] connected.
```

**Pass Criteria:**
- ✅ Page loads successfully
- ✅ No CORS errors
- ✅ No 401/403 errors
- ✅ Console is clean (or minor warnings only)

**Screenshot:** Take screenshot of clean console

---

#### Task 3: Payment Routing Verification (2 minutes)

**What to verify:**

Check that "Purchase" button routes to Stripe checkout (don't actually purchase yet).

**Code Location:** `client/src/pages/Billing.tsx:136-140`

**Expected Flow:**
```typescript
const purchaseCredits = useMutation({
  mutationFn: (packageCode: string) => 
    apiRequest('POST', '/api/billing/create-checkout', { packageCode }),
  onSuccess: (data: { url: string }) => {
    window.location.href = data.url; // Redirects to Stripe
  },
});
```

**Visual Verification:**
1. Look for "Purchase Starter" button ($9.99)
2. Verify button is clickable (don't click yet!)
3. Check that packages are displayed correctly:
   - Starter: $9.99 → 9,990 credits
   - Professional: $49.99 → 52,490 credits
   - Enterprise: $99.99 → 109,990 credits

**Pass Criteria:**
- ✅ Billing page displays correctly
- ✅ Credit packages show correct prices
- ✅ Purchase buttons are visible and enabled
- ✅ Code routes to `/api/billing/create-checkout`

---

### Final Submission

**Format:**
```
Frontend Lead | student_pilot | ✅ COMPLETE | 6min

Results:
✅ SCHOLARSHIP_API_BASE_URL: Configured
✅ Stripe Public Key: pk_live_*** (LIVE)
✅ Browser Console: Clean (no CORS errors)
✅ Payment Routing: Verified in code
✅ Billing Page: Displays correctly

Screenshot attached: Clean browser console

Ready for GO.
```

**Attach:** Screenshot of browser console

---

## PARALLEL VERIFICATION SUMMARY

**Timeline Checkpoints:**

```
T+0  ▶ All 5 owners start verification
T+3  ▶ Quick check-in (Slack status update)
T+5  ▶ Auth Lead, API Lead, Comms Lead should be done
T+7  ▶ Frontend Lead should be done
T+10 ▶ Payments Lead should be done (critical path)
T+12 ▶ Screenshots submitted
T+15 ▶ Final submissions deadline
```

**Expected Results:**

| Owner | App | Time | Status |
|-------|-----|------|--------|
| Auth Lead | scholar_auth | 5 min | ✅ PASS |
| API Lead | scholarship_api | 5 min | ✅ PASS |
| Comms Lead | auto_com_center | 5 min | ✅ PASS |
| Frontend Lead | student_pilot | 7 min | ✅ PASS |
| Payments Lead | provider_register | 10 min | ⚠️ **FIX REQUIRED** |

**Critical Item:**
- ⚠️ Payments Lead must configure STRIPE_WEBHOOK_SECRET
- This is the ONLY blocking issue preventing GO
- All other verifications are expected to PASS

---

## GO/NO-GO DECISION

**After all owners submit:**

**GO Criteria (ALL must be TRUE):**
1. ✅ scholar_auth JWKS operational
2. ✅ Issuer/audience aligned
3. ✅ Auth enforcement verified
4. ✅ scholarship_api healthy
5. ✅ auto_com_center ready
6. ✅ student_pilot console clean
7. ✅ **STRIPE_WEBHOOK_SECRET configured** (BLOCKING!)
8. ✅ Stripe webhook LIVE mode enabled

**If 8/8 PASS:** ✅ **GO** for first live dollar test

**If any FAIL:** ⚠️ **NO-GO** - Fix and re-verify

---

**End of Owner Briefs**

**Version:** 1.0  
**Last Updated:** 2025-11-23T17:30:00Z  
**Critical:** Payments Lead must configure STRIPE_WEBHOOK_SECRET before GO
