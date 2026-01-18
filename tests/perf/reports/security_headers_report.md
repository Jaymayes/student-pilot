# Security Headers Report

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-033  
**Generated:** 2026-01-18T19:16:00.000Z

## A5 Security Headers

| Header | Value | Status |
|--------|-------|--------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains | **PASS** |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | **PASS** |
| Content-Security-Policy | See below | **PASS** |
| X-Frame-Options | DENY | **PASS** |
| X-Content-Type-Options | nosniff | **PASS** |

## CSP Policy Details

```
default-src 'self';
base-uri 'none';
object-src 'none';
frame-ancestors 'none';
img-src 'self' data:;
script-src 'self' https://js.stripe.com;
style-src 'self';
font-src 'self' data:;
connect-src 'self' 
  https://scholarship-api-jamarrlmayes.replit.app 
  https://auto-com-center-jamarrlmayes.replit.app 
  https://auto-page-maker-jamarrlmayes.replit.app 
  https://api.stripe.com;
frame-src https://js.stripe.com https://hooks.stripe.com;
form-action 'self' https://hooks.stripe.com
```

## Compliance Summary

| Requirement | Check | Status |
|-------------|-------|--------|
| HSTS min-age ≥15552000 | 63072000 | **PASS** |
| CSP includes Stripe | js.stripe.com, api.stripe.com | **PASS** |
| X-Frame-Options blocks framing | DENY | **PASS** |
| MIME sniffing blocked | nosniff | **PASS** |

## Verdict

**PASS** - All security headers compliant with requirements.
