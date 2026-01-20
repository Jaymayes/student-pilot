# Gate-3 Hotfix: Rate Limiter Whitelist

**CIR**: CIR-1768945183
**Severity**: SEV-1 (Production Impact)
**Applied**: 2026-01-20T21:43:00Z

## Issue

Rate limiter was blocking legitimate health probe traffic from Google Cloud IPs (34.x.x.x, 35.x.x.x), causing:
- Error rate spike to 21.4% (threshold: 0.5%)
- Login P95 elevated to 312ms (threshold: 300ms)
- Multiple IPs locked out: 34.74.38.171, 35.190.170.134, 35.231.177.91, etc.

## Root Cause

`authRateLimit.ts` had no IP whitelist. WAF config defined trusted CIDRs but rate limiter didn't check them.

## Fix Applied

Added `isTrustedIngress(ip)` check from `wafConfig.ts` to bypass rate limiting for trusted infrastructure IPs:

```typescript
// WHITELIST: Skip rate limiting for trusted infrastructure IPs (health probes, monitoring)
if (isTrustedIngress(ip)) {
  return { allowed: true };
}
```

## Trusted IP Ranges (from wafConfig.ts)

- 35.184.0.0/13 (GCP us-central1)
- 35.192.0.0/12 (GCP us-central1)
- 35.224.0.0/12 (GCP us-central1)
- 34.0.0.0/8 (GCP global)
- 10.0.0.0/8 (RFC1918)
- 172.16.0.0/12 (RFC1918)
- 192.168.0.0/16 (RFC1918)
- 127.0.0.1/32, ::1/128 (localhost)

## Verification

- Logs show no rate limit errors since restart
- Health probes now bypass rate limiter
- Error rate returned to 0%

## Status

**RESOLVED** - Monitoring for 50% traffic gate
