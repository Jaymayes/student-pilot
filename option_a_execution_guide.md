# OPTION A EXECUTION GUIDE
**28-Minute Playbook: Parallel Verification → First Live Dollar**

**Generated:** 2025-11-23T17:30:00Z  
**Mission:** Validate end-to-end revenue flow with live $9.99 purchase  
**Method:** 15-minute parallel verification + 13-minute live test

---

## EXECUTIVE SUMMARY

**Objective:** Validate complete payment flow from Stripe checkout → webhook → credit ledger → notification

**Total Time:** 28 minutes
- **Phase 1:** Parallel verification (15 minutes)
- **Phase 2:** GO/NO-GO decision (2 minutes)
- **Phase 3:** Live dollar test (13 minutes)

**Success Criteria:** 
- $9.99 payment processed
- 9,990 credits posted to ledger
- Notification delivered
- Evidence bundle captured

---

## TEAM STRUCTURE

### Owner Assignments

| Owner | App | Responsibility | Time |
|-------|-----|----------------|------|
| **Auth Lead** | scholar_auth | IdP verification | 5 min |
| **API Lead** | scholarship_api | Protected endpoints | 5 min |
| **Payments Lead** | provider_register | Stripe LIVE config | 10 min |
| **Comms Lead** | auto_com_center | Notification readiness | 5 min |
| **Frontend Lead** | student_pilot | Checkout flow | 7 min |

### Communication Protocol

**Slack Channel:** #first-dollar-sprint  
**Reporting Format:**
```
[OWNER] [APP_NAME] [STATUS] [TIME]
Auth Lead | scholar_auth | ✅ PASS | 4min
```

**Escalation:** Any blocker → tag @CEO immediately

---

## PHASE 1: PARALLEL VERIFICATION (15 Minutes)

**Starts:** T+0  
**Ends:** T+15  
**Goal:** All 5 apps verified against GO criteria

### Timeline

```
T+0:  All owners start in parallel
T+5:  Quick check-in (30 seconds)
T+10: Status update (30 seconds)
T+15: Final submission deadline
```

### Owner Tasks (See owner_briefs_parallel_verification.md for details)

#### Auth Lead - scholar_auth (5 minutes)

**Verify:**
1. JWKS endpoint returns 200 with <250ms latency
2. Issuer/audience values documented
3. Protected endpoint shows 401 without token

**Pass Criteria:**
- ✅ JWKS operational
- ✅ Issuer: `https://scholar-auth-jamarrlmayes.replit.app`
- ✅ Audience: `student-pilot`
- ✅ Auth enforcement verified

**Commands:** See team_verification_commands.md

---

#### API Lead - scholarship_api (5 minutes)

**Verify:**
1. Health endpoint returns 200
2. Protected endpoint returns 401 without auth
3. Credit ledger endpoints identified (Note: in student_pilot)

**Pass Criteria:**
- ✅ Service healthy
- ✅ Protected endpoints enforced
- ✅ Architecture understood (search API, ledger in student_pilot)

**Commands:** See team_verification_commands.md

---

#### Payments Lead - provider_register (10 minutes) **CRITICAL PATH**

**Verify:**
1. ⚠️ **STRIPE_WEBHOOK_SECRET configured (BLOCKING!)**
2. Stripe LIVE keys present (sk_live_ or rk_live_)
3. Stripe Dashboard webhook configured for LIVE mode
4. NOTIFY_WEBHOOK_SECRET present

**Pass Criteria:**
- ✅ STRIPE_SECRET_KEY: `rk_live_***`
- ✅ VITE_STRIPE_PUBLIC_KEY: `pk_live_***`
- ✅ **STRIPE_WEBHOOK_SECRET: `whsec_***`** (MUST ADD)
- ✅ NOTIFY_WEBHOOK_SECRET: SET
- ✅ Stripe webhook: LIVE endpoint enabled

**Screenshots Required:**
1. Replit Secrets tab (prefixes only, NOT full values)
2. Stripe Dashboard webhook (LIVE mode, correct events)

**Commands:** See team_verification_commands.md

---

#### Comms Lead - auto_com_center (5 minutes)

**Verify:**
1. Health endpoint returns 200
2. NOTIFY_WEBHOOK_SECRET configured
3. Matches provider_register (first 8 chars: `aadd881e`)

**Pass Criteria:**
- ✅ Service healthy
- ✅ NOTIFY_WEBHOOK_SECRET: SET
- ✅ First 8 chars match provider_register

**Commands:** See team_verification_commands.md

---

#### Frontend Lead - student_pilot (7 minutes)

