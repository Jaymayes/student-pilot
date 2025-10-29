# Agent3 E2E Testing - Operator Quick Start (v2.1 Compact)

## 🚀 How to Use

### Step 1: Paste the Universal Prompt into Agent3
1. Open `docs/testing/AGENT3_SYSTEM_PROMPT.txt`
2. Copy the entire prompt (from "BEGIN" to "END")
3. Paste into Agent3 as the **System message**

### Step 2: Run Tests

**Single App Tests:**
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

**Gate Tests:**
```
T+24h gate: Test Scholarship API and Scholarship Agent
T+48h gate: Test Student Pilot and Provider Register
T+72h gate: Test all apps
```

### Step 3: Review YAML Reports
Agent3 returns YAML per app with readiness score, gate status, evidence, and recommended actions. Fix issues and re-run until gates pass.

---

## 📊 Understanding Scores

| Score | Status | Decision |
|-------|--------|----------|
| **0** | Unreachable | 🛑 STOP - DNS/TLS/HTTP failure |
| **1** | Barely reachable | 🛑 STOP - Major issues |
| **2** | Loads but unstable | ⚠️ HOLD - Missing key headers |
| **3** | Mostly OK | ✅ PROCEED with monitoring |
| **4** | Production-ready with minor gaps | ✅ PROCEED |
| **5** | Fully production-grade | ✅ PROCEED - Ship it! |

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

## 📄 Sample YAML Output (v2.1 Compact)

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
    content_type: "text/html; charset=utf-8"
  security_headers_present:
    - HSTS
    - CSP
    - X-Frame-Options
    - X-Content-Type-Options
    - Referrer-Policy
  robots_sitemap:
    robots_txt: present
    sitemap_xml: present
  console_errors_count: 0
  notes:
    - "Clean load with no console errors"
    - "Payment CSP configured for Stripe"
    - "TTFB 85ms well under 120ms target"
    - "All critical security headers present"
recommended_actions:
  - "Consider adding Permissions-Policy header"
  - "Monitor TTFB trends under load"
