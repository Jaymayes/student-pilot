# Agent3 E2E Testing - Operator Quick Start (v2.1 Compact - CEO-Approved)

## 🎯 **CEO Directive: Revenue-First, Student-Value-First Testing**

This testing framework is ordered to **de-risk revenue first** and align with our **$10M ARR priority** and **student-value-first strategy** from the company playbook. The AI control pattern uses **isolated, per-app modules** to ensure Agent3 responds best to precise, scoped prompts without criteria bleeding across apps.

---

## 🚀 **3-Step Deployment**

### **Step 1: Copy the System Prompt**
1. Open `docs/testing/AGENT3_SYSTEM_PROMPT.txt`
2. Copy the entire prompt (from "BEGIN" to "END")
3. Paste into Agent3 as the **System message**

This ensures Agent3 runs **isolated, per-app modules only**, which is the right control pattern for an AI implementer that responds best to precise, scoped prompts.

### **Step 2: Run a Test**

**Fastest path to full baseline:**
```
T+72h gate: Test all apps
```

**Revenue-first validation:**
```
T+48h gate: Test Student Pilot and Provider Register
```

**Single app spot-check:**
```
Test https://auto-page-maker-jamarrlmayes.replit.app
```

### **Step 3: Review YAML Reports**

Confirm gate pass/fail and prioritize fixes for:
- Any app < 4
- Any revenue/security/SEO app that is not = 5 at its gate

This ordering **protects revenue and student experience**, consistent with our growth thesis and roadmap priorities.

---

## 📊 **Understanding Scores**

| Score | Status | Decision | Gate Impact |
|-------|--------|----------|-------------|
| **0** | Unreachable | 🛑 STOP - DNS/TLS/HTTP failure | Gate fails |
| **1** | Barely reachable | 🛑 STOP - Severe gaps | Gate fails |
| **2** | Loads but unstable | ⚠️ HOLD - Missing key headers | Gate fails |
| **3** | Mostly OK | ✅ PROCEED with monitoring | Gate fails if <4 required |
| **4** | Production-ready with minor gaps | ✅ PROCEED | Passes ≥4 gates |
| **5** | Fully production-grade | ✅ PROCEED - Ship it! | Passes all gates |

---

## 🎯 **Gate Requirements (Revenue-First Ordering)**

### **T+48h Gate (Revenue-Critical) 💰 - PROTECT REVENUE FIRST**
**Apps**: student_pilot, provider_register  
**Requirement**: Both must score **=5** (exactly 5)  
**Command**: `T+48h gate: Test Student Pilot and Provider Register`  
**Critical**: If either fails, **🛑 HOLD ENTIRE ROLLOUT**

**Why First?** Revenue apps directly impact ARR. Testing them early de-risks the business model.

### **T+24h Gate (Infrastructure)**
**Apps**: scholarship_api, scholarship_agent  
**Requirement**: Both must score **≥4**  
**Command**: `T+24h gate: Test Scholarship API and Scholarship Agent`

**Why Second?** Infrastructure must be stable before full rollout, but revenue validation comes first.

### **T+72h Gate (Full Rollout) 🚀**
**Apps**: All 8 apps  
**Requirements**:
- auto_page_maker must score **=5** (SEO growth-critical) 🔍
- scholar_auth must score **=5** (security-critical) 🔒
- All others must score **≥4**

**Command**: `T+72h gate: Test all apps`

**Why Last?** After revenue is protected, ensure SEO (student discovery) and security (student trust) are production-ready.

---

## 📋 **Ready-to-Use Commands**

### **Recommended Testing Order**

**1. Revenue-First Validation (Day 2):**
```
T+48h gate: Test Student Pilot and Provider Register
```
✅ De-risks checkout and registration funnels  
✅ Validates revenue infrastructure early  
✅ Aligns with student-value-first strategy  

**2. Infrastructure Validation (Day 1):**
```
T+24h gate: Test Scholarship API and Scholarship Agent
```
✅ Ensures backend APIs are stable  
✅ Validates agent services  

**3. Full Baseline (Day 0 or Day 3):**
```
T+72h gate: Test all apps
```
✅ Validates all 8 apps for production readiness  
✅ Ensures SEO and security are production-grade  

