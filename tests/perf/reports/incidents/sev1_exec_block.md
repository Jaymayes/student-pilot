# SEV-1 Executive Block

**RUN_ID:** CEOSPRINT-20260120-SEV1-HOTFIX-DEPLOY-001  
**Protocol:** AGENT3_HANDSHAKE v30 (Prod-First + Scorched Earth + 2-of-3)  
**Date:** 2026-01-20T07:30:00.000Z  
**Authority:** CEO

## Directive

HOTFIX WAF (_meta) → OIDC Phase 2 → Unified PRODUCTION Deploy

## Hard Safety Controls

| Control | Value | Status |
|---------|-------|--------|
| TRAFFIC_CAP | 0% | ACTIVE |
| LEDGER_FREEZE | true | ACTIVE |
| PROVIDER_INVOICING_PAUSED | true | ACTIVE |
| FEE_POSTINGS_PAUSED | true | ACTIVE |
| LIVE_STRIPE_CHARGES | BLOCKED | ACTIVE |

## Phase Execution Order

1. **Phase 0** - Scorched Earth + Incident stamp
2. **Phase 1** - WAF Hotfix (XFH preserve + _meta allowlist)
3. **Phase 2** - Auth/OIDC Phase 2 repairs
4. **Phase 3** - Unified PRODUCTION deployment
5. **Phase 4** - Production verification (public URLs only)
6. **Phase 5** - Telemetry acceptance (A8)
7. **Phase 6** - 10-minute Green Gate
8. **Phase 7** - Second confirmation per app
9. **Phase 8** - Finance Freeze posture validation

## Observed Issues

### WAF Regression
- Command Center WAF strips x-forwarded-host
- Blocks internal _meta metadata
- Causes probe deadlocks ("Skipping … already in progress")
- Auth breakage

### OIDC Issues
- client_id/grant_type undefined
- discovery/jwks fetch fails
- Warning: "already parsed request body"

## Verification Requirements

All PASS requires 2-of-3 (prefer 3-of-3):
1. HTTP+Trace (200 with X-Trace-Id)
2. Matching logs
3. A8 POST+GET checksum

## Request Headers (All Probes)

```
X-Trace-Id: CEOSPRINT-20260120-SEV1-HOTFIX-DEPLOY-001.<component>
X-Idempotency-Key: <UUIDv4>
Cache-Control: no-cache
```

## Stop/Abort Rules

If any public verification fails:
- Print: "Attestation: UNSTABLE (SEV-1)"
- STOP (no further changes)
- Traffic=0; Finance Freeze ACTIVE

## SHA256 Checksum

```
sev1_exec_block.md: (to be computed at end)
```
