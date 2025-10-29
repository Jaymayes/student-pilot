# Agent3 E2E Testing - Operator Quick Start

## 🚀 Setup (One-Time)

**Step 1: Paste the Universal Prompt into Agent3**
- Open `docs/testing/AGENT3_SYSTEM_PROMPT.txt`
- Copy the entire contents
- Paste into Agent3 as the system message

**Step 2: Ready to Test**
- Agent3 auto-detects the app type from the URL
- Only the relevant test module executes
- All tests are strictly read-only (no mutations)

---

## 📋 Usage Examples

### Single App Test

```
Test https://student-pilot-jamarrlmayes.replit.app
```

### Gate Validation Tests

**T+24h Gate (Infrastructure)**
```
T+24h gate: Test Scholarship API and Scholarship Agent
```

**T+48h Gate (Revenue-Critical)**
```
T+48h gate: Test Student Pilot and Provider Register
```

**T+72h Gate (Full Rollout)**
```
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

## 📄 Sample YAML Report

```yaml
app_name: Student Pilot
url_tested: https://student-pilot-jamarrlmayes.replit.app
readiness_score_0_to_5: 5
rollout_gate_status:
  gate: T+48h
  meets_gate: true
  note: "Revenue-critical app production-ready"
evidence:
  dns_tls: "Valid TLS, DNS resolves"
  http:
    status_chain: [{code: 200}]
    ttfb_ms: 85
  security_headers_present: [HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy]
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

| App | Type | T+24h | T+48h | T+72h | Critical For |
|-----|------|-------|-------|-------|--------------|
| Auto Com Center | Admin | - | - | ≥4 | Dashboard |
| Scholarship Agent | Public | ≥4 | - | ≥4 | Infrastructure |
| Scholarship Sage | Public | - | - | ≥4 | Content |
| Scholarship API | API | ≥4 | - | ≥4 | Infrastructure |
| **Student Pilot** | Auth/B2C | - | **=5** | **=5** | **Revenue** 💰 |
| **Provider Register** | Public/B2B | - | **=5** | **=5** | **Revenue** 💰 |
| **Auto Page Maker** | SEO | - | - | **=5** | **SEO** 🔍 |
| **Scholar Auth** | Auth | - | - | **=5** | **Security** 🔒 |

---

## 🔒 Safety Guarantees

### ✅ Enforced
- Only GET, HEAD, OPTIONS methods
- Max 1 request/path/10 seconds
- Max 20 requests total per app
- User-Agent: `ScholarAI-ReadOnlyProbe/1.0`
- No PII collection
- No state mutations

### ❌ Prohibited
- POST/PUT/PATCH/DELETE requests
- Form submissions
- Authentication attempts
- Cookie/session manipulation
- File uploads

---

## 📱 Quick Commands Reference

### Single App Tests
```
Test https://auto-com-center-jamarrlmayes.replit.app
Test https://scholarship-agent-jamarrlmayes.replit.app
Test https://scholarship-sage-jamarrlmayes.replit.app
Test https://scholarship-api-jamarrlmayes.replit.app
Test https://student-pilot-jamarrlmayes.replit.app
Test https://provider-register-jamarrlmayes.replit.app
Test https://auto-page-maker-jamarrlmayes.replit.app
Test https://scholar-auth-jamarrlmayes.replit.app
```

### Gate Tests
```
T+24h gate: Test Scholarship API and Scholarship Agent
T+48h gate: Test Student Pilot and Provider Register
T+72h gate: Test all apps
```

---

## ⚡ App-Specific Notes

### Auto Com Center (Admin Dashboard)
- 200 on login page OR 302/307 to login = acceptable
- 404 on root = blocker
- Do NOT attempt authentication
- Focus: availability, security headers, no critical errors

### Student Pilot & Provider Register (Revenue-Critical)
- **MUST score 5 for T+48h gate**
- Check CSP supports payment providers (Stripe)
- Verify cookie security flags
- Zero critical console errors required

### Auto Page Maker (SEO-Critical)
- **MUST score 5 for T+72h gate**
- robots.txt and sitemap.xml required
- Canonical tags required
- Fast TTFB required

### Scholar Auth (Security-Critical)
- **MUST score 5 for T+72h gate**
- Ironclad security headers
- Cookie flags: Secure, HttpOnly, SameSite
- CSRF token presence verified

---

## 🔧 Troubleshooting

### Score 0 (Not Reachable)
1. Verify URL is correct
2. Check DNS resolution
3. Validate SSL certificate
4. Check deployment status in Replit

### Score 1-2 (Blockers/Critical)
1. Review console errors in evidence
2. Check missing security headers
3. Verify JavaScript loads correctly
4. Check for broken assets

### Rate Limited (429)
- Agent3 automatically backs off
- Wait 60 seconds between retries
- Note in report if persistent

---

## 📚 Full Documentation

- **System Prompt**: `docs/testing/AGENT3_SYSTEM_PROMPT.txt` (copy-paste ready)
- **Detailed Runbook**: `docs/testing/E2E_TESTING_RUNBOOK.md`
- **Framework Overview**: `docs/testing/universal_readonly_e2e_prompt.md`
- **Comprehensive Reference**: `docs/testing/AGENT3_UNIVERSAL_E2E_PROMPT.txt`

---

## 🎯 72-Hour Rollout Integration

### Day 0 (Today)
```
T+72h gate: Test all apps
```
- Establish baseline scores
- Fix any score 0-2 apps immediately

### Day 1 (T+24h)
```
T+24h gate: Test Scholarship API and Scholarship Agent
```
- Both must score ≥4
- If pass: Enable universal mode for these apps

### Day 2 (T+48h)
```
T+48h gate: Test Student Pilot and Provider Register
```
- Both must score exactly 5
- If pass: Enable universal mode for revenue apps
- **CRITICAL GATE**: Hold entire rollout if failed

### Day 3 (T+72h)
```
T+72h gate: Test all apps
```
- Auto Page Maker and Scholar Auth must score 5
- All others must score ≥4
- If pass: Full universal mode rollout complete

---

**Ready to test!** Copy the system prompt from `docs/testing/AGENT3_SYSTEM_PROMPT.txt` and paste it into Agent3. 🚀