### **Single App Spot Checks**
```
Test https://scholarship-api-jamarrlmayes.replit.app
Test https://scholarship-agent-jamarrlmayes.replit.app
Test https://student-pilot-jamarrlmayes.replit.app
Test https://provider-register-jamarrlmayes.replit.app
Test https://auto-page-maker-jamarrlmayes.replit.app
Test https://scholar-auth-jamarrlmayes.replit.app
Test https://auto-com-center-jamarrlmayes.replit.app
Test https://scholarship-sage-jamarrlmayes.replit.app
```

---

## 📄 **Sample YAML Output**

```yaml
app_name: Student Pilot
app_key: student_pilot
url_tested: https://student-pilot-jamarrlmayes.replit.app
readiness_score_0_to_5: 5
rollout_gate_status:
  gate: T+48h
  meets_gate: true
  note: "Revenue-critical checkout-readiness validated"
evidence:
  dns_tls: "resolved/TLS-valid"
  http:
    status_chain: [200]
    ttfb_ms: 97
    content_type: "text/html; charset=utf-8"
  security_headers_present:
    - HSTS
    - CSP
    - X-Frame-Options
    - X-Content-Type-Options
    - Referrer-Policy
    - Permissions-Policy
  robots_sitemap:
    robots_txt: present
    sitemap_xml: present
  console_errors_count: 0
  notes:
    - "TTFB 97ms ✓"
    - "Stripe in CSP ✓"
    - "Zero console errors ✓"
    - "All security headers present ✓"
    - "Checkout-readiness posture validated"
recommended_actions:
  - "Monitor TTFB under load (target P95 ≤ 120ms)"
  - "Consider adding Content-Security-Policy-Report-Only for monitoring"
```

---

## ⚡ **Performance Target**

**TTFB Target**: ~120ms (global P95 SLO)

All apps are evaluated against this performance baseline. The target is tracked in `evidence.http.ttfb_ms` and flagged if breached.

**Scoring Impact:**
- TTFB ≤ 120ms: Supports score of 5
- TTFB 121-140ms: Supports score of 4
- TTFB 141-200ms: Supports score of 3
- TTFB > 200ms: Degrades to score of 2 or lower

---

## 🗺️ **URL-to-App Routing**

| URL Pattern | app_key | Gate Requirement |
|-------------|---------|------------------|
| `student-pilot-*.replit.app` | `student_pilot` | **T+48h: =5** 💰 Revenue |
| `provider-register-*.replit.app` | `provider_register` | **T+48h: =5** 💰 Revenue |
| `scholarship-api-*.replit.app` | `scholarship_api` | T+24h: ≥4 |
| `scholarship-agent-*.replit.app` | `scholarship_agent` | T+24h: ≥4 |
| `auto-page-maker-*.replit.app` | `auto_page_maker` | **T+72h: =5** 🔍 SEO |
| `scholar-auth-*.replit.app` | `scholar_auth` | **T+72h: =5** 🔒 Security |
| `auto-com-center-*.replit.app` | `auto_com_center` | T+72h: ≥4 |
| `scholarship-sage-*.replit.app` | `scholarship_sage` | T+72h: ≥4 |
| Unknown/other host | `unknown_host` | Graceful error report |

---

## 🎯 **Per-App Module Goals (Apply Only the Relevant One)**

### **Revenue-Critical Apps (T+48h Gate =5)**

#### **1. student_pilot (B2C revenue-critical)**
- **Goal**: Checkout-readiness posture
- **Evidence**: Stripe allowed in CSP; strong headers; zero console errors; TTFB ≤ 120ms

#### **2. provider_register (B2B revenue-critical)**
- **Goal**: Registration funnel posture
- **Evidence**: Strong headers; CSP permits payment/AI services; zero console errors; TTFB ≤ 120ms

### **Critical Apps (T+72h Gate =5)**

#### **3. auto_page_maker (SEO growth-critical)**
- **Goal**: SEO readiness
- **Evidence**: robots.txt present; sitemap.xml present; canonical tags; strong headers; zero console errors; TTFB ≤ 120ms