```

---

## ⚡ Performance Target

**TTFB Target**: ~120ms

All apps are evaluated against this performance baseline. The target is tracked in `evidence.http.ttfb_ms` and called out in recommendations if exceeded.

---

## 🗺️ URL-to-App Routing

| URL Pattern | app_key | Gate Requirement |
|-------------|---------|------------------|
| `scholarship-api-*.replit.app` | `scholarship_api` | T+24h: ≥4 |
| `scholarship-agent-*.replit.app` | `scholarship_agent` | T+24h: ≥4 |
| `student-pilot-*.replit.app` | `student_pilot` | T+48h: =5 💰 |
| `provider-register-*.replit.app` | `provider_register` | T+48h: =5 💰 |
| `auto-page-maker-*.replit.app` | `auto_page_maker` | T+72h: =5 🔍 |
| `scholar-auth-*.replit.app` | `scholar_auth` | T+72h: =5 🔒 |
| `auto-com-center-*.replit.app` | `auto_com_center` | T+72h: ≥4 |
| `scholarship-sage-*.replit.app` | `scholarship_sage` | T+72h: ≥4 |
| Unknown/other host | `unknown_host` | Graceful error report |

---

## 🔒 Global Guardrails (Enforced)

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
- Session creation
- File uploads
- JS injection
- PII collection

### 🛡️ Compliance
- FERPA/COPPA-aligned testing
- No sensitive data storage
- Benign crawler behavior

---

## 🎯 Per-App Module Criteria

### 1. scholarship_api
**Goal**: API availability/perf/security surface spot-check (read-only)  
**Checks**: 200 on base/health endpoints, CORS and cache headers, TTFB  
**Score 5**: Robust headers + clean docs + TTFB ≤120ms

### 2. scholarship_agent
**Goal**: Agent service availability and readiness  
**Checks**: Successful landing/health, CSP and basic security headers, TTFB  
**Score 5**: Strong headers + clean load + good TTFB

### 3. student_pilot (B2C revenue-critical; must be =5 at T+48h)
**Goal**: Checkout-readiness posture (read-only)  
**Checks**: Stripe presence allowed in CSP, strong headers, clean console, fast TTFB  
**Score 5**: Strong headers + clean load + payment CSP + good TTFB + zero severe console errors

### 4. provider_register (B2B revenue-critical; must be =5 at T+48h)
**Goal**: Registration funnel posture (read-only)  
**Checks**: Strong headers, CSP supporting payment/AI services, no console errors, fast TTFB  
**Score 5**: Strong headers + clean load + good TTFB + zero severe console errors

### 5. auto_page_maker (SEO-critical; must be =5 at T+72h)
**Goal**: SEO readiness (read-only)  
**Checks**: robots.txt, sitemap.xml, canonical tags, fast TTFB, strong headers, zero console errors  
**Score 5**: SEO artifacts present + strong headers + TTFB ~120ms + zero console errors

### 6. scholar_auth (security-critical; must be =5 at T+72h)
**Goal**: Auth surface hardening (read-only)  
**Checks**: HSTS (long max-age), strong CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, fast TTFB, zero console errors  
**Score 5**: All security headers + clean response + no console errors + good TTFB

### 7. auto_com_center
**Goal**: Command center availability and dashboard load (read-only)  
**Checks**: 200 on root/health, core assets load, strong headers, TTFB tracked  
**Score 5**: Strong headers + clean load + no severe console errors + good TTFB

### 8. scholarship_sage
**Goal**: Assistant surface availability (read-only)  
**Checks**: Landing reachable, security headers present, no console errors, TTFB tracked  
**Score 5**: Strong headers + clean load + no severe console errors + good TTFB

---

## 📋 Evidence Collection

For each app, Agent3 collects:

1. **DNS/TLS**: Resolved, TLS-valid (or errors if any)
2. **HTTP**: status_chain, ttfb_ms, content_type, basic cache headers
3. **Security Headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, others
4. **SEO** (if applicable): robots.txt present, sitemap.xml present
5. **Console Errors**: Count (if feasible in read-only fetch+render mode)
6. **Notes**: Concise bullet observations (max ~5)

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

## 🎯 v2.1 Compact Key Features

✅ **Auto-routing by host** - Infers app_key from URL pattern  
✅ **Modular design** - Applies only the relevant app module  
✅ **120ms TTFB target** - Global performance benchmark  
✅ **Gate auto-expansion** - Built-in gate mapping  
✅ **Hard guardrails** - FERPA/COPPA-aligned, read-only  
✅ **Structured YAML output** - Programmatic processing ready  
✅ **Per-app scoring criteria** - Clear success metrics  
✅ **Unknown host handling** - Graceful error reports  

---

## 🔧 Testing Procedure (Agent3 Follows)

1. **Determine scope**
   - If input is "Test <url>": infer app_key from host and test only that app
   - If input is a gate command: expand to the correct set of apps and test each

2. **For each app**
   - Resolve DNS/TLS
   - Perform minimal fetches under guardrails
   - Capture evidence
   - Assign score using rubric and app module criteria
   - Evaluate gate

3. **Emit YAML**
   - Exactly per the schema
   - Separate multiple apps with '---'

4. **Handle errors gracefully**
   - If host unknown or unreachable: set readiness_score_0_to_5 to 0 or 1
   - Include clear error note in evidence

---

## 📚 Full Documentation

- **System Prompt**: `docs/testing/AGENT3_SYSTEM_PROMPT.txt` (v2.1 compact - copy-paste ready)
- **Quick Start**: This file
- **Detailed Runbook**: `docs/testing/E2E_TESTING_RUNBOOK.md`
- **Framework Overview**: `docs/testing/universal_readonly_e2e_prompt.md`

---

**Ready to test!** Copy the system prompt from `docs/testing/AGENT3_SYSTEM_PROMPT.txt` and paste it into Agent3. 🚀
