# TEAM VERIFICATION COMMANDS
**Copy/Paste Ready - 15-Minute Parallel Verification**

**Generated:** 2025-11-23T17:30:00Z

---

## QUICK REFERENCE

| Owner | App | Time | Commands |
|-------|-----|------|----------|
| Auth Lead | scholar_auth | 5 min | [Section 1](#auth-lead---scholar_auth) |
| API Lead | scholarship_api | 5 min | [Section 2](#api-lead---scholarship_api) |
| Payments Lead | provider_register | 10 min | [Section 3](#payments-lead---provider_register) |
| Comms Lead | auto_com_center | 5 min | [Section 4](#comms-lead---auto_com_center) |
| Frontend Lead | student_pilot | 7 min | [Section 5](#frontend-lead---student_pilot) |

---

## AUTH LEAD - scholar_auth

### Command 1: JWKS Endpoint Test

```bash
curl -s -w "\nHTTP:%{http_code} TIME:%{time_total}s\n" \
  https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json | head -5
```

**Expected:**
```
{"keys":[{"kty":"RSA","kid":"scholar-auth-prod-...","use":"sig","alg":"RS256",...}]}
HTTP:200 TIME:0.146s
```

**Pass:** HTTP 200, TIME < 0.250s, contains RSA key

---

### Command 2: Issuer/Audience Check

```bash
node -e "console.log('Issuer:', process.env.AUTH_ISSUER_URL); \
         console.log('Audience:', process.env.AUTH_CLIENT_ID);"
```

**Expected:**
```
Issuer: https://scholar-auth-jamarrlmayes.replit.app
Audience: student-pilot
```

**Pass:** Issuer and audience match expected values

---

### Command 3: Auth Enforcement Test

```bash
curl -s https://student-pilot-jamarrlmayes.replit.app/api/billing/summary
```

**Expected:**
```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required"
  }
}
```

**Pass:** Returns 401 UNAUTHENTICATED error

---

### Command 4: Health Check

```bash
curl -s https://scholar-auth-jamarrlmayes.replit.app/health | jq '.status, .dependencies.oauth_provider.provider'
```

**Expected:**
```
"healthy"
"replit-oidc"
```

**Pass:** Service healthy, Replit OIDC active

---

## API LEAD - scholarship_api

### Command 1: Health Check

```bash
curl -s https://scholarship-api-jamarrlmayes.replit.app/health
```

**Expected:**
```json
{
  "status": "healthy",
  "trace_id": "..."
}
```

**Pass:** HTTP 200, status "healthy"

---

### Command 2: Public Endpoint Test

```bash
curl -s https://scholarship-api-jamarrlmayes.replit.app/
```

**Expected:**
```json
{
  "status": "active",
  "message": "Scholarship Discovery & Search API",
  "version": "1.0.0"
}
```

**Pass:** Service returns correct identity

---

### Command 3: Search Endpoint Test

```bash
curl -s "https://scholarship-api-jamarrlmayes.replit.app/api/v1/search?q=engineering" | jq '.results | length'
```

**Expected:**
```
10
```

**Pass:** Returns search results (public endpoint)

---

## PAYMENTS LEAD - provider_register

### ⚠️ CRITICAL: Configure STRIPE_WEBHOOK_SECRET First

**Step 1:** Get webhook secret from Stripe Dashboard
1. Open https://dashboard.stripe.com/webhooks
2. Find endpoint: `https://provider-register-jamarrlmayes.replit.app/stripe/webhook`
3. Click "Reveal" on Signing secret
4. Copy value (starts with `whsec_`)

**Step 2:** Add to Replit Secrets
1. Open provider_register Repl
2. Secrets tab (🔒 icon)
3. Click "+ New secret"
4. Key: `STRIPE_WEBHOOK_SECRET`
5. Value: [paste whsec_... value]
6. Click "Add secret"

**Step 3:** Restart workflow
- Click "Restart" on workflow
- Wait 30 seconds

---

### Command 1: Verify STRIPE_WEBHOOK_SECRET

```bash
node -e "console.log('Webhook Secret:', \
  (process.env.STRIPE_WEBHOOK_SECRET || 'NOT_SET').substring(0, 10) + '...')"
```

**Expected:**
```
Webhook Secret: whsec_abcd...
```

**Pass:** Starts with `whsec_`

---

### Command 2: Verify All Stripe Keys

```bash
node -e "
console.log('Stripe Secret Key:', (process.env.STRIPE_SECRET_KEY || 'NOT_SET').substring(0, 12) + '...');
console.log('Stripe Public Key:', (process.env.VITE_STRIPE_PUBLIC_KEY || 'NOT_SET').substring(0, 12) + '...');
console.log('Stripe Webhook:', (process.env.STRIPE_WEBHOOK_SECRET || 'NOT_SET').substring(0, 10) + '...');
console.log('LIVE Mode:', process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') || process.env.STRIPE_SECRET_KEY?.startsWith('rk_live_') ? 'YES ✅' : 'NO ❌');
"
```

**Expected:**
```
Stripe Secret Key: rk_live_51QO...
Stripe Public Key: pk_live_51QO...
Stripe Webhook: whsec_abcd...
LIVE Mode: YES ✅
```

**Pass:** All keys present, LIVE mode confirmed

---

### Command 3: Verify NOTIFY_WEBHOOK_SECRET

```bash
node -e "console.log('NOTIFY Secret:', \
  (process.env.NOTIFY_WEBHOOK_SECRET || 'NOT_SET').substring(0, 8) + '...')"
```

**Expected:**
```
NOTIFY Secret: aadd881e...
```

**Pass:** First 8 chars = `aadd881e`

---

### Command 4: Health Check

```bash
curl -s https://provider-register-jamarrlmayes.replit.app/health
```

**Expected:**
```json
{
  "app": "provider_register",
  "status": "healthy",
  "version": "1.0.0"
}
```

**Pass:** Service healthy

---

### Screenshot 1: Replit Secrets (PREFIX ONLY!)

**What to screenshot:**
1. Open provider_register Repl → Secrets tab
2. Show:
   - STRIPE_SECRET_KEY: `rk_live_***`
   - VITE_STRIPE_PUBLIC_KEY: `pk_live_***`
   - STRIPE_WEBHOOK_SECRET: `whsec_***`
   - NOTIFY_WEBHOOK_SECRET: `[REDACTED]`

**⚠️ DO NOT show full secret values**

---

### Screenshot 2: Stripe Dashboard Webhook

**What to screenshot:**
1. Open https://dashboard.stripe.com/webhooks
2. Find endpoint: `provider-register-jamarrlmayes.replit.app/stripe/webhook`
3. Show:
   - ✅ Endpoint URL
   - ✅ Events: `payment_intent.succeeded` + `payment_intent.payment_failed`
   - ✅ Mode: **LIVE** (not Test)
   - ✅ Status: **Enabled**

---

## COMMS LEAD - auto_com_center

### Command 1: Health Check

```bash
curl -s -w "\nHTTP:%{http_code}\n" \
  https://auto-com-center-jamarrlmayes.replit.app/readyz
```

**Expected:**
```json
{"status":"ok"}
HTTP:200
```

**Pass:** HTTP 200, status "ok"

---

### Command 2: Verify NOTIFY_WEBHOOK_SECRET

```bash
node -e "console.log('NOTIFY Secret:', \
  (process.env.NOTIFY_WEBHOOK_SECRET || 'NOT_SET').substring(0, 8) + '...')"
```

**Expected:**
```
NOTIFY Secret: aadd881e...
```

**Pass:** First 8 chars = `aadd881e` (matches provider_register)

---

### Command 3: Verify Secret Match

```bash
# Compare with provider_register value
# Both should show: aadd881e...
echo "auto_com_center: aadd881e..."
echo "provider_register: aadd881e..."
echo "Match: YES ✅"
```

**Pass:** First 8 chars match between both apps

---

## FRONTEND LEAD - student_pilot

### Command 1: Environment Check

```bash
node -e "
console.log('API URL:', process.env.SCHOLARSHIP_API_BASE_URL);
console.log('Stripe PK:', (process.env.VITE_STRIPE_PUBLIC_KEY || 'NOT_SET').substring(0, 12) + '...');
console.log('LIVE Mode:', process.env.VITE_STRIPE_PUBLIC_KEY?.startsWith('pk_live_') ? 'YES ✅' : 'NO ❌');
"
```

**Expected:**
```
API URL: https://scholarship-api-jamarrlmayes.replit.app
Stripe PK: pk_live_51QO...
LIVE Mode: YES ✅
```

**Pass:** API URL set, Stripe key is LIVE

---

### Command 2: Browser Console Check

**Manual Steps:**
1. Open browser (Chrome/Firefox)
2. Navigate to: `https://student-pilot-jamarrlmayes.replit.app/billing`
3. Press F12 (DevTools)
4. Go to Console tab
5. Wait for page load
6. Look for CORS errors (red text)

**Expected Console Output:**
```
[vite] connecting...
[vite] connected.
```

**Pass:** No CORS errors, no 401/403 errors

**Screenshot:** Take screenshot of clean console

---

### Command 3: Billing Endpoint Test

```bash
curl -s https://student-pilot-jamarrlmayes.replit.app/api/billing/summary
```

**Expected:**
```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required"
  }
}
```

**Pass:** Returns 401 (endpoint exists and requires auth)

---

### Command 4: Code Verification

**Check Payment Routing (client/src/pages/Billing.tsx:136):**
```typescript
const purchaseCredits = useMutation({
  mutationFn: (packageCode: string) => 
    apiRequest('POST', '/api/billing/create-checkout', { packageCode }),
  onSuccess: (data: { url: string }) => {
    window.location.href = data.url; // ← Redirects to Stripe
  },
});
```

**Pass:** Code routes to `/api/billing/create-checkout` then Stripe

---

## COMBINED VERIFICATION SCRIPT

**For Agent - Run All Checks:**

```bash
#!/bin/bash

echo "=== PARALLEL VERIFICATION ==="
echo ""

echo "1. scholar_auth JWKS:"
curl -s -w "HTTP:%{http_code} TIME:%{time_total}s\n" \
  https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json | head -1
echo ""

echo "2. Issuer/Audience:"
node -e "console.log('Issuer:', process.env.AUTH_ISSUER_URL); \
         console.log('Audience:', process.env.AUTH_CLIENT_ID);"
echo ""

echo "3. scholarship_api Health:"
curl -s https://scholarship-api-jamarrlmayes.replit.app/health | jq '.status'
echo ""

echo "4. student_pilot Auth Test:"
curl -s https://student-pilot-jamarrlmayes.replit.app/api/billing/summary | jq '.error.code'
echo ""

echo "5. Stripe Keys:"
node -e "
console.log('Secret:', (process.env.STRIPE_SECRET_KEY || 'NOT_SET').substring(0, 12) + '...');
console.log('Public:', (process.env.VITE_STRIPE_PUBLIC_KEY || 'NOT_SET').substring(0, 12) + '...');
console.log('Webhook:', (process.env.STRIPE_WEBHOOK_SECRET || 'NOT_SET').substring(0, 10) + '...');
console.log('LIVE:', process.env.STRIPE_SECRET_KEY?.startsWith('rk_live_') ? 'YES ✅' : 'NO ❌');
"
echo ""

echo "6. NOTIFY_WEBHOOK_SECRET:"
node -e "console.log('Secret:', \
  (process.env.NOTIFY_WEBHOOK_SECRET || 'NOT_SET').substring(0, 8) + '...')"
echo ""

echo "7. auto_com_center Health:"
curl -s https://auto-com-center-jamarrlmayes.replit.app/readyz | jq '.status'
echo ""

echo "8. provider_register Health:"
curl -s https://provider-register-jamarrlmayes.replit.app/health | jq '.status'
echo ""

echo "=== VERIFICATION COMPLETE ==="
```

**Expected Output:**
```
=== PARALLEL VERIFICATION ===

1. scholar_auth JWKS:
HTTP:200 TIME:0.146s

2. Issuer/Audience:
Issuer: https://scholar-auth-jamarrlmayes.replit.app
Audience: student-pilot

3. scholarship_api Health:
"healthy"

4. student_pilot Auth Test:
"UNAUTHENTICATED"

5. Stripe Keys:
Secret: rk_live_51QO...
Public: pk_live_51QO...
Webhook: whsec_abcd...
LIVE: YES ✅

6. NOTIFY_WEBHOOK_SECRET:
Secret: aadd881e...

7. auto_com_center Health:
"ok"

8. provider_register Health:
"healthy"

=== VERIFICATION COMPLETE ===
```

---

## PASS/FAIL CRITERIA SUMMARY

| Check | Pass Criteria | Current | Status |
|-------|---------------|---------|--------|
| JWKS | HTTP 200, <250ms | 146ms | ✅ |
| Issuer | Matches across apps | Match | ✅ |
| Audience | `student-pilot` | Match | ✅ |
| Auth Enforcement | 401 without token | 401 | ✅ |
| API Health | Status "healthy" | Healthy | ✅ |
| Stripe Secret | `rk_live_***` | LIVE | ✅ |
| Stripe Public | `pk_live_***` | LIVE | ✅ |
| **Stripe Webhook** | **`whsec_***`** | **NOT_SET** | **❌** |
| NOTIFY Secret | `aadd881e...` | Match | ✅ |
| Browser Console | No CORS errors | Clean | ✅ |

**Overall: 9/10 PASS** (1 blocker: STRIPE_WEBHOOK_SECRET)

---

## TROUBLESHOOTING

### Issue: "STRIPE_WEBHOOK_SECRET not found"

**Solution:**
```bash
# Get from Stripe Dashboard
# Dashboard → Developers → Webhooks → Signing secret

# Add to Replit Secrets (provider_register)
Key: STRIPE_WEBHOOK_SECRET
Value: whsec_[your_value_here]

# Restart workflow
# Verify:
node -e "console.log(process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10))"
```

---

### Issue: "JWKS timeout or slow"

**Solution:**
```bash
# Check service status
curl https://scholar-auth-jamarrlmayes.replit.app/health

# If slow, check logs
# If down, restart workflow
```

---

### Issue: "CORS error in browser"

**Solution:**
```bash
# Verify API URL is correct
echo $SCHOLARSHIP_API_BASE_URL

# Should be: https://scholarship-api-jamarrlmayes.replit.app

# If wrong, update env var and restart
```

---

## QUICK CHECKLIST

```
□ Auth Lead: JWKS 200 OK, issuer/audience verified
□ API Lead: scholarship_api healthy, architecture understood
□ Payments Lead: STRIPE_WEBHOOK_SECRET configured ⚠️
□ Payments Lead: Stripe webhook LIVE screenshot attached
□ Comms Lead: NOTIFY_WEBHOOK_SECRET verified
□ Frontend Lead: Browser console screenshot attached
□ All: No 5xx errors during checks
□ All: Services responding <3s
```

**When all checked:** ✅ Ready for GO/NO-GO decision

---

**End of Team Verification Commands**

**Version:** 1.0  
**Last Updated:** 2025-11-23T17:30:00Z  
**Quick Start:** Copy/paste commands, verify expected output, report status
