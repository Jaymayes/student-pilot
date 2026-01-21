# Security Headers Report

**RUN_ID**: CEOSPRINT-20260121-EXEC-ZT3G-G5-FIN-READY-046
**Generated**: 2026-01-21T02:05:00Z
**Endpoint Tested**: https://student-pilot-jamarrlmayes.replit.app/api/health

## Security Headers

| Header | Status | Value |
|--------|--------|-------|
| Content-Security-Policy | ✅ PRESENT | default-src 'self'; script-src 'self' https://js.stripe.com; ... |
| Strict-Transport-Security | ✅ PRESENT | max-age=63072000; includeSubDomains; preload |
| X-Content-Type-Options | ✅ PRESENT | nosniff |
| X-Frame-Options | ✅ PRESENT | DENY |
| Referrer-Policy | ✅ PRESENT | strict-origin-when-cross-origin |

## CSP Analysis

| Directive | Value | Verdict |
|-----------|-------|---------|
| default-src | 'self' | ✅ Restrictive |
| script-src | 'self' https://js.stripe.com | ✅ Stripe allowed |
| frame-src | https://js.stripe.com https://hooks.stripe.com | ✅ Stripe embeds allowed |
| connect-src | 'self' + microservices | ✅ API endpoints allowed |
| object-src | 'none' | ✅ Blocked |
| base-uri | 'none' | ✅ Blocked |

## Cookie Security

| Cookie | Secure | HttpOnly | SameSite | Notes |
|--------|--------|----------|----------|-------|
| GAESA | ⚠️ | ⚠️ | ⚠️ | Replit infrastructure cookie (not application-controlled) |
| Session | ✅ | ✅ | Lax | Application session cookie (configured in server/index.ts) |

**Note**: The GAESA cookie is set by Replit's infrastructure and is not controlled by the application. The application's session cookie is properly configured with Secure, HttpOnly, and SameSite flags.

## HSTS Configuration

- max-age: 63072000 seconds (2 years)
- includeSubDomains: Yes
- preload: Yes

---

**Security Headers Verdict**: ✅ PASS (all critical headers present)
