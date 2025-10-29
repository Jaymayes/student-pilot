# Agent3 E2E Testing - Operator Quick Start (v2.1)

## 🚀 Setup (One-Time)

**Step 1: Copy the Universal Prompt into Agent3**
- Open `docs/testing/AGENT3_SYSTEM_PROMPT.txt`
- Copy the entire "UNIVERSAL READ-ONLY E2E TEST PROMPT (Agent3) — v2.1 Compact"
- Paste into Agent3 as the system message

**Step 2: Ready to Test**
- Agent3 auto-detects the app type from the URL
- Only the relevant test module executes
- All tests are strictly read-only (no mutations)
- Outputs structured YAML reports

---

## 📋 Ready-to-Use Commands

### Single App Tests

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

### Gate Tests

```
T+24h gate: Test Scholarship API and Scholarship Agent
T+48h gate: Test Student Pilot and Provider Register
T+72h gate: Test all apps
```

---

## 📊 Readiness Scores

| Score | Status | Action |
|-------|--------|--------|
| **0** | Not Reachable | 🛑 STOP - Fix deployment immediately |
| **1** | Major Blockers | 🛑 STOP - Fix critical issues |
| **2** | Critical Issues | ⚠️ HOLD - Address before rollout |
| **3** | Usable | ✅ PROCEED with monitoring |
| **4** | Near-Ready | ✅ PROCEED - Fix minor issues |
| **5** | Production-Ready | ✅ PROCEED - No action needed |

---

## 📄 Sample YAML Report (v2.1)

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
    - "All critical security headers present"
    - "Payment provider CSP configured"
recommended_actions:
  - "Consider adding Permissions-Policy header"
