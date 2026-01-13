# Security Headers Report (Golden Record - Run 028)

**RUN_ID:** CEOSPRINT-20260113-VERIFY-ZT3G-028

## A1 (scholar_auth)

| Header | Value | Status |
|--------|-------|--------|
| HSTS | max-age>=15552000 | PASS |
| Set-Cookie | SameSite=None; Secure; HttpOnly | PASS |

## A5 (student_pilot)

| Header | Value | Status |
|--------|-------|--------|
| HSTS | max-age=31536000; includeSubDomains; preload | PASS |
| CSP | self + js.stripe.com + api.stripe.com | PASS |
| X-Frame-Options | DENY | PASS |
| X-Content-Type-Options | nosniff | PASS |

**Verdict:** PASS