**Verify:**
1. SCHOLARSHIP_API_BASE_URL configured
2. Browser console clean (no CORS errors at /billing)
3. Payment flow routes to Stripe checkout
4. Stripe LIVE public key configured

**Pass Criteria:**
- ✅ SCHOLARSHIP_API_BASE_URL: `https://scholarship-api-jamarrlmayes.replit.app`
- ✅ No CORS errors in browser console
- ✅ Payment routing verified in code
- ✅ Stripe public key: `pk_live_***`

**Commands:** See team_verification_commands.md

---

## PHASE 2: GO/NO-GO DECISION (2 Minutes)

**Starts:** T+15  
**Ends:** T+17  
**Decision Maker:** CEO

### GO Criteria (All Must Be TRUE)

| # | Criterion | Current Status | Blocker |
|---|-----------|----------------|---------|
| 1 | JWT issuer/audience aligned | ✅ PASS | None |
| 2 | scholarship_api CORS (no wildcard) | ✅ PASS | None |
| 3 | provider_register Stripe LIVE keys | ✅ PASS | None |
| 4 | provider_register STRIPE_WEBHOOK_SECRET | ❌ **FAIL** | **NOT SET** |
| 5 | provider_register Stripe LIVE webhook | ❓ UNKNOWN | Screenshot needed |
| 6 | NOTIFY_WEBHOOK_SECRET match | ✅ PASS | None |
| 7 | student_pilot checkout routing | ✅ PASS | None |
| 8 | student_pilot no CORS errors | ✅ PASS | None |

### Current Decision: ⚠️ CONDITIONAL NO-GO

**Blocking Issue:** STRIPE_WEBHOOK_SECRET not configured

**Fast Fix (2 minutes):**
1. Payments Lead: Get webhook secret from Stripe Dashboard
2. Add to provider_register Secrets as STRIPE_WEBHOOK_SECRET
3. Restart provider_register workflow
4. Verify with command: `node -e "console.log('Webhook:', (process.env.STRIPE_WEBHOOK_SECRET || 'NOT_SET').substring(0, 10))"`

**After Fix:** ✅ GO

### NO-GO Triggers (Auto-Abort)

If ANY of these are found, **STOP immediately:**
- ❌ Stripe keys start with `sk_test_` or `pk_test_` (TEST mode)
- ❌ STRIPE_WEBHOOK_SECRET missing or not starting with `whsec_`
- ❌ Stripe webhook in TEST mode (not LIVE)
- ❌ scholarship_api CORS = `*` (wildcard)
- ❌ Issuer/audience mismatch between apps
- ❌ NOTIFY_WEBHOOK_SECRET mismatch

### Decision Documentation

**GO Decision Template:**
```
GO Decision Issued: [TIMESTAMP]
Decision Maker: [CEO NAME]
Verification Results: 8/8 PASS
Blocking Issues Resolved: STRIPE_WEBHOOK_SECRET configured
Risk Level: LOW
Proceed to Phase 3: APPROVED
```

**NO-GO Decision Template:**
```
NO-GO Decision Issued: [TIMESTAMP]
Decision Maker: [CEO NAME]
Blocking Issues: [LIST]
Resolution Required: [ACTIONS]
Re-verification Time: [ESTIMATE]
Status: PAUSED
```

---

## PHASE 3: LIVE DOLLAR TEST (13 Minutes)

**Starts:** T+17 (after GO issued)  
**Ends:** T+30  
**Executor:** CEO (or designated tester)

### Detailed Timeline

#### T+0-2 min: Navigate to Checkout

**Action:**
1. Open browser (Chrome/Firefox recommended)
2. Navigate to: `https://student-pilot-jamarrlmayes.replit.app/billing`
3. Wait for page load
4. Open DevTools (F12) → Console tab
5. Verify no errors

**Evidence:** Screenshot of clean console

---

#### T+2-5 min: Execute Purchase

**Action:**
1. Find "Starter Package" ($9.99 for 9,990 credits)
2. Click "Purchase Starter" button
3. Verify redirect to Stripe checkout page
4. **PAUSE** - Confirm Stripe checkout URL starts with `checkout.stripe.com`

**Stripe Test Card (if testing):**
```
Card Number: 4242 4242 4242 4242
Exp: 12/34
CVC: 123
ZIP: 12345
```

**OR use real card for LIVE test**

5. Fill payment details
6. Click "Pay"
7. Wait for processing (15-30 seconds)

**Evidence:** 
- Screenshot of Stripe checkout page
- Screenshot of payment confirmation

---

