# Security Headers Report

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-035  
**Generated:** 2026-01-17T21:36:00.000Z  
**Endpoint Tested:** https://student-pilot-jamarrlmayes.replit.app/api/health

## A5 (Student Pilot) Security Headers

| Header | Value | Status |
|--------|-------|--------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains | **PASS** (>15552000) |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | **PASS** (additional) |
| Content-Security-Policy | (see below) | **PASS** |
| X-Frame-Options | DENY | **PASS** |
| X-Content-Type-Options | nosniff | **PASS** |

## Content-Security-Policy Details

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

### CSP Analysis

| Directive | Value | Assessment |
|-----------|-------|------------|
| default-src | 'self' | Restrictive default |
| script-src | 'self' + js.stripe.com | Only Stripe JS allowed |
| frame-src | Stripe domains | Required for checkout iframe |
| connect-src | Self + ecosystem APIs | Proper API whitelisting |
| frame-ancestors | 'none' | Clickjacking prevention |
| object-src | 'none' | Flash/plugin blocking |
| base-uri | 'none' | Base tag injection prevention |

## HSTS Compliance

| Check | Value | Requirement | Status |
|-------|-------|-------------|--------|
| max-age | 63072000 (2 years) | ≥15552000 (180 days) | **PASS** |
| includeSubDomains | Present | Recommended | **PASS** |
| preload | Present (secondary header) | Optional | **PASS** |

## Clickjacking Prevention

| Check | Status |
|-------|--------|
| X-Frame-Options: DENY | **PASS** |
| CSP frame-ancestors: 'none' | **PASS** |

## Content Type Sniffing

| Check | Status |
|-------|--------|
| X-Content-Type-Options: nosniff | **PASS** |

## Data Integrity

| Check | Status |
|-------|--------|
| No PII in logs | **PASS** |
| UI reflects API data only | **PASS** |
| No mock data in production | **PASS** |

## Verdict

**PASS** - All required security headers present with compliant values:
- HSTS properly configured (2 years, includes subdomains)
- CSP restricts resources to self + Stripe domains
- Clickjacking prevention via X-Frame-Options + CSP
- Content sniffing blocked
