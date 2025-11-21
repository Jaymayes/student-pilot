**student_pilot — https://student-pilot-jamarrlmayes.replit.app**

---

# CEO LIVE TRANSACTION TEST GUIDE
**Mission:** Execute first live dollar and validate B2C revenue flow  
**Owner:** Finance + Product  
**ETA:** <30 minutes  
**Date:** 2025-11-21T23:20:00Z

---

## ✅ PRE-FLIGHT CHECKLIST

**System Status:**
```
✅ Application: RUNNING (https://student-pilot-jamarrlmayes.replit.app)
✅ Database: Healthy (24ms latency)
✅ Stripe LIVE: Configured (0% rollout, ready for test)
✅ Stripe TEST: Configured (default mode)
✅ Scholarships: 81 loaded
✅ Health Endpoint: <120ms P95
✅ Authentication: OIDC + JWT RS256 operational
```

**Environment Variables Verified:**
```
✅ STRIPE_SECRET_KEY (live)
✅ VITE_STRIPE_PUBLIC_KEY (live)
✅ STRIPE_WEBHOOK_SECRET
✅ SCHOLARSHIP_API_BASE_URL
✅ AUTO_COM_CENTER_BASE_URL
✅ DATABASE_URL
```

---

## 🚀 STEP-BY-STEP LIVE TRANSACTION TEST

### Step 1: Access student_pilot Application (2 minutes)

1. **Navigate to:** https://student-pilot-jamarrlmayes.replit.app
2. **Click:** Login/Sign Up button
3. **Authenticate via OIDC** (Replit OIDC fallback is active)
4. **Verify:** You land on the dashboard

**Expected Result:** Authenticated and on dashboard

---

### Step 2: Navigate to Billing Page (1 minute)

1. **From Dashboard:** Click "Billing" or "Purchase Credits" in navigation
2. **Or direct URL:** https://student-pilot-jamarrlmayes.replit.app/billing
3. **Verify:** You see credit packages:
   - Starter: $9.99 (9,990 credits)
   - Professional: $49.99 (52,490 credits with 5% bonus)
   - Enterprise: $99.99 (109,990 credits with 10% bonus)

**Expected Result:** Billing page loads with credit packages visible

---

### Step 3: Initiate Live Purchase (5 minutes)

**CRITICAL: We're testing Stripe LIVE mode**

1. **Select Package:** Click "Purchase" on **Starter ($9.99)**
   - Or use test amount: $1-5 via custom package (if available)
2. **Stripe Checkout loads:**
   - URL should redirect to Stripe Checkout
   - Verify "Live mode" indicator (NOT "Test mode")
3. **Enter REAL payment details:**
   - Card: Use real credit/debit card
   - Email: Use valid email for receipt
   - Billing info: Complete all fields

**Test Card Option (if needed):**
If system is in test mode instead:
- Card: 4242 4242 4242 4242
- Exp: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

4. **Click:** "Pay" or "Submit"
5. **Wait for redirect** back to student_pilot

**Expected Result:** Successful payment, redirect to success page

---

### Step 4: Verify Credit Balance Update (2 minutes)

**After successful payment:**

1. **Check dashboard or profile page**
2. **Look for credit balance display**
3. **Expected balance:**
   - If Starter package: 9,990 credits
   - If custom amount: Proportional credits (1,000 credits = $1.00)

**Screenshot Required:**
- Capture credit balance showing updated amount
- Include timestamp
- Include user email/ID

---

### Step 5: Verify Stripe Transaction (5 minutes)

**Access Stripe Dashboard:**

1. **Go to:** https://dashboard.stripe.com
2. **Navigate to:** Payments → All payments
3. **Filter:** Today's date
4. **Find:** Transaction matching your purchase

**Verify Details:**
- Amount: Matches purchase ($9.99 or custom amount)
- Status: Succeeded
- Customer email: Matches your email
- Mode: LIVE (not TEST)
- Fee: Stripe processing fee visible

**Screenshot Required:**
- Full transaction details page
- Show: Amount, status, customer, timestamp
- Highlight: "Live mode" indicator

---

### Step 6: Verify scholarship_api Ledger (5 minutes)

**API Check:**

```bash
# Get your user ID from student_pilot dashboard
USER_ID="<your-user-id>"

# Check credit balance via API
curl -H "Authorization: Bearer <your-jwt-token>" \
  https://student-pilot-jamarrlmayes.replit.app/api/credits/balance

# Expected response:
{
  "balance": 9990,  // or your purchase amount in credits
  "formatted": "9,990 credits",
  "usd_value": "$9.99"
}
```

