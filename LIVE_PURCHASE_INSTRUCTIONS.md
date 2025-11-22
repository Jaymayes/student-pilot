# LIVE PURCHASE INSTRUCTIONS - T+15 MINUTES
**Mission Clock:** 2025-11-22T00:15:00Z  
**Status:** ✅ Ready for live purchase  
**Your Task:** Execute $5-10 live Stripe purchase NOW

---

## ✅ PRE-FLIGHT CONFIRMATION

**Systems Status:**
- ✅ auto_com_center: Ready (/readyz = 200, CORS secured)
- ✅ provider_register: Ready (/readyz = 200)
- ✅ student_pilot: Ready (Stripe LIVE configured)
- ✅ scholarship_api: Ready (ledger operational)
- ✅ NOTIFY_WEBHOOK_SECRET: Set in both services

**You are CLEAR for live purchase.**

---

## 🚀 STEP-BY-STEP PURCHASE (5 Minutes)

### Step 1: Navigate to student_pilot
**URL:** https://student-pilot-jamarrlmayes.replit.app

**Action:**
1. Open the URL in your browser
2. If not logged in, click "Login" button
3. Authenticate via Replit OIDC (fallback is active)
4. Verify you land on the dashboard

**Expected:** Authenticated and on dashboard page

---

### Step 2: Go to Billing Page
**URL:** https://student-pilot-jamarrlmayes.replit.app/billing

**Action:**
1. Click "Billing" in navigation OR
2. Navigate directly to the billing URL above
3. Verify credit packages are displayed

**You should see:**
- Starter: $9.99 (9,990 credits)
- Professional: $49.99 (52,490 credits + 5% bonus)
- Enterprise: $99.99 (109,990 credits + 10% bonus)

---

### Step 3: Select Package and Initiate Purchase

**RECOMMENDED: Starter Package ($9.99)**

**Action:**
1. Click "Purchase" button on Starter package
2. Stripe Checkout will load in new tab/window
3. **VERIFY:** Look for "Live mode" indicator (NOT "Test mode")

**⚠️ CRITICAL CHECK:**
- Top right of Stripe Checkout should say "Live mode" or show Stripe logo without "Test" badge
- If you see "Test mode" → STOP and notify me immediately

---

### Step 4: Complete Payment with REAL Card

**IMPORTANT: Use a REAL credit/debit card (NOT test card 4242...)**

**Enter:**
1. **Card Number:** Your real card number
2. **Expiration:** MM/YY
3. **CVC:** 3-digit security code
4. **ZIP/Postal Code:** Your billing ZIP
5. **Email:** Your real email (for receipt)
6. **Billing Info:** Complete all required fields

**Action:**
1. Fill out all fields carefully
2. Review total: $9.99 USD
3. Click "Pay" or "Submit" button
4. Wait for processing (usually 2-5 seconds)

**Expected:** 
- Payment processing spinner
- Success message
- Redirect back to student_pilot

---

### Step 5: Verify Redirect and Success

**After payment:**
1. Stripe will redirect you back to student_pilot
2. You should see a success page or return to dashboard
3. Look for confirmation message

**Expected:**
- "Payment successful" message OR
- Redirect to dashboard with updated credit balance

**Note the time:** This is your Time-to-First-Dollar (TFF$) timestamp

---

## 📸 EVIDENCE COLLECTION (Do This Immediately)

### Screenshot 1: Stripe Dashboard
**Action:**
1. Open new tab: https://dashboard.stripe.com/payments
2. Filter: Today's date
3. Find: Your $9.99 charge (should be at the top)
4. Click on the transaction to view details
5. **SCREENSHOT:** Full transaction details page

**Must show:**
- Amount: $9.99 USD
- Status: Succeeded
- Mode: **LIVE** (not TEST)
- Customer email
- Timestamp
- Transaction ID

**File name:** `stripe_live_transaction_YYYYMMDD_HHMMSS.png`

---

### Screenshot 2: Credit Balance in student_pilot
**Action:**
1. Go back to student_pilot dashboard
2. Look for credit balance display (likely in header or profile area)
3. **SCREENSHOT:** Credit balance showing 9,990 credits

**Must show:**
- Credit balance: 9,990 (or 9990)
- Your user email or name
- Timestamp (if visible)

**File name:** `credit_balance_YYYYMMDD_HHMMSS.png`

---

### Screenshot 3: Browser Network Tab (Optional but Helpful)
**Action:**
1. Open browser DevTools (F12 or right-click → Inspect)
2. Go to Network tab
3. Look for requests to `/api/credits` or `/api/billing`
4. Click on the request to see response
5. **SCREENSHOT:** Response showing updated balance

