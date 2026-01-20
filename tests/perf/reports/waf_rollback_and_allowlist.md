# WAF Rollback and Allowlist Report

**CIR ID:** CIR-1768893338  
**Phase:** 1 - WAF Emergency Rollback  
**Date:** 2026-01-20T07:21:00.000Z

## Summary

WAF configuration rolled back to preserve `x-forwarded-host` header for trusted ingress while maintaining security posture.

## Configuration Changes

### Before (Broken)
```
WAF_STRIP_X_FORWARDED_HOST=true  (CAUSED OIDC FAILURE)
```

### After (Fixed)
```
WAF_STRIP_X_FORWARDED_HOST=false  (ROLLED BACK)
WAF_ALLOWLIST_XFH=true
```

## Allowlist Configuration

### Trusted Ingress CIDRs
```
35.192.0.0/12   - GCP us-central1
35.224.0.0/12   - GCP us-central1
34.0.0.0/8      - GCP global
136.0.0.0/8     - Additional cloud infra
10.0.0.0/8      - Private RFC1918 (internal)
172.16.0.0/12   - Private RFC1918 (internal)
192.168.0.0/16  - Private RFC1918 (internal)
```

### Trusted Internals
```
127.0.0.1/32    - IPv4 localhost
::1/128         - IPv6 localhost
```

### Allowed Host Suffixes
```
.replit.app
.replit.co
.replit.dev
.scholaraiadvisor.com
.scholar-auth.replit.app
```

## Policy Pseudocode

```
function shouldPreserveXForwardedHost(clientIp, host):
  if NOT WAF_ALLOWLIST_XFH:
    return false
    
  if clientIp IN WAF_TRUSTED_INGRESS_CIDRS OR clientIp IN WAF_TRUSTED_INTERNALS:
    if host ENDSWITH any of WAF_ALLOWED_HOST_SUFFIXES:
      return true  // PRESERVE x-forwarded-host
      
  return false  // STRIP x-forwarded-host
```

## Underscore Key Policy

```
UNDERSCORE_KEY_POLICY=log_and_drop
UNDERSCORE_KEYS_BLOCKED=[_meta, _internal, _debug]
```

**Behavior:** Log and drop underscore keys from telemetry payloads; do NOT 4xx the entire request.

## SEV-1 Bypass Mode

```
SEV1_MODE=true
SEV1_BYPASS_HEADER_VALIDATION=true
```

When in SEV-1 mode:
- Auto-generate X-Trace-Id if missing
- Auto-generate X-Idempotency-Key if missing
- Log bypass events for audit

## Files Created/Modified

| File | Action |
|------|--------|
| server/config/wafConfig.ts | CREATED |
| server/middleware/wafMiddleware.ts | CREATED |
| server/index.ts | MODIFIED (added WAF middleware) |

## Verification

- [ ] x-forwarded-host preserved for trusted ingress
- [ ] Header stripping disabled
- [ ] Underscore keys dropped without 4xx
- [ ] SEV-1 bypass active

## SHA256 Checksum

```
waf_rollback_and_allowlist.md: (to be computed)
```