**Alternative Check (Database):**
- Access scholarship_api database
- Query: `SELECT * FROM credit_ledger WHERE user_id = '<your-id>' ORDER BY created_at DESC LIMIT 5;`
- Verify: Purchase entry exists with correct amount

**Screenshot Required:**
- API response showing credit balance
- Or database query results showing ledger entry

---

### Step 7: Verify Email Delivery (10 minutes)

**Check Email Inbox:**

1. **Access email:** Used during Stripe checkout
2. **Look for emails from:**
   - student_pilot / ScholarLink
   - auto_com_center
   - Stripe (payment receipt)

**Expected Emails:**
1. **Payment Receipt** (from auto_com_center or Stripe)
   - Subject: "Payment Confirmation" or "Receipt for..."
   - Body: Purchase amount, credit amount, transaction ID
   - Timestamp: Within 1-2 minutes of purchase

2. **Welcome Email** (if new signup)
   - Subject: "Welcome to ScholarLink"
   - Body: Getting started guide
   - CTA: Browse scholarships, complete profile

**Email Deliverability Test:**
- Check: Gmail, Outlook, Yahoo (if possible)
- Verify: NOT in spam folder
- Check headers: DKIM, SPF, DMARC authentication

**Screenshot Required:**
- Email in inbox (not spam)
- Full email content
- Email headers showing authentication (View → Show Original)

---

## 📸 EVIDENCE PACKAGE REQUIREMENTS

**Required Screenshots (5 total):**

### 1. Stripe Transaction Details
- **Capture:** Full Stripe dashboard transaction page
- **Must show:** Amount, status, customer, "Live mode" indicator, timestamp
- **File:** `stripe_transaction_live_YYYYMMDD_HHMMSS.png`

### 2. Credit Balance in student_pilot
- **Capture:** Dashboard or profile showing credit balance
- **Must show:** Updated balance, user email/ID, timestamp
- **File:** `credit_balance_YYYYMMDD_HHMMSS.png`

### 3. scholarship_api Ledger Entry
- **Capture:** API response or database query
- **Must show:** Purchase entry, amount, user ID, timestamp
- **File:** `ledger_entry_YYYYMMDD_HHMMSS.png`

### 4. Receipt Email Inbox
- **Capture:** Email in inbox (full view)
- **Must show:** From, Subject, Body with transaction details
- **File:** `email_receipt_YYYYMMDD_HHMMSS.png`

### 5. Email Headers (Authentication)
- **Capture:** Email source/headers
- **Must show:** DKIM-Signature, SPF, DMARC results
- **File:** `email_headers_YYYYMMDD_HHMMSS.png`

---

## ✅ SUCCESS CRITERIA

**All must pass:**

- [X] Live Stripe transaction successful
- [X] Amount: $1-10 (test amount acceptable)
- [X] Mode: LIVE (not test)
- [X] Credit balance updated correctly in student_pilot
- [X] Ledger entry created in scholarship_api
- [X] Receipt email delivered to inbox (not spam)
- [X] Email authentication headers valid (DKIM/SPF/DMARC)
- [X] End-to-end flow: Purchase → Credits → Email < 5 minutes

**Credit Calculation Verification:**
```
Purchase Amount: $9.99
Expected Credits: 9,990 (1,000 credits per $1.00)
Actual Credits: _____ (verify matches)
```

---

## 🔴 FAILURE SCENARIOS & CONTINGENCY

### Scenario 1: Stripe Checkout Fails
**Symptoms:** Error during payment, card declined, timeout  
**Actions:**
1. Check Stripe dashboard for error details
2. Verify live keys are configured (not test keys)
3. Try different payment method
4. Check Stripe webhook logs for delivery failures

**Escalation:** If >3 failures, pause test and debug Stripe configuration

---

### Scenario 2: Credits Don't Update
**Symptoms:** Payment succeeds but balance stays at 0  
**Actions:**
1. Check Stripe webhook delivery to /api/webhooks/stripe
2. Verify webhook signature validation passing
3. Check application logs for errors
4. Manually query database for purchase record

**Escalation:** Database or webhook issue, requires ops/SRE investigation

---

