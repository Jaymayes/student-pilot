# Agent3 E2E Testing - Operator Quick Start (v2.1)

## 🚀 How to Use

### Step 1: Paste the Universal Prompt into Agent3
- Open `docs/testing/AGENT3_SYSTEM_PROMPT.txt`
- Copy the entire prompt (from "BEGIN" to "END")
- Paste into Agent3 as the system message

### Step 2: Run Tests

**Single App Tests:**
```
Test https://auto-com-center-jamarrlmayes.replit.app
Test https://scholarship-api-jamarrlmayes.replit.app
Test https://scholarship-agent-jamarrlmayes.replit.app
Test https://student-pilot-jamarrlmayes.replit.app
Test https://provider-register-jamarrlmayes.replit.app
Test https://auto-page-maker-jamarrlmayes.replit.app
Test https://scholar-auth-jamarrlmayes.replit.app
Test https://scholarship-sage-jamarrlmayes.replit.app
```

**Gate Tests:**
```
T+24h gate: Test Scholarship API and Scholarship Agent
T+48h gate: Test Student Pilot and Provider Register
T+72h gate: Test all apps
```

---

## 📊 Understanding Scores

| Score | Status | Decision |
|-------|--------|----------|
| **0** | Not reachable | 🛑 STOP - Fix deployment |
| **1** | Major blockers | 🛑 STOP - Critical fixes needed |
| **2** | Critical issues | ⚠️ HOLD - Address before rollout |
| **3** | Usable with issues | ✅ PROCEED with monitoring |
| **4** | Near-ready | ✅ PROCEED - Minor fixes |
| **5** | Production-ready | ✅ PROCEED - Ship it! |

---

## 🎯 Gate Requirements

### T+24h Gate (Infrastructure)
**Apps**: scholarship_api, scholarship_agent  
**Requirement**: Both must score **≥4**  
**Command**: `T+24h gate: Test Scholarship API and Scholarship Agent`

### T+48h Gate (Revenue-Critical) 💰
**Apps**: student_pilot, provider_register  
**Requirement**: Both must score **=5** (exactly 5)  
**Command**: `T+48h gate: Test Student Pilot and Provider Register`  
**Critical**: If either fails, HOLD ENTIRE ROLLOUT

### T+72h Gate (Full Rollout) 🚀
**Apps**: All 8 apps  
**Requirements**:
- auto_page_maker must score **=5** (SEO growth-critical) 🔍
- scholar_auth must score **=5** (security-critical) 🔒
- All others must score **≥4**

**Command**: `T+72h gate: Test all apps`

---

## 📄 Sample YAML Output (v2.1)

```yaml
app_name: Student Pilot
app_key: student_pilot
url_tested: https://student-pilot-jamarrlmayes.replit.app
readiness_score_0_to_5: 5
rollout_gate_status:
  gate: T+48h
  meets_gate: true
  note: "Revenue-critical app production-ready"
evidence:
  dns_tls: "Valid TLS, DNS resolves"
  http:
    status_chain: [200]
    ttfb_ms: 85
  security_headers_present:
    - HSTS
    - CSP
    - X-Frame-Options
    - X-Content-Type-Options
    - Referrer-Policy
  console_errors_count: 0
  seo:
    title: "Student Pilot - Scholar AI Advisor"
    description_present: true
    canonical_present: true
    robots_txt_accessible: true
    sitemap_xml_accessible: true
  notes:
    - "Clean load with no console errors"
    - "Payment CSP configured for Stripe"
    - "TTFB 85ms well under 120ms target"
recommended_actions:
  - "Consider adding Permissions-Policy header"
```

---

## ⚡ Performance Target

**TTFB Target**: ~120ms

All apps are evaluated against this performance baseline. The target is tracked in `evidence.http.ttfb_ms` and called out in recommendations if exceeded.

---

## 🗺️ URL-to-App Routing

