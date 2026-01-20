# SEV-1 INCIDENT DECLARATION

**CIR ID:** CIR-1768893338  
**Declared:** 2026-01-20T07:15:38.000Z  
**Severity:** SEV-1 (CRITICAL)  
**Status:** ACTIVE

## Root Cause

WAF regression stripped `x-forwarded-host` header, breaking:
- Auth (OIDC) - cannot resolve canonical base URL
- Internal health checks returning 410 Gone
- Synthetic monitors using localhost (forbidden)

## Decision Block

| Control | Value |
|---------|-------|
| INCIDENT_MODE | SEV-1 |
| TRAFFIC_CAP | 0% |
| LEDGER_FREEZE | true |
| PROVIDER_INVOICING_PAUSED | true |
| FEE_POSTINGS_PAUSED | true |

## Anti-False-Positive Controls

- External public URLs only
- Cache-Control: no-cache on all probes
- ?t=<epoch_ms> cache busting
- Ignore all prior .md reports (scorched earth)
- Second Confirmation: 2-of-3 required (HTTP+Trace, Logs, A8 round-trip)

## Recovery Phases

1. WAF emergency rollback + allowlist
2. Auth/OIDC repair + trust proxy
3. Health/synthetic monitors repair
4. Performance decompression
5. Telemetry primary 500 fix
6. SEO schema ZodError hotfix
7. 10-minute green gate
8. Second confirmation
9. Finance freeze validation

## Acceptance Criteria (ALL must PASS)

- [ ] WAF: x-forwarded-host preserved for trusted ingress
- [ ] Auth: OIDC base URL resolution correct
- [ ] Synthetics: all public URLs (no localhost)
- [ ] Health: 8/8 services 200 with JSON markers
- [ ] Metrics: /metrics/p95 present for all apps
- [ ] Performance: /api/login p95 ≤200ms; DB p95 ≤100ms
- [ ] Telemetry: ≥99% acceptance; 0×500
- [ ] SEO: topics schema fixed
- [ ] Finance Freeze validated
- [ ] Second confirmation achieved

**TRAFFIC_CAP remains 0% until CEO/HITL override.**