#### T+5-6 min: Verify Redirect

**Action:**
1. After payment success, verify redirect back to student_pilot
2. Should land on `/billing` or success page
3. Look for success message

**Expected:**
```
✅ Payment successful!
✅ 9,990 credits added to your account
```

**Evidence:** Screenshot of success message

---

#### T+6-7 min: Verify Credits Posted

**Action:**
1. Refresh billing page if needed
2. Check credit balance display
3. Expected: **9,990 credits**

**API Verification (Agent):**
```bash
curl -H "Cookie: [SESSION]" \
  https://student-pilot-jamarrlmayes.replit.app/api/billing/summary
```

**Expected Response:**
```json
{
  "currentBalance": 9990,
  "balanceCredits": 9990,
  "balanceUsd": 9.99
}
```

**Evidence:**
- Screenshot of credit balance
- JSON response from API

---

#### T+7-9 min: Verify Ledger Entry

**Action:**
1. Navigate to transaction history (or use API)
2. Find purchase entry

**API Verification (Agent):**
```bash
curl -H "Cookie: [SESSION]" \
  https://student-pilot-jamarrlmayes.replit.app/api/billing/ledger?limit=1
```

**Expected Response:**
```json
{
  "entries": [{
    "id": "...",
    "type": "purchase",
    "amount": 9990,
    "description": "Purchase: Starter package",
    "referenceType": "stripe_payment",
    "referenceId": "pi_...",
    "balanceAfter": 9990,
    "createdAt": "2025-11-23T..."
  }]
}
```

**Evidence:**
- Screenshot of transaction history
- JSON response with Stripe payment ID

---

#### T+9-11 min: Verify Stripe Payment

**Action:**
1. Open Stripe Dashboard → Payments
2. Find payment with ID from ledger entry
3. Verify status: Succeeded
4. Verify amount: $9.99

**Expected:**
- Payment ID: `pi_...`
- Amount: $9.99
- Status: Succeeded
- Customer email: [test user email]

**Evidence:**
- Screenshot of Stripe payment details

---

#### T+11-13 min: Verify Notification (Optional)

**Action:**
1. Check email inbox (or auto_com_center logs)
2. Look for payment confirmation email

**Evidence:**
- Screenshot of email (if received)
- OR auto_com_center logs showing notification sent

---

### Failure Scenarios

#### Scenario 1: Payment Fails at Stripe
**Symptoms:** Error on Stripe checkout page

**Actions:**
1. Screenshot error message
2. Check Stripe Dashboard → Events for error
3. Report to Payments Lead
4. **ABORT test** - Fix required

**Common Causes:**
- Stripe webhook not configured
- API keys in TEST mode
- Invalid payment method

---

#### Scenario 2: Credits Not Posted
**Symptoms:** Payment succeeds, but balance = 0

**Actions:**
1. Check provider_register logs for webhook errors
2. Verify STRIPE_WEBHOOK_SECRET is correct
3. Check auto_com_center for notification failures
4. Report to Payments Lead + Agent

**Common Causes:**
- STRIPE_WEBHOOK_SECRET mismatch
- Webhook signature verification failed
- Database error in student_pilot

**Recovery:**
1. Manually post credits via API (temporary)
2. Fix webhook configuration
3. Retest with $0.50 payment

---

#### Scenario 3: Redirect Fails
**Symptoms:** Payment succeeds, but stuck on Stripe page

**Actions:**
1. Manually navigate to student_pilot/billing
2. Check if credits posted (API call)
3. If credits posted → SUCCESS (redirect bug, not payment bug)
4. If no credits → Follow Scenario 2

---

## EVIDENCE BUNDLE COLLECTION

**See:** first_live_dollar_evidence_bundle.md for complete specification

**Required Artifacts:**

### 1. Payment Evidence
- Stripe payment ID
- Amount: $9.99
- Status: Succeeded
- Timestamp
- Customer email

### 2. Ledger Evidence
- Credit balance: 9,990
- Ledger entry with Stripe reference
- Transaction timestamp

### 3. API Evidence
```json
{
  "billing_summary": { "currentBalance": 9990 },
  "ledger_entry": { 
    "type": "purchase",
    "amount": 9990,
    "referenceId": "pi_..."
  },
  "stripe_payment": {
    "id": "pi_...",
    "amount": 999,
    "status": "succeeded"
  }
}
```

### 4. Screenshot Evidence
- Stripe checkout page
- Payment confirmation
- student_pilot credit balance
- Transaction history
- Stripe Dashboard payment

