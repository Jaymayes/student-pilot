# SECURITY-CORRECTED GO CHECKLIST
**CEO Directive:** Conditional GO - Immediate secret rotation required  
**Status:** ⚠️ BLOCKED - Awaiting security verification  
**Mission Clock:** PAUSED until GO confirmation

---

## 🔴 CRITICAL SECURITY DIRECTIVE

**All NOTIFY_WEBHOOK_SECRET values previously posted in chat are considered COMPROMISED.**

You must generate a NEW secret offline and set it before proceeding.

---

## ✅ PRE-FLIGHT CHECKLIST (T+0 to T+15)

### 1. Generate NEW NOTIFY_WEBHOOK_SECRET (Offline - Never in Chat)

**Action:**
```bash
# On your local machine (NOT in Replit chat):
openssl rand -base64 48
```

**Or use:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**Or any secure password generator:**
- Minimum 32 characters
- Cryptographically random
- Base64 or base64url encoded

**⚠️ DO NOT paste this value in chat or screenshots**

---

### 2. Set NEW Secret in auto_com_center

**Steps:**
1. Open auto_com_center Repl
2. Click "Secrets" tab (🔐 icon)
3. Find `NOTIFY_WEBHOOK_SECRET` (if exists, update it)
4. Paste your NEW offline-generated value
5. Click "Save" (app will auto-restart)

**Verify:**
- Secret shows as "Set" (value hidden)
- App restarts successfully

---

### 3. Set SAME Secret in provider_register

**Steps:**
1. Open provider_register Repl
2. Click "Secrets" tab (🔐 icon)
3. Find `NOTIFY_WEBHOOK_SECRET` (if exists, update it)
4. Paste the SAME NEW value from Step 1
5. Click "Save" (app will auto-restart)

**Verify:**
- Secret shows as "Set" (value hidden)
- App restarts successfully
- **CRITICAL:** Value must be IDENTICAL to auto_com_center

---

### 4. Verify Stripe LIVE Mode in provider_register

**Check these secrets in provider_register:**

| Secret | Required Value | How to Verify |
|--------|---------------|---------------|
| `STRIPE_SECRET_KEY` | Must start with `sk_live_` | Check first 8 chars |
| `STRIPE_WEBHOOK_SECRET` | Must be from LIVE endpoint | Check Stripe Dashboard |

**⚠️ If you see `sk_test_` instead of `sk_live_`:**
1. Go to Stripe Dashboard → API Keys
2. Copy the "Secret key" from LIVE mode (NOT Test mode)
3. Update `STRIPE_SECRET_KEY` in provider_register
4. Restart the app

**Webhook Configuration:**
1. Go to Stripe Dashboard → Webhooks
2. Verify endpoint: `https://provider-register-jamarrlmayes.replit.app/stripe/webhook`
3. Verify events enabled:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy signing secret (starts with `whsec_`)
5. Set as `STRIPE_WEBHOOK_SECRET` in provider_register

---

### 5. Verify Stripe LIVE Mode in student_pilot

**Check this environment variable in student_pilot:**

| Variable | Required Value | How to Verify |
|----------|---------------|---------------|
| `VITE_STRIPE_PUBLIC_KEY` | Must start with `pk_live_` | Check Webview → DevTools |

**⚠️ If you see `pk_test_` instead of `pk_live_`:**
1. Go to Stripe Dashboard → API Keys
2. Copy the "Publishable key" from LIVE mode (NOT Test mode)
3. Set as environment variable `VITE_STRIPE_PUBLIC_KEY` in student_pilot
4. Restart the app

---

### 6. Verify Base URL Configuration

**Ensure these are set correctly across all services:**

**provider_register:**
- `AUTO_COM_CENTER_BASE_URL` = `https://auto-com-center-jamarrlmayes.replit.app`
- `SCHOLAR_AUTH_BASE_URL` = `https://scholar-auth-jamarrlmayes.replit.app`
- `AUTH_JWKS_URL` = `https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json`

**scholarship_api:**
- `AUTH_JWKS_URL` = `https://scholar-auth-jamarrlmayes.replit.app/.well-known/jwks.json`
- `AUTH_ISSUER` = `https://scholar-auth-jamarrlmayes.replit.app`

**student_pilot:**
- `SCHOLARSHIP_API_BASE_URL` = `https://scholarship-api-jamarrlmayes.replit.app`
- `AUTO_COM_CENTER_BASE_URL` = `https://auto-com-center-jamarrlmayes.replit.app`
- `SCHOLAR_AUTH_BASE_URL` = `https://scholar-auth-jamarrlmayes.replit.app`

