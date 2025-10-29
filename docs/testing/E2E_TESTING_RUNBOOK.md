# Universal E2E Testing Runbook for Agent3

## Overview

This runbook provides step-by-step instructions for running read-only E2E tests across all 8 Scholar AI Advisor apps using the CEO-approved Universal Read-Only E2E Test Prompt.

## Prerequisites

- Access to Agent3 with the universal test prompt loaded
- Network access to all 8 production app URLs
- No special credentials required (read-only tests only)

## Quick Start

### Single App Test

```bash
# Pass the app URL to Agent3
Agent3: "Test https://student-pilot-jamarrlmayes.replit.app"
```

### All Apps Test

```bash
# Test all 8 apps sequentially
Agent3: "Test all Scholar AI Advisor apps"
```

## App URLs Reference

| App Name | URL | Type |
|----------|-----|------|
| Auto Com Center | https://auto-com-center-jamarrlmayes.replit.app | Admin Dashboard |
| Scholarship Agent | https://scholarship-agent-jamarrlmayes.replit.app | Public Frontend |
| Scholarship Sage | https://scholarship-sage-jamarrlmayes.replit.app | Public Frontend |
| Scholarship API | https://scholarship-api-jamarrlmayes.replit.app | API/Backend |
| Student Pilot | https://student-pilot-jamarrlmayes.replit.app | Auth Frontend |
| Provider Register | https://provider-register-jamarrlmayes.replit.app | Public Frontend |
| Auto Page Maker | https://auto-page-maker-jamarrlmayes.replit.app | Public Frontend (SEO) |
| Scholar Auth | https://scholar-auth-jamarrlmayes.replit.app | Auth Service |

## Rollout Gate Validation

### T+24h Gate (Infrastructure)

**Required**: Scholarship API and Scholarship Agent ≥ 4

```bash
# Test infrastructure apps
Agent3: "Test https://scholarship-api-jamarrlmayes.replit.app"
Agent3: "Test https://scholarship-agent-jamarrlmayes.replit.app"
```

**Pass Criteria**:
- Both apps score ≥ 4
- DNS/TLS valid
- Core endpoints responding
- Security headers present

### T+48h Gate (Revenue)

**Required**: Student Pilot and Provider Register = 5

```bash
# Test revenue apps
Agent3: "Test https://student-pilot-jamarrlmayes.replit.app"
Agent3: "Test https://provider-register-jamarrlmayes.replit.app"
```

**Pass Criteria**:
- Both apps score exactly 5
- Payment provider CSP compatible
- No console errors
- All security headers present

### T+72h Gate (Full Rollout)

**Required**: All apps ≥ 4; Auto Page Maker and Scholar Auth = 5

```bash
# Test all apps
Agent3: "Test all Scholar AI Advisor apps"
```

**Pass Criteria**:
- Auto Page Maker score = 5 (SEO critical)
- Scholar Auth score = 5 (Security critical)
- All other apps score ≥ 4
- No DNS/TLS failures

## Interpreting Readiness Scores

| Score | Status | Action |
|-------|--------|--------|
| 0 | Not Reachable | STOP - Fix DNS/TLS/deployment |
| 1 | Major Blockers | STOP - Fix critical issues |
| 2 | Critical Issues | HOLD - Address before rollout |
| 3 | Non-Critical Issues | PROCEED - Monitor issues |
| 4 | Near-Ready | PROCEED - Address minor issues post-launch |
| 5 | Production-Ready | PROCEED - No action required |

## Evidence Collected Per App

### All Apps (Global Checks)
- ✅ DNS resolution
- ✅ TLS validity
- ✅ HTTP status codes
- ✅ TTFB and load time
- ✅ Security headers (HSTS, CSP, X-Frame-Options, etc.)
- ✅ Console errors count
- ✅ Screenshot (above-the-fold)

### Public Frontend Apps (Additional)
- ✅ SEO metadata (title, description, canonical)
- ✅ robots.txt and sitemap.xml
- ✅ Accessibility basics (lang, alt, landmarks)
- ✅ Internal linking quality

### API/Backend Apps (Additional)
- ✅ Health endpoints (/health, /status, /metrics)
- ✅ API documentation (/docs, /openapi.json)
- ✅ CORS headers
- ✅ JSON response validation

### Auth Apps (Additional)
- ✅ Cookie security flags (Secure, HttpOnly, SameSite)
- ✅ CSRF token presence
- ✅ No credential leakage
- ✅ Login UI loads without errors

## Safety Guardrails

### ✅ Enforced Behaviors
- Only GET, HEAD, OPTIONS methods
- Max 1 request per path per 10 seconds
- Max 20 requests total per app
- User-Agent: `ScholarAI-ReadOnlyProbe/1.0`
- Exponential backoff on rate limits
- Respect robots.txt

### ❌ Prohibited Behaviors
- POST, PUT, PATCH, DELETE requests
- Form submissions
- Authentication/login attempts
- Cookie/session manipulation
- File uploads
- State mutations
- PII collection
- Brute-force attempts

## Troubleshooting

### App Returns 0 (Not Reachable)

1. Verify URL is correct
2. Check DNS resolution manually
3. Validate SSL certificate
4. Check app deployment status
5. Review firewall/IP restrictions

### App Returns 1-2 (Blockers/Critical Issues)

1. Review console errors in report
2. Check missing security headers
3. Verify JavaScript loads correctly
4. Check for broken assets
5. Review redirect chains

### Rate Limited (429 Response)

- Agent3 will automatically back off
- Wait 60 seconds between retry attempts
- If persistent, note in report and proceed

## Report Output

Each test produces a structured report:

```yaml
app_name: Student Pilot
app_url: https://student-pilot-jamarrlmayes.replit.app
timestamp_utc: 2025-10-28T18:00:00Z
availability:
  dns_ok: true
  tls_ok: true
  http_status: 200
  redirects: []
performance:
  ttfb_ms: 85
  notes: "Fast initial load"
security_headers:
  present: [HSTS, CSP, X-Frame-Options, X-Content-Type-Options]
  missing: [Permissions-Policy]
console_errors_count: 0
seo_check:
  title_present: true
  meta_description_present: true
  canonical_present: true
  robots_txt: present
  sitemap_xml: present
accessibility_quick_scan:
  html_lang_present: true
  above_fold_img_alt_present: true
  landmark_roles_present: true
key_findings:
  - Clean load with no console errors
  - All critical security headers present
  - Payment provider CSP configured
readiness_score_0_to_5: 5
recommended_actions:
  - Consider adding Permissions-Policy header
```

## Timeline Integration

### Day 0 (Today)
- Run baseline tests on all 8 apps
- Document current readiness scores
- Identify any score 0-2 apps requiring immediate attention

### Day 1 (T+24h)
- Re-test Scholarship API and Scholarship Agent
- Validate both apps ≥ 4
- Proceed to enable universal mode for these apps

### Day 2 (T+48h)
- Re-test Student Pilot and Provider Register
- Validate both apps = 5
- Proceed with revenue app rollout

### Day 3 (T+72h)
- Re-test all 8 apps
- Validate Auto Page Maker and Scholar Auth = 5
- Validate all other apps ≥ 4
- Proceed with full rollout

## Contact

For questions or issues with the testing framework:
- See: `docs/testing/AGENT3_UNIVERSAL_E2E_PROMPT.txt`
- See: `docs/testing/universal_readonly_e2e_prompt.md`
- Review: `docs/system-prompts/CEO_DIRECTIVE.md`