#### **4. scholar_auth (security-critical)**
- **Goal**: Auth surface hardening
- **Evidence**: HSTS long max-age; strict CSP; all modern headers; zero console errors; TTFB ≤ 120ms

### **Infrastructure Apps (T+24h Gate ≥4)**

#### **5. scholarship_api (infrastructure)**
- **Goal**: API readiness
- **Evidence**: health/docs reachable; strong headers; CORS sane; TTFB ≤ 140ms (target ≤ 120ms)

#### **6. scholarship_agent (agent service)**
- **Goal**: Service availability
- **Evidence**: landing/docs reachable; CSP sane; zero console errors; TTFB ≤ 140ms (target ≤ 120ms)

### **Supporting Apps (T+72h Gate ≥4)**

#### **7. auto_com_center (internal admin)**
- **Goal**: Dashboard availability
- **Evidence**: Assets load; strong headers; zero console errors; TTFB ≤ 140ms

#### **8. scholarship_sage (assistant app)**
- **Goal**: Page/service availability
- **Evidence**: Loads cleanly; key headers; zero console errors; TTFB ≤ 140ms

---

## 🔒 **Global Guardrails**

### ✅ **Allowed**
- GET, HEAD, OPTIONS methods only
- Fetch and observe only
- Read-only operations
- Max 20 requests per app

### ❌ **Forbidden**
- POST/PUT/PATCH/DELETE
- Write or mutate any server state
- Authentication attempts
- Cookie/session manipulation
- Form submissions
- File uploads
- JS injection
- PII collection

### 🛡️ **Compliance**
- FERPA/COPPA-aligned testing
- No sensitive data storage
- Benign observer pattern

---

## 📅 **Recommended 72-Hour Rollout (Revenue-First)**

### **Day 0 (Today) - Optional Baseline**
```
T+72h gate: Test all apps
```
- Establish baseline for all 8 apps
- Identify critical issues early
- Plan fixes before revenue gate

### **Day 1 (T+24h) - Infrastructure**
```
T+24h gate: Test Scholarship API and Scholarship Agent
```
- Both must score ≥4
- Enable `PROMPT_MODE=universal` for these apps if pass
- Monitor for stability

### **Day 2 (T+48h) - Revenue Gate** 💰 **CRITICAL**
```
T+48h gate: Test Student Pilot and Provider Register
```
- Both must score exactly 5
- **🛑 HOLD ENTIRE ROLLOUT IF FAIL**
- Validates checkout and registration funnels
- Protects ARR growth trajectory

### **Day 3 (T+72h) - Full Rollout** 🚀
```
T+72h gate: Test all apps
```
- auto_page_maker =5 (SEO-critical for student discovery)
- scholar_auth =5 (security-critical for student trust)
- All others ≥4
- Generate first `kpi_brief_generated` with non-zero ARR

---

## 🎊 **Why This Ordering Works**

### **Revenue-First Strategy** 💰
- Tests revenue apps (student_pilot, provider_register) at T+48h
- De-risks business model before full rollout
- Aligns with $10M ARR priority

### **Student-Value-First** 🎓
- Ensures checkout and registration experiences are flawless
- Validates SEO for student discovery
- Confirms security for student trust

### **AI Control Pattern** 🤖
- Isolated per-app modules prevent criteria bleed
- Agent3 applies only relevant module per test
- Precise, scoped prompts ensure accurate scoring

---

## 📚 **Full Documentation**

- **System Prompt**: `docs/testing/AGENT3_SYSTEM_PROMPT.txt` (CEO-approved, copy-paste ready)
- **Quick Start**: This file
- **Detailed Runbook**: `docs/testing/E2E_TESTING_RUNBOOK.md`
- **Framework Overview**: `docs/testing/universal_readonly_e2e_prompt.md`

---

**Ready to test!** Copy the system prompt from `docs/testing/AGENT3_SYSTEM_PROMPT.txt` and paste it into Agent3. 🚀

**Recommended First Test:**
```
T+48h gate: Test Student Pilot and Provider Register
```
This validates your revenue-critical apps first, consistent with the CEO's growth thesis and student-value-first strategy.
