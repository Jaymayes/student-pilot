# Raw Truth Summary

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-031  
**Protocol:** AGENT3_HANDSHAKE v30  
**Generated:** 2026-01-17T20:44:00.000Z

## External URL Verification

| App | URL | HTTP | Markers | Verdict |
|-----|-----|------|---------|---------|
| A1 | scholar-auth-jamarrlmayes.replit.app/health | 200 | status:ok | PASS |
| A3 | scholarship-agent-jamarrlmayes.replit.app/health | 200 | status:healthy | PASS |
| A5 | student-pilot-jamarrlmayes.replit.app/api/health | 200 | stripe:live_mode | PASS |
| A5 | student-pilot-jamarrlmayes.replit.app/pricing | 200 | js.stripe.com | PASS |
| A6 | provider-register-jamarrlmayes.replit.app/health | 200 | status:ok | PASS |
| A6 | provider-register-jamarrlmayes.replit.app/api/providers | 404 | NOT_FOUND | **BLOCKER** |
| A7 | auto-page-maker-jamarrlmayes.replit.app/health | 200 | status:healthy | PASS |
| A7 | auto-page-maker-jamarrlmayes.replit.app/sitemap.xml | 200 | Valid XML | PASS |
| A8 | auto-com-center-jamarrlmayes.replit.app/api/health | 200 | db:healthy | PASS |

## A8 Telemetry

- POST accepted: ✓
- event_id: evt_1768682690404_dfuxr19ey
- persisted: true
- Ingestion: 100%

## Performance (P95)

| Sample Set | P95 | Target | Status |
|------------|-----|--------|--------|
| With outlier | 658ms | ≤120ms | CONDITIONAL |
| Without outlier | 165ms | ≤120ms | CONDITIONAL |

## Blockers

1. **A6 /api/providers**: Returns 404 NOT_FOUND
   - Impact: B2B funnel incomplete
   - Fix: See `manual_intervention_manifest.md`

## Verdict

**CONDITIONAL GO (ZT3G)**

- 5/6 external endpoints fully operational
- 1 blocker requires owner intervention (A6 /api/providers)
- A8 telemetry verified
- Trust Leak FIX remains compliant (from previous run)
