# Raw Truth Summary

**Run ID**: CEOSPRINT-20260121-EXEC-ZT3G-V2S2-FIX-027
**Protocol**: AGENT3_HANDSHAKE v30
**Generated**: 2026-01-21T22:55:00Z

## Ecosystem Status

| App | URL | Status | Verdict |
|-----|-----|--------|---------|
| A1 Scholar Auth | scholar-auth-jamarrlmayes.replit.app | 200 | PASS (SEV2) |
| A2 Scholarship API | scholarship-api-jamarrlmayes.replit.app | 200 | PASS |
| A3 Scholarship Agent | scholarship-agent-jamarrlmayes.replit.app | 200 | PASS |
| A4 Scholarship Sage | scholarship-sage-jamarrlmayes.replit.app | 200 | PASS |
| A5 Student Pilot | student-pilot-jamarrlmayes.replit.app | 200 | PASS |
| A6 Provider Portal | provider-portal-jamarrlmayes.replit.app | 404 | **BLOCKED** |
| A7 Auto Page Maker | auto-page-maker-jamarrlmayes.replit.app | 200 | PASS |
| A8 Auto Com Center | auto-com-center-jamarrlmayes.replit.app | 200 | PASS |

## Key Findings

### PASS (7/8)
- All core apps operational
- Telemetry flowing
- Auth/OIDC working
- Stripe integration verified (live_mode)

### BLOCKED (1/8)
- A6 Provider Portal: 404 Not Found
- Manual intervention required (see manifest)

## SLO Status

- P95 Latency: 11ms (target ≤120ms) ✅ PASS

## Funnel Status

- B2C: CONDITIONAL (Readiness Only) - awaiting HITL for live capture
- B2B: PARTIALLY BLOCKED - A6 requires intervention

## Truth Statement

7 of 8 apps verified healthy via external probe with cache-busting.
1 app (A6) blocked requiring manual intervention.
No false positives: all verdicts based on 200+markers or actual failure.