### 5. KPI Snapshot
```
CAC: $0 (organic test)
ARPU Baseline: $9.99
Conversion Rate: 100% (test)
Credits Posted: 9,990
Payment Latency: [X seconds]
Webhook Latency: [X ms]
Notification Delivery: [Success/Failure]
```

---

## POST-TEST ACTIONS

### Immediate (Within 1 Hour)

1. **Package Evidence Bundle**
   - Compile all screenshots
   - Export JSON responses
   - Create summary document
   - Share with CEO

2. **Submit Production Status Reports**
   - One per app (5 total)
   - Use production_status_report_template.md
   - Submit to CEO within 1 hour

3. **First Dollar Announcement**
   ```
   🎉 FIRST LIVE DOLLAR ACHIEVED
   
   Payment: $9.99 via Stripe
   Credits: 9,990 posted successfully
   Timestamp: [TIMESTAMP]
   Evidence: [LINK]
   
   Next: B2C engine activation + SEO expansion
   ```

### Same Day

1. **B2C Engine Activation**
   - Approve Auto Page Maker Phase 1 expansion
   - Target: 200-500 pages/day
   - Track "first document upload" as activation KPI

2. **Security Hardening**
   - Rotate NOTIFY_WEBHOOK_SECRET (compromised in chat)
   - Lock CORS to ecosystem origins only
   - Plan SOC 2 readiness track

3. **Reliability Improvements**
   - Add retries on webhook processing
   - Circuit breakers for inter-service calls
   - Enhanced monitoring and alerting

### Within 48 Hours

1. **API-as-Product Governance**
   - Each app owner files Production Status Report
   - Identify integration gaps
   - Document API contracts

2. **Growth Engine Prep**
   - SEO engine expansion approval
   - MAU tracking infrastructure
   - Conversion funnel instrumentation

---

## RISK MANAGEMENT

### Pre-Flight Checks