**File name:** `api_response_credits_YYYYMMDD_HHMMSS.png`

---

## ⚠️ TROUBLESHOOTING

### Problem: Stripe Shows "Test Mode"
**Solution:**
- STOP the purchase
- Notify me immediately
- We need to verify Stripe LIVE keys in provider_register

---

### Problem: Payment Declined
**Possible Causes:**
- Incorrect card details
- Insufficient funds
- Bank blocking the charge (fraud prevention)

**Solution:**
1. Try again with correct details
2. Contact your bank if blocked
3. Try a different card
4. Reduce amount to $5 (minimum for live test)

---

### Problem: No Redirect After Payment
**Wait:** Up to 30 seconds for webhook processing

**If still stuck after 30 seconds:**
1. Check Stripe dashboard - did charge succeed?
2. Manually navigate to student_pilot dashboard
3. Check credit balance manually
4. Notify me - webhook may have failed

---

### Problem: Credits Don't Appear
**Wait:** Up to 2 minutes for ledger update

**If still not showing after 2 minutes:**
1. Refresh the page (F5)
2. Log out and log back in
3. Check browser console for errors (F12 → Console tab)
4. Notify me with screenshot of console errors

---

## 🎯 SUCCESS CRITERIA

**You've succeeded when:**
- [X] Stripe charge succeeded in LIVE mode
- [X] Amount: $9.99 charged to your card
- [X] Credits visible in student_pilot dashboard (9,990)
- [X] Screenshot of Stripe transaction collected
- [X] Screenshot of credit balance collected

**Email receipt is NICE-TO-HAVE (not required for success)**

---

## 📊 WHAT I'LL DO AUTOMATICALLY

**After you complete the purchase and collect screenshots:**

1. **Verify Ledger Entry (5 min)**
   - Query scholarship_api for your transaction
   - Confirm credit amount matches
   - Check ledger integrity

2. **Test Email Delivery (5 min)**
   - Attempt to trigger receipt email
   - Check auto_com_center logs
   - Verify provider_register → auto_com_center webhook

3. **Collect Additional Evidence (10 min)**
   - API response logs
   - Webhook delivery logs
   - Latency metrics

4. **Generate Status Reports (10 min)**
   - Production Status Report: auto_com_center
   - Production Status Report: provider_register
   - KPI summary (TFF$, webhook success, latency)

5. **Deliver Mission Package (5 min)**
   - Evidence bundle
   - Status reports
   - Recommendations for 24-hour hardening

---

## ⏱️ TIMELINE TRACKING

**Mark your times:**

| Event | Target Time | Actual Time | Notes |
|-------|-------------|-------------|-------|
| Started purchase | T+15 min | _____ | Click "Purchase" button |
| Entered card details | T+17 min | _____ | Completed Stripe form |
| Payment submitted | T+18 min | _____ | Clicked "Pay" |
| Payment confirmed | T+20 min | _____ | Stripe success message |
| Redirect to app | T+20 min | _____ | Back in student_pilot |
| Credits visible | T+22 min | _____ | Balance updated |
| Screenshots taken | T+25 min | _____ | Evidence collected |

**Time-to-First-Dollar (TFF$):** _____ minutes (from purchase start to credits visible)

---

## 🔴 WHAT TO DO NOW

1. **Navigate to:** https://student-pilot-jamarrlmayes.replit.app/billing
2. **Purchase:** Starter package ($9.99) with REAL card
3. **Verify:** LIVE mode in Stripe Checkout
4. **Wait:** For redirect back to student_pilot
5. **Check:** Credit balance shows 9,990 credits
6. **Screenshot:** Stripe transaction + credit balance
7. **Reply:** "PURCHASE COMPLETE" with screenshots attached

---

## 📱 AFTER PURCHASE

**Reply with:**
1. "PURCHASE COMPLETE"
2. Attach 2-3 screenshots (Stripe + Credits)
3. Note any issues encountered
4. Time-to-First-Dollar duration

**Then I will:**
- Verify ledger entry automatically
- Test email delivery
- Generate status reports
- Deliver complete mission package

---

**Ready to execute?**  
**Navigate to:** https://student-pilot-jamarrlmayes.replit.app/billing

**Your mission: Complete $9.99 purchase and collect evidence.**

**Target completion: T+25 minutes (10 minutes from now)**

---

**Mission Clock Started:** T+15 minutes  
**Status:** ✅ CLEARED FOR LIVE PURCHASE  
**Next Update:** After you reply "PURCHASE COMPLETE"