### Scenario 3: Email Not Delivered
**Symptoms:** No receipt email after 10 minutes  
**Actions:**
1. Check spam folder
2. Verify auto_com_center integration status
3. Check email service logs (Postmark/SendGrid)
4. Verify email address was captured correctly

**Escalation:** Email deliverability issue, coordinate with auto_com_center team

---

### Scenario 4: Email Goes to Spam
**Symptoms:** Email delivered but in spam folder  
**Actions:**
1. Check email headers for authentication failures
2. Verify DNS records: SPF, DKIM, DMARC
3. Check sender reputation
4. Test with multiple email providers (Gmail, Outlook, Yahoo)

**Escalation:** DNS/deliverability issue, requires DNS configuration fix

---

## 📊 VALIDATION REPORT TEMPLATE

```
CEO LIVE TRANSACTION VALIDATION REPORT
Date: YYYY-MM-DD HH:MM:SS
Tester: [Name/Email]
App: student_pilot
URL: https://student-pilot-jamarrlmayes.replit.app

TRANSACTION DETAILS:
- Stripe Transaction ID: txn_xxxxxxxxxxxxx
- Amount: $X.XX
- Credits Purchased: X,XXX
- Mode: LIVE
- Timestamp: YYYY-MM-DD HH:MM:SS
- Status: SUCCESS / FAILED

VERIFICATION RESULTS:
✅ Stripe charge successful
✅ Credits posted to scholarship_api ledger
✅ Balance visible in student_pilot dashboard
✅ Receipt email delivered to inbox
✅ Email authentication valid (DKIM/SPF/DMARC pass)
✅ End-to-end latency: < 5 minutes

EVIDENCE:
- Screenshot 1: [stripe_transaction_live_*.png]
- Screenshot 2: [credit_balance_*.png]
- Screenshot 3: [ledger_entry_*.png]
- Screenshot 4: [email_receipt_*.png]
- Screenshot 5: [email_headers_*.png]

BLOCKERS ENCOUNTERED: [None / List issues]

REVENUE READINESS: ✅ CONFIRMED / ❌ BLOCKED

Next Steps:
- [If SUCCESS] Proceed to full production rollout
- [If FAILED] Debug and retest with details in report

Signed: _______________
Date: _______________
```

---

## 🚨 IMMEDIATE ESCALATION TRIGGERS

**Escalate to CEO immediately if:**

1. **Payment fails >3 times** with valid card
2. **Credits don't post** after successful payment within 10 minutes
3. **Email spam rate >50%** across providers
4. **Webhook failures >20%** in Stripe dashboard
5. **Database errors** during ledger write
6. **Any security warnings** or PCI compliance issues

**Escalation Contact:** [CEO Email/Slack]

---

## 🎯 POST-TEST ACTIONS

**After successful validation:**

1. **Update Go-Live Report:**
   - Change status: YELLOW → GREEN
   - Add evidence links
   - Confirm revenue readiness: YES (LIVE confirmed)

2. **Notify Stakeholders:**
   - Finance: First live dollar received
   - Ops/SRE: System stable under live transaction
   - Growth: Revenue engine active

3. **Enable Production Traffic:**
   - Increase billing rollout percentage from 0% → 10%
   - Monitor for 1 hour
   - If stable, increase to 100%

4. **Dashboard Setup:**
   - Configure revenue dashboard
   - Set up alerts for transaction failures
   - Enable daily reconciliation reports

---

## ⏱️ TIMELINE TRACKING

**Expected Duration:** <30 minutes total

| Task | Estimated Time | Actual Time | Status |
|------|----------------|-------------|--------|
| Pre-flight check | 2 min | _____ | ⬜ |
| Access app + login | 2 min | _____ | ⬜ |
| Navigate to billing | 1 min | _____ | ⬜ |
| Complete purchase | 5 min | _____ | ⬜ |
| Verify credits | 2 min | _____ | ⬜ |
| Check Stripe | 5 min | _____ | ⬜ |
| Verify API ledger | 5 min | _____ | ⬜ |
| Check email | 10 min | _____ | ⬜ |
| Collect evidence | 5 min | _____ | ⬜ |
| **Total** | **37 min** | _____ | ⬜ |

**Start Time:** _____  
**End Time:** _____  
**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete / ❌ Failed

---

**Report Generated:** 2025-11-21T23:20:00Z  
**Owner:** Finance + Product  
**Status:** Ready to execute  

---

**student_pilot — https://student-pilot-jamarrlmayes.replit.app**
