# Security Headers Report

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-027  
**Generated:** 2026-01-17T18:37:00.000Z

## A5 (Student Pilot) Security Headers

| Header | Value | Status |
|--------|-------|--------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains | **PASS** (>15552000) |
| Content-Security-Policy | default-src 'self'; script-src 'self' https://js.stripe.com; connect-src 'self' https://api.stripe.com... | **PASS** |
| X-Frame-Options | DENY | **PASS** |
| X-Content-Type-Options | nosniff | **PASS** |
| X-DNS-Prefetch-Control | off | **PASS** |
| Referrer-Policy | strict-origin-when-cross-origin | **PASS** |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), payment=() | **PASS** |
| Cross-Origin-Opener-Policy | same-origin | **PASS** |
| Cross-Origin-Resource-Policy | same-origin | **PASS** |

## CSP Details

```
default-src 'self';
base-uri 'none';
object-src 'none';
frame-ancestors 'none';
img-src 'self' data:;
script-src 'self' https://js.stripe.com;
style-src 'self';
font-src 'self' data:;
connect-src 'self' https://scholarship-api-jamarrlmayes.replit.app https://auto-com-center-jamarrlmayes.replit.app https://auto-page-maker-jamarrlmayes.replit.app https://api.stripe.com;
frame-src https://js.stripe.com https://hooks.stripe.com;
form-action 'self' https://hooks.stripe.com
```

## Cookie Security (A1)

- GAESA cookie present
- Expiration: 30-day rolling
- **Note:** SameSite=None; Secure; HttpOnly verification requires authenticated session probe

## Verdict

**PASS** - All required security headers present with compliant values.