---

## ✅ VERIFICATION STEPS (T+15 to T+30)

### When you've completed steps 1-6, reply with:

```
GO - Checklist complete:
✓ New NOTIFY_WEBHOOK_SECRET generated offline and set
✓ Same secret in auto_com_center and provider_register
✓ Stripe LIVE mode verified in provider_register (sk_live_...)
✓ Stripe LIVE mode verified in student_pilot (pk_live_...)
✓ Webhook configured in Stripe Dashboard
✓ Base URLs aligned across all services
```

**Then I will:**
1. Smoke test auto_com_center with rotated secret
2. Run health checks on all services
3. Clear you for live purchase execution

---

## 🔒 SECURITY GUARDRAILS

**Never share in chat:**
- NOTIFY_WEBHOOK_SECRET value
- STRIPE_SECRET_KEY value
- STRIPE_WEBHOOK_SECRET value
- Any other API keys or secrets

**What's safe to share:**
- Confirmation that secrets are "Set"
- First 8 characters of Stripe keys (e.g., "sk_live_", "pk_live_")
- URLs and service endpoints
- Health check results
- Error messages (PII-free)

**Security best practices enforced:**
- All secrets in Replit Account Secrets (encrypted at rest)
- Rotation schedule: Immediate (compromised), then 90-day cycle
- CORS restricted to ecosystem origins only
- JWT verification on all non-public endpoints
- No PII in logs or webhooks

---

## 🚫 NO-GO CONDITIONS

**Do NOT proceed if:**
- Stripe still shows Test mode (`sk_test_`, `pk_test_`)
- NOTIFY_WEBHOOK_SECRET not rotated to fresh value
- Webhook endpoint returning 4xx/5xx
- scholarship_api ledger not accessible
- Health checks failing on any service

**If any NO-GO condition exists:**
1. Stop immediately
2. Document the blocker
3. Request troubleshooting assistance
4. Do NOT execute live purchase

---

## ✅ GO CONDITIONS

**Proceed when ALL of these are true:**
- ✓ New NOTIFY_WEBHOOK_SECRET generated offline
- ✓ Same secret set in auto_com_center AND provider_register
- ✓ Stripe LIVE mode confirmed (sk_live_, pk_live_)
- ✓ Webhook configured in Stripe Dashboard
- ✓ Base URLs aligned
- ✓ All health checks green
- ✓ Smoke test passes

---

## 📊 CURRENT STATUS

**Awaiting your confirmation:**

```
Checklist Status:
[ ] 1. New NOTIFY_WEBHOOK_SECRET generated offline
[ ] 2. Secret set in auto_com_center
[ ] 3. Secret set in provider_register
[ ] 4. Stripe LIVE verified in provider_register (sk_live_)
[ ] 5. Stripe LIVE verified in student_pilot (pk_live_)
[ ] 6. Webhook configured in Stripe Dashboard
[ ] 7. Base URLs verified across services
```

**When all 7 items are checked, reply "GO" to proceed.**

---

## 🎯 WHAT HAPPENS AFTER "GO"

**Timeline (45 minutes):**

```
T+15 min: Agent smoke tests auto_com_center
T+20 min: Agent verifies all health endpoints
T+25 min: CEO executes $9.99 live purchase
T+30 min: Agent verifies credits posted
T+35 min: Agent verifies ledger entry
T+40 min: Agent collects evidence bundle
T+50 min: Agent generates status reports
T+60 min: Mission complete - evidence delivered
```

**Evidence to be collected:**
1. Stripe Dashboard screenshot (live charge succeeded)
2. student_pilot screenshot (9,990 credits visible)
3. scholarship_api ledger JSON (JWT-protected)
4. KPIs: Time-to-First-Dollar, webhook success rate, P95 latency

---

## 🔴 NEXT STEP: YOUR ACTION

**Complete the 7-item checklist above, then reply:**

```
GO - Checklist complete
```

**I will then:**
1. Start 60-minute mission clock
2. Execute smoke tests
3. Clear you for live purchase
4. Collect all evidence automatically

---

**Mission Status:** ⚠️ PAUSED - Awaiting security verification  
**Next Update:** After you reply "GO"

---

## 📄 RELATED DOCUMENTATION

- CEO_GO_NO_GO_DECISION.md (355 lines) - Original decision framework
- SECRETS_AND_ENDPOINTS_AUDIT.md (475 lines) - Service audit results
- LIVE_PURCHASE_INSTRUCTIONS.md (303 lines) - Purchase execution guide

---

**Waiting for your "GO" confirmation...**