| URL Host | app_key | Gate |
|----------|---------|------|
| `scholarship-api-jamarrlmayes.replit.app` | `scholarship_api` | T+24h: ≥4 |
| `scholarship-agent-jamarrlmayes.replit.app` | `scholarship_agent` | T+24h: ≥4 |
| `student-pilot-jamarrlmayes.replit.app` | `student_pilot` | T+48h: =5 💰 |
| `provider-register-jamarrlmayes.replit.app` | `provider_register` | T+48h: =5 💰 |
| `auto-page-maker-jamarrlmayes.replit.app` | `auto_page_maker` | T+72h: =5 🔍 |
| `scholar-auth-jamarrlmayes.replit.app` | `scholar_auth` | T+72h: =5 🔒 |
| `auto-com-center-jamarrlmayes.replit.app` | `auto_com_center` | T+72h: ≥4 |
| `scholarship-sage-jamarrlmayes.replit.app` | `scholarship_sage` | T+72h: ≥4 |

---

## 🔒 Hard Guardrails (Enforced)

### ✅ Allowed
- Only GET, HEAD, OPTIONS methods
- Max 1 request/path/10 seconds
- Max 20 requests total per app
- Read-only operations only

### ❌ Forbidden
- POST/PUT/PATCH/DELETE
- Form submissions
- Authentication attempts
- Cookie manipulation
- File uploads
- JS injection
- PII collection

---

## 📅 72-Hour Rollout Workflow

### Day 0 (Today) - Baseline
```
T+72h gate: Test all apps
```
1. Establish baseline scores for all 8 apps
2. Fix any apps scoring 0-2 immediately
3. Document current state

### Day 1 (T+24h) - Infrastructure
```
T+24h gate: Test Scholarship API and Scholarship Agent
```
1. Both must score ≥4
2. If pass: Enable `PROMPT_MODE=universal` for these apps
3. Monitor for issues

### Day 2 (T+48h) - Revenue Gate
```
T+48h gate: Test Student Pilot and Provider Register
```
1. Both must score exactly 5
2. **CRITICAL**: If either fails, HOLD ENTIRE ROLLOUT
3. Validate revenue events (credit_purchase_succeeded, fee_accrued)

### Day 3 (T+72h) - Full Rollout
```
T+72h gate: Test all apps
```
1. Auto Page Maker =5 (SEO-critical)
2. Scholar Auth =5 (Security-critical)
3. All others ≥4
4. Generate first `kpi_brief_generated` with non-zero ARR

---

## 🔧 Per-App Scoring Criteria

### scholarship_api
- **Score 4**: Available, basic security headers, TTFB ~120ms
- **Score 5**: Robust headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) + clean docs + TTFB ≤120ms

### scholarship_agent
- **Score 5**: Strong headers + clean load + good TTFB

### student_pilot (T+48h must =5)
- **Score 5**: Strong headers + clean load + payment CSP + good TTFB + zero severe console errors

### provider_register (T+48h must =5)
- **Score 5**: Strong headers + clean load + good TTFB + zero severe console errors

### auto_page_maker (T+72h must =5)
- **Score 5**: SEO artifacts present (robots.txt, title, canonical, sitemap.xml) + strong headers + TTFB ~120ms

### scholar_auth (T+72h must =5)
- **Score 5**: Strong headers + clean response + no console errors on public pages + good TTFB

### auto_com_center
- **Available**: 200 on login page OR 302/307 redirect to login
- **Blocker**: 404 on root (score ≤2)
- **Score 5**: Strong headers + clean load + no severe console errors + good TTFB

### scholarship_sage
- **Score 5**: Strong headers + clean load + no severe console errors + good TTFB

---

## 🎯 v2.1 Key Features

✅ **app_key field** in YAML output for programmatic processing  
✅ **120ms TTFB target** emphasized as global performance baseline  
✅ **Gate expansion logic** built-in (auto-expands to app sets)  
✅ **Hard guardrails** section for strict safety enforcement  
✅ **Testing procedure** that Agent3 must follow  
✅ **Ready-to-use commands** for operators  

---

## 📚 Full Documentation

- **System Prompt**: `docs/testing/AGENT3_SYSTEM_PROMPT.txt` (v2.1 compact)
- **Quick Start**: This file
- **Detailed Runbook**: `docs/testing/E2E_TESTING_RUNBOOK.md`
- **Framework Overview**: `docs/testing/universal_readonly_e2e_prompt.md`

---

**Ready to test!** Copy the system prompt from `docs/testing/AGENT3_SYSTEM_PROMPT.txt` and paste it into Agent3. 🚀
