# Deploy Manifest PRODUCTION

**RUN_ID:** CEOSPRINT-20260120-SEV1-HOTFIX-DEPLOY-001  
**Phase:** 3 - Unified PRODUCTION Deployment  
**Date:** 2026-01-20T07:38:00.000Z

## Deployment Bundle

This deployment bundles:

1. **WAF Hotfix**
   - XFH preserve for trusted ingress
   - _meta allowlist for infra signals
   - Prototype pollution blocking

2. **/metrics/p95 Public JSON**
   - Registered early in server pipeline
   - Bypass handler for static compliance

3. **OIDC Phase 2**
   - Trust proxy enabled
   - Secure cookie policy
   - Single body parser

4. **Probe Scheduler Mutex**
   - Jitter ±20%
   - Lock TTL for concurrency control

## Deployed Applications

| App | App ID | Public URL | Status |
|-----|--------|------------|--------|
| Student Pilot | A5 | https://student-pilot-jamarrlmayes.replit.app | DEPLOYED |
| Scholar Auth | A1 | https://scholar-auth-jamarrlmayes.replit.app | EXTERNAL |
| Auto Com Center | A8 | https://auto-com-center-jamarrlmayes.replit.app | EXTERNAL |

## Commit Information

| Component | Commit SHA | Timestamp |
|-----------|------------|-----------|
| WAF Config | 7e8d7ab7 | 2026-01-20T07:30:00Z |
| OIDC Config | (unchanged) | N/A |
| Metrics P95 | (existing) | N/A |

## Build Artifacts

| Artifact | Status |
|----------|--------|
| server/config/wafConfig.ts | MODIFIED |
| server/middleware/wafMiddleware.ts | VERIFIED |
| server/routes/metricsP95.ts | VERIFIED |
| server/replitAuth.ts | VERIFIED |
| server/index.ts | VERIFIED |

## Environment Configuration

| Variable | Status |
|----------|--------|
| APP_BASE_URL | https://student-pilot-jamarrlmayes.replit.app |
| AUTH_ISSUER_URL | https://scholar-auth-jamarrlmayes.replit.app/oidc |
| AUTO_COM_CENTER_BASE_URL | https://auto-com-center-jamarrlmayes.replit.app |

## Deployment Verification

### Pre-Deploy Checks
- [x] LSP diagnostics resolved
- [x] TypeScript compilation successful
- [x] Unit tests pass (baseline)

### Post-Deploy Checks
- [ ] /health returns 200 JSON with service marker
- [ ] /metrics/p95 returns 200 JSON
- [ ] OIDC discovery reachable
- [ ] Telemetry acceptance ≥99%

## Rollback Plan

If deployment fails:

1. Revert WAF config to STRIP_X_FORWARDED_HOST=true
2. Keep TRAFFIC_CAP=0
3. Escalate to CEO/HITL

## SHA256 Checksum

```
deploy_manifest_prod.md: (to be computed)
```
