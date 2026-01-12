# Security Headers Report (Run 025 - Protocol v30)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-025

---

## A1 (scholar_auth)

| Header | Value | Status |
|--------|-------|--------|
| HSTS | max-age=63072000; includeSubDomains; preload | PASS |
| CSP | Comprehensive (Stripe allowed) | PASS |
| X-Content-Type-Options | nosniff | PASS |
| X-Frame-Options | via CSP frame-ancestors | PASS |

## A5 (student_pilot) - Local

| Header | Value | Status |
|--------|-------|--------|
| HSTS | max-age=31536000; includeSubDomains; preload | PASS |
| CSP | self + stripe | PASS |
| X-Content-Type-Options | nosniff | PASS |
| X-Frame-Options | DENY | PASS |
| Permissions-Policy | Restricted | PASS |

---

## CSP Stripe.js Allowlist

| App | js.stripe.com | api.stripe.com | Status |
|-----|---------------|----------------|--------|
| A1 | ALLOWED | ALLOWED | PASS |
| A5 | ALLOWED | ALLOWED | PASS |

---

## Verdict

PASS: All security headers compliant across A1 and A5.

*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-025*