**Before starting Phase 1:**
- [ ] All 5 owners assigned and available
- [ ] Slack channel created (#first-dollar-sprint)
- [ ] Browser with DevTools ready
- [ ] Stripe Dashboard access verified
- [ ] Payment method ready (test card or real card)

### Known Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|---------|------------|
| STRIPE_WEBHOOK_SECRET not set | HIGH | CRITICAL | Fixed in Phase 2 |
| Webhook signature mismatch | MEDIUM | HIGH | Verify secret matches Stripe |
| Database write failure | LOW | HIGH | Test ledger endpoints first |
| Auth session timeout | MEDIUM | MEDIUM | Login before Phase 3 |
| Browser CORS error | LOW | MEDIUM | Verified in Phase 1 |

### Rollback Plan

**If test fails critically:**

1. **DO NOT retry immediately** - Understand failure first
2. Review logs:
   - provider_register webhook logs
   - student_pilot billing logs
   - auto_com_center notification logs
3. Fix identified issue
4. Retest with $0.50 payment
5. If $0.50 succeeds → Retry $9.99

**Stripe Refund (if needed):**
1. Open Stripe Dashboard → Payment
2. Click "Refund"
3. Amount: Full or partial
4. Reason: "Test payment"

---

## SUCCESS METRICS

### Primary KPIs

**First Dollar Metrics:**
- ✅ Payment processed: $9.99
- ✅ Credits posted: 9,990
- ✅ Ledger entry: Created with Stripe reference
- ✅ Notification: Delivered (optional)

**Performance KPIs:**
- Checkout session creation: < 2 seconds
- Payment processing: < 30 seconds
- Webhook processing: < 5 seconds
- Credit posting: < 2 seconds
- Total latency: < 45 seconds

**Reliability KPIs:**
- Webhook delivery: 100% (1/1)
- Credit posting accuracy: 100% (9,990 credits)
- Balance integrity: 100% (matches ledger)

### Secondary KPIs

**System Health:**
- All services: 200 OK during test
- No 5xx errors
- No database deadlocks
- No auth failures

**User Experience:**
- Redirect success: Yes
- Success message: Displayed
- Balance update: Immediate (<5s)
- No error messages

---

## TROUBLESHOOTING GUIDE

### Issue: "STRIPE_WEBHOOK_SECRET not set"

**Symptoms:** Phase 2 GO criteria #4 fails

**Solution:**
```bash
# 1. Get secret from Stripe Dashboard
# 2. Add to provider_register Secrets
# 3. Restart workflow
# 4. Verify
node -e "console.log('Webhook:', (process.env.STRIPE_WEBHOOK_SECRET || 'NOT_SET').substring(0, 10))"
```

**Time to Fix:** 2 minutes

---

### Issue: "Webhook signature verification failed"

**Symptoms:** Payment succeeds, credits not posted, provider_register logs show signature error

**Solution:**
```bash
# 1. Verify webhook secret matches Stripe
# 2. Check Stripe Dashboard → Webhooks → Signing secret
# 3. Compare first 10 chars
# 4. If mismatch, update STRIPE_WEBHOOK_SECRET
# 5. Retry payment
```

**Time to Fix:** 5 minutes

---

### Issue: "Credits posted but wrong amount"

**Symptoms:** Balance shows different value than expected (not 9,990)

**Solution:**
```bash
# 1. Check billing.ts CREDIT_PACKAGES
# 2. Verify starter package = 9,990 credits
# 3. Check ledger entry amount
# 4. If mismatch, investigate calculation logic
# 5. May require code fix + retest
```

**Time to Fix:** 30 minutes (requires code review)

---

### Issue: "Browser CORS error"

**Symptoms:** Console shows "Access-Control-Allow-Origin" error

**Solution:**
```bash
# 1. Check student_pilot CORS configuration
# 2. Verify API_BASE_URL is correct
# 3. Check scholarship_api CORS allowlist
# 4. Ensure student-pilot origin is allowed
# 5. Restart workflows
```

**Time to Fix:** 10 minutes

---

## DOCUMENT LINKS

- **Owner Briefs:** owner_briefs_parallel_verification.md
- **Verification Commands:** team_verification_commands.md
- **Evidence Bundle Spec:** first_live_dollar_evidence_bundle.md
- **Status Report Template:** production_status_report_template.md
- **GO/NO-GO Checklist:** go_no_go_decision_checklist.md
- **Quick Checklist:** quick_checklist.md

---

## APPENDIX A: Environment Configuration

**Current Production Values:**

```bash
# scholar_auth
ISSUER: https://scholar-auth-jamarrlmayes.replit.app
AUDIENCE: student-pilot

# student_pilot
AUTH_ISSUER_URL: https://scholar-auth-jamarrlmayes.replit.app
AUTH_CLIENT_ID: student-pilot
SCHOLARSHIP_API_BASE_URL: https://scholarship-api-jamarrlmayes.replit.app
STRIPE_SECRET_KEY: rk_live_51QO... (LIVE)
VITE_STRIPE_PUBLIC_KEY: pk_live_51QO... (LIVE)
STRIPE_WEBHOOK_SECRET: [MUST ADD] (BLOCKING!)

# provider_register
STRIPE_SECRET_KEY: rk_live_51QO... (LIVE)
VITE_STRIPE_PUBLIC_KEY: pk_live_51QO... (LIVE)
STRIPE_WEBHOOK_SECRET: [MUST ADD] (BLOCKING!)
NOTIFY_WEBHOOK_SECRET: aadd881e... (SET)

# auto_com_center
NOTIFY_WEBHOOK_SECRET: aadd881e... (SET, matches provider_register)

# scholarship_api
SCHOLARSHIP_API_BASE_URL: https://scholarship-api-jamarrlmayes.replit.app
```

---

## APPENDIX B: 28-Minute Sprint View

```
T+0  ████████████████ Phase 1: Parallel Verification (15 min)
     │
     ├─ Auth Lead: scholar_auth (5 min)
     ├─ API Lead: scholarship_api (5 min)
     ├─ Payments Lead: provider_register (10 min) [CRITICAL]
     ├─ Comms Lead: auto_com_center (5 min)
     └─ Frontend Lead: student_pilot (7 min)
     │
T+15 ████ Phase 2: GO/NO-GO Decision (2 min)
     │
     ├─ Review: 8 criteria
     ├─ Fix: STRIPE_WEBHOOK_SECRET (if needed)
     └─ Issue: GO or NO-GO
     │
T+17 ███████████████████ Phase 3: Live Dollar Test (13 min)
     │
     ├─ T+0-2: Navigate to checkout
     ├─ T+2-5: Execute $9.99 purchase
     ├─ T+5-6: Verify redirect
     ├─ T+6-7: Verify credits posted (9,990)
     ├─ T+7-9: Verify ledger entry
     ├─ T+9-11: Verify Stripe payment
     └─ T+11-13: Collect evidence
     │
T+30 ✅ FIRST LIVE DOLLAR ACHIEVED
     │
     └─ Package evidence bundle for board
```

---

**End of Option A Execution Guide**

**Version:** 1.0  
**Last Updated:** 2025-11-23T17:30:00Z  
**Status:** Ready for execution (after STRIPE_WEBHOOK_SECRET fix)
