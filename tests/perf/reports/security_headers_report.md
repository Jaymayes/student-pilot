# Security Headers Report (Run 026 - Protocol v30)

**RUN_ID:** CEOSPRINT-20260113-VERIFY-ZT3G-026

## A1 (scholar_auth)

| Header | Value | Status |
|--------|-------|--------|
| HSTS | max-age>=15552000 | PASS |
| Set-Cookie | SameSite=None; Secure | PASS |

## A5 (student_pilot)

| Header | Value | Status |
|--------|-------|--------|
| HSTS | max-age=31536000; includeSubDomains; preload | PASS |
| CSP | self + js.stripe.com + api.stripe.com | PASS |
| X-Frame-Options | DENY | PASS |
| X-Content-Type-Options | nosniff | PASS |

## CSP Stripe Allowlist

| Domain | Directive | Status |
|--------|-----------|--------|
| js.stripe.com | script-src | ALLOWED |
| api.stripe.com | connect-src | ALLOWED |
| hooks.stripe.com | frame-src | ALLOWED |

## Verdict

PASS: All security headers compliant.