```

---

## 🎯 Rollout Gate Requirements

| App | app_key | T+24h | T+48h | T+72h | Critical For |
|-----|---------|-------|-------|-------|--------------|
| Auto Com Center | `auto_com_center` | - | - | ≥4 | Dashboard |
| Scholarship Agent | `scholarship_agent` | ≥4 | - | ≥4 | Infrastructure |
| Scholarship Sage | `scholarship_sage` | - | - | ≥4 | Content |
| Scholarship API | `scholarship_api` | ≥4 | - | ≥4 | Infrastructure |
| **Student Pilot** | `student_pilot` | - | **=5** | **=5** | **Revenue** 💰 |
| **Provider Register** | `provider_register` | - | **=5** | **=5** | **Revenue** 💰 |
| **Auto Page Maker** | `auto_page_maker` | - | - | **=5** | **SEO** 🔍 |
| **Scholar Auth** | `scholar_auth` | - | - | **=5** | **Security** 🔒 |

---

## 🔒 Hard Guardrails (Enforced)

### ✅ Allowed
- Only GET, HEAD, OPTIONS methods
- Max 1 request/path/10 seconds
- Max 20 requests total per app
- Benign crawler identification
- No PII collection
- No state mutations

### ❌ Prohibited
- POST/PUT/PATCH/DELETE requests
- Form submissions
- Authentication attempts
- Cookie/session manipulation
- File uploads
- Bypassing security controls

---

## 🗺️ URL-to-App Routing

Agent3 automatically routes based on the URL host:

| URL Host | app_key | App Name |
|----------|---------|----------|
| `scholarship-api-jamarrlmayes.replit.app` | `scholarship_api` | Scholarship API |
| `scholarship-agent-jamarrlmayes.replit.app` | `scholarship_agent` | Scholarship Agent |
| `student-pilot-jamarrlmayes.replit.app` | `student_pilot` | Student Pilot |
| `provider-register-jamarrlmayes.replit.app` | `provider_register` | Provider Register |
| `auto-page-maker-jamarrlmayes.replit.app` | `auto_page_maker` | Auto Page Maker |
| `scholar-auth-jamarrlmayes.replit.app` | `scholar_auth` | Scholar Auth |
| `auto-com-center-jamarrlmayes.replit.app` | `auto_com_center` | Auto Com Center |
| `scholarship-sage-jamarrlmayes.replit.app` | `scholarship_sage` | Scholarship Sage |

---

## ⚡ Per-App Testing Notes

### scholarship_api (API/Backend)
- **Gate**: T+24h (score ≥4)
- **Checks**: /, /health, /docs (OpenAPI)
- **Emphasis**: Availability, TLS, headers, TTFB <120ms
- **Score 5**: Robust headers + clean docs + fast

### scholarship_agent (Public Frontend)
- **Gate**: T+24h (score ≥4)
- **Checks**: Page loads, SEO metadata, robots.txt
- **Emphasis**: UX integrity, SEO basics
- **Score 5**: Strong headers + zero errors + SEO complete

### student_pilot (Auth Frontend, B2C)
- **Gate**: T+48h (score **=5**, revenue-critical)
- **Checks**: Public/login views, security headers, payment CSP
- **Emphasis**: Zero severe console errors
- **Score 5**: Clean load + strong headers + no errors

### provider_register (Public Frontend, B2B)
- **Gate**: T+48h (score **=5**, revenue-critical)
- **Checks**: Public entry, security headers
- **Emphasis**: Zero severe console errors
- **Score 5**: Strong headers + clean console

### auto_page_maker (SEO Frontend)
- **Gate**: T+72h (score **=5**, SEO-critical)
- **Checks**: robots.txt, sitemap.xml, canonical, TTFB
- **Emphasis**: SEO artifacts, fast response
- **Score 5**: SEO complete + TTFB <120ms

### scholar_auth (Auth Service)
- **Gate**: T+72h (score **=5**, security-critical)
- **Checks**: Public surface, security headers, cookie flags
- **Emphasis**: Ironclad security posture
- **Score 5**: Strong headers + clean public response

### auto_com_center (Admin Dashboard)
- **Gate**: T+72h (score ≥4)
- **Checks**: 200 on login OR 302/307 redirect acceptable
- **Emphasis**: 404 on root = blocker
- **Score 5**: Strong headers + clean console

### scholarship_sage (Public Frontend)
- **Gate**: T+72h (score ≥4)
- **Checks**: Availability, SEO basics, minimal errors
- **Emphasis**: Content integrity
- **Score 5**: Strong headers + clean console + SEO complete

---

## 🔧 Troubleshooting

### Score 0 (Not Reachable)
1. Verify URL is correct
2. Check DNS resolution
3. Validate SSL certificate
4. Check deployment status in Replit

### Score 1-2 (Blockers/Critical)
1. Review console errors in evidence.notes
2. Check missing security headers
3. Verify JavaScript loads correctly
4. Check for broken assets

### Rate Limited (429)
- Agent3 automatically backs off
- Wait 60 seconds between retries
- Note in report if persistent

---

## 📅 72-Hour Rollout Integration

### Day 0 (Today) - Baseline
```
T+72h gate: Test all apps
```
- Establish baseline scores
- Fix any score 0-2 apps immediately

### Day 1 (T+24h) - Infrastructure Gate
```
T+24h gate: Test Scholarship API and Scholarship Agent
```
- Both must score ≥4
- If pass: Enable universal mode for these apps

### Day 2 (T+48h) - Revenue Gate
```
T+48h gate: Test Student Pilot and Provider Register
```
- Both must score exactly 5
- **CRITICAL GATE**: Hold entire rollout if failed

### Day 3 (T+72h) - Full Rollout
```
T+72h gate: Test all apps
```
- Auto Page Maker and Scholar Auth must score 5
- All others must score ≥4
- If pass: Full universal mode rollout complete

---

## 📚 Full Documentation

- **System Prompt**: `docs/testing/AGENT3_SYSTEM_PROMPT.txt` (v2.1 compact)
- **Detailed Runbook**: `docs/testing/E2E_TESTING_RUNBOOK.md`
- **Framework Overview**: `docs/testing/universal_readonly_e2e_prompt.md`
- **Comprehensive Reference**: `docs/testing/AGENT3_UNIVERSAL_E2E_PROMPT.txt`

---

## 🎯 v2.1 Improvements

✅ **app_key field** added to YAML output for precise app identification  
✅ **Explicit URL-to-app routing** with full host mappings  
✅ **Hard Guardrails** section for clearer safety rules  
✅ **Scoring rubric** with actionable thresholds  
✅ **Ready-to-use commands** for copy-paste convenience  

---

**Ready to test!** Copy the system prompt from `docs/testing/AGENT3_SYSTEM_PROMPT.txt` and paste it into Agent3. 🚀
