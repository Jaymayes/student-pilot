# Universal Read-Only E2E Test Prompt for Agent3

## Prime Objective

Evaluate the readiness of each Scholar AI Advisor app for production by running only read-only, non-mutating tests.
- Do not change any data, configuration, or state
- Do not submit forms, perform POST/PUT/PATCH/DELETE requests, or trigger side effects
- Produce a structured report of findings and a readiness score for each app

## Scope

1. **Auto Com Center**: https://auto-com-center-jamarrlmayes.replit.app
2. **Scholarship Agent**: https://scholarship-agent-jamarrlmayes.replit.app
3. **Scholarship Sage**: https://scholarship-sage-jamarrlmayes.replit.app
4. **Scholarship API**: https://scholarship-api-jamarrlmayes.replit.app
5. **Student Pilot**: https://student-pilot-jamarrlmayes.replit.app
6. **Provider Register**: https://provider-register-jamarrlmayes.replit.app
7. **Auto Page Maker**: https://auto-page-maker-jamarrlmayes.replit.app
8. **Scholar Auth**: https://scholar-auth-jamarrlmayes.replit.app

## Instructions: Use Only the Relevant Section Per App

- **Frontend Web App (public)**: Auto Page Maker, Scholarship Agent, Scholarship Sage, Provider Register
- **Frontend Web App (authenticated)**: Student Pilot
- **API/Backend Service**: Scholarship API
- **Auth Service**: Scholar Auth
- **Internal/Admin Dashboard**: Auto Com Center

## Global Read-Only Guardrails

- **Allowed HTTP methods**: GET, HEAD, OPTIONS only
- Do not authenticate or submit any credentials unless explicit test-only credentials are provided
- Do not submit any forms; intercept and prevent all form submissions
- Treat 3xx responses as success if navigation completes
- Capture screenshots and headers for evidence; collect console errors
- Do not store PII

## Core Evidence to Collect (Every App)

1. **Availability**: HTTP status (200–399), DNS/TLS reachable
2. **Performance**: Client-side TTFB and DOMContentLoaded timing (best effort)
3. **Console errors**: Count and examples
4. **Security headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
5. **SEO (public pages)**: title, meta description, canonical, robots meta, robots.txt, sitemap.xml
6. **Accessibility spot-check**: main landmarks, alt attributes for above-the-fold images

## Per-App Relevant Checks

### Public Frontend
- Landing loads <~3s
- No blocking console errors
- Basic SEO present
- Key GET-only nav works
- No mixed-content

### Authenticated Frontend
- Login UI visible
- Protected routes redirect to login
- Privacy/terms visible

### API Service
- GET /, /health, /status, /metrics (read-only)
- OpenAPI doc accessible
- CORS headers reasonable
- JSON types correct

### Auth Service
- Login UI loads
- Reset/signup links visible
- Cookies flags (Secure, HttpOnly, SameSite) if set
- CSRF token present (no submission)

### Internal/Admin
- Dashboard loads
- Read-only sections render
- Charts render without console errors

## Deliverables

1. **App-by-app report**: Availability, Perf snapshot, Security headers, Console errors, SEO/accessibility as applicable
2. **Issues**: Categorized High/Medium/Low
3. **Readiness score (0–5)**:
   - 0: Not reachable
   - 1: Major blockers
   - 2: Critical issues
   - 3: Usable non-critical issues
   - 4: Near-ready
   - 5: Production-ready

## How to Execute

Use the provided bundle:
- Frontend smoke via Playwright: `frontend/tests/smoke.spec.js`
- Backend read-only checks via pytest: `backend/tests/test_readonly_endpoints.py`
- Initial readiness probe: `reporting/generate_readiness_report.py`

Run on a workstation with internet access.
Export findings into `reporting/report_template.md` as `report_<YYYYMMDD_HHMM>.md`
Do not attempt POST/PUT/PATCH/DELETE.

## Output Format

Single Markdown report with summary table, per-app evidence, and final readiness scores. No changes proposed—report only.

## Readiness Scoring Guide (0–5)

- **0**: Not reachable
- **1**: Major blockers (SSL/JS errors prevent use or missing root route)
- **2**: Loads but critical issues (broken primary nav, severe console errors, no security headers)
- **3**: Usable with non-critical issues
- **4**: Near-ready (minor issues only)
- **5**: Production-ready (solid availability, reasonable performance, key security headers present, minimal console errors)

## Notes on Safety and Compliance

- Tests are strictly read-only
- They prevent form submissions and avoid any write operations
- No credentials are used unless you provide test-only credentials explicitly
- If an app exposes a sandbox or dry-run flag for POST endpoints, do not use it unless you have explicit permission
- This bundle is configured to avoid POST/PUT/PATCH/DELETE entirely
