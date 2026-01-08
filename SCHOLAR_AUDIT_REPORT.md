# Scholar Ecosystem Deep Dive Audit Report

**Date:** January 8, 2026  
**Auditor:** Lead Product Manager & Senior QA Engineer  
**App:** ScholarLink (Student Pilot - A5)  
**Mode:** Read-Only Diagnostic

---

## Executive Summary

ScholarLink is technically functional with Stripe payments active, but suffers from **acquisition bottleneck** (only 7 users) and **activation failure** (0 AI feature usage despite purchases). The funnel is leaking between signup and feature engagement.

| Metric | Value | Status |
|--------|-------|--------|
| Total Users | 7 | 🔴 Critical |
| Total Revenue | $904.20 | 🟡 Below target |
| AI Feature Usage | 0 deductions | 🔴 Critical |
| Purchases | 82 transactions | ✅ Working |
| Stripe Integration | LIVE (100%) | ✅ Working |

---

## 🔴 Critical Blockers

### 1. Zero AI Feature Engagement
**Severity:** CRITICAL  
**Evidence:** `SELECT COUNT(*) FROM credit_ledger WHERE type = 'deduction'` → **0**

Users are purchasing credits ($904.20 total) but **never using AI features**. This indicates:
- Essay Assistant is not discoverable or confusing to use
- Users may not understand what credits are for
- Onboarding doesn't guide users to try AI features

**Impact:** 100% of purchased credits are unused → users will churn, no repeat purchases.

### 2. Extremely Low User Acquisition
**Severity:** CRITICAL  
**Evidence:** Only 7 users in database, most are test accounts:
- 1 real user: jamarrlmayes@gmail.com
- 6 test/validation accounts (@example.com, @canary.prod)

**Root Causes:**
- No organic traffic (SEO gaps)
- No referral/sharing mechanism
- Relies entirely on OIDC authentication (higher friction than email/password)

### 3. Missing Social Sharing Images
**Severity:** HIGH  
**Evidence:** No `og:image` or `twitter:image` meta tags in index.html

When shared on social media, the link shows **no preview image**, reducing click-through rates by 50-80%.

**File:** `client/index.html`
```html
<!-- MISSING: -->
<meta property="og:image" content="https://student-pilot-jamarrlmayes.replit.app/og-image.png" />
<meta name="twitter:image" content="https://student-pilot-jamarrlmayes.replit.app/og-image.png" />
```

---

## 💸 Revenue Killers

### 1. No Active Subscriptions
**Evidence:** All 7 users have `subscription_status = 'inactive'`

The credit-based model works, but there's no recurring revenue mechanism. Consider:
- Monthly credit packages with auto-renewal
- Subscription tiers with included credits

### 2. Stale ARR Monitoring
**Evidence:** System logs show repeated alerts:
```
"Stale ARR Data: usage_events"
"Stale ARR Data: ledger_entries"
```

ARR tracking is not functioning because there are no usage events to track.

### 3. Credit Balances Not Depleting
**Evidence:** Credit balances remain high after purchase:
```
trial-test-user-DUTokS: 4,105,000 millicredits (4,105 credits)
```

This user has $4.10 worth of credits but has never used them.

---

## 🟡 UX Friction Points

### 1. Auth Dependency on External OIDC
**Finding:** Login redirects to external Scholar Auth (A1)

**Friction Points:**
- Adds extra redirect step
- Users may not trust external auth domain
- If A1 has issues (known A1-001 OIDC loop), users can't sign up

### 2. Landing Page CTA Mismatch
**Finding:** Button says "Start Free — 5 Credits Included" but leads to `/api/login`

Users expect immediate value but must complete OIDC flow first. Consider:
- Showing scholarship preview before requiring login
- "Try without account" option

### 3. No Onboarding to First AI Usage
**Finding:** After signup, users land on Dashboard without guided first-action

**Recommendation:** Add onboarding flow that:
1. Uploads a sample document
2. Shows Essay Assistant in action
3. Demonstrates value of 5 free credits

### 4. High Memory Warnings
**Evidence:** Repeated logs every 5 minutes:
```
"Alert created","severity":"warning","title":"High Memory Usage"
```

Not user-facing, but may cause slowdowns affecting UX.

---

## 🟢 Missing Growth Features

### 1. No OG Image for Social Sharing
**Priority:** HIGH  
**Fix:** Create and add professional OG image (1200x630px)

### 2. No Referral Program
**Finding:** No mechanism for users to invite friends

**Recommendation:** "Give 5 credits, Get 5 credits" referral program

### 3. No Email Collection on Landing
**Finding:** Landing page requires full OIDC signup

**Recommendation:** Add email capture form: "Get scholarship tips + 5 free credits"

### 4. No Success Stories/Testimonials
**Finding:** Landing page lacks social proof

**Recommendation:** Add section with student success stories

### 5. No Analytics/UTM Tracking Visibility
**Finding:** UTM capture exists but no dashboard to view attribution

---

## Technical Status

### ✅ Working Correctly
| Component | Status |
|-----------|--------|
| Stripe LIVE Integration | ✅ Active (100% rollout) |
| OIDC Authentication | ✅ Working (A1 dependency) |
| Telemetry → A8 | ✅ 100% delivery |
| Database Schema | ✅ 8 tables healthy |
| SEO Meta Tags | ✅ Present (except images) |
| Mobile Responsiveness | ✅ 8+ responsive classes |
| Console Errors | ✅ None |

### ⚠️ Needs Attention
| Issue | Severity |
|-------|----------|
| High Memory Usage | Warning |
| A1 OIDC Loop (Upstream) | Medium |
| Agent Bridge 404 | Low (graceful fallback) |

---

## Database Summary

| Table | Records | Status |
|-------|---------|--------|
| users | 7 | 🔴 Very low |
| purchases | 82 | ✅ Active |
| credit_balances | 5 | ✅ Working |
| credit_ledger (deductions) | 0 | 🔴 No usage |
| usage_events | 0 | 🔴 No AI usage |

---

## Recommendations Priority Matrix

| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
| P0 | Add guided onboarding to Essay Assistant | High | Medium |
| P0 | Create and add OG image | High | Low |
| P1 | Add email capture before requiring OIDC | High | Medium |
| P1 | Build "first credit usage" wizard | High | Medium |
| P2 | Add referral program | Medium | High |
| P2 | Add testimonials section | Medium | Low |
| P3 | Build attribution dashboard | Low | Medium |

---

## Conclusion

**The app is technically sound but has a severe activation problem.** Users can sign up and purchase credits, but 0% are using the AI features. This means:

1. **Acquisition is broken** (only 7 users → no discovery/SEO traction)
2. **Activation is broken** (0 AI usage → users don't understand value)
3. **Revenue is stalled** (no repeat purchases because credits aren't consumed)

**Immediate Actions:**
1. Fix the "first usage" experience with guided onboarding
2. Add OG image for social sharing
3. Consider allowing limited browsing without OIDC login

---

*Report generated in read-only diagnostic mode. No code was modified.*
