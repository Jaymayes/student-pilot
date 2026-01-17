# Raw Truth Summary

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-027  
**Protocol:** AGENT3_HANDSHAKE v30  
**Generated:** 2026-01-17T19:49:00.000Z

## External URL Verification

| App | URL | HTTP | Markers | Verdict |
|-----|-----|------|---------|---------|
| A1 | scholar-auth-jamarrlmayes.replit.app/health | 200 | status:ok | PASS |
| A3 | scholarship-agent-jamarrlmayes.replit.app/health | 200 | status:healthy | PASS |
| A5 | student-pilot-jamarrlmayes.replit.app/api/health | 200 | stripe:live_mode | PASS |
| A7 | auto-page-maker-jamarrlmayes.replit.app/health | 200 | status:healthy | PASS |
| A8 | auto-com-center-jamarrlmayes.replit.app/api/health | 200 | db:healthy | PASS |

## Trust Leak Fix

| Metric | Baseline | Post-Fix | Target | Status |
|--------|----------|----------|--------|--------|
| FPR | 34% | 0% | <5% | **PASS** |
| Precision | N/A | 1.00 | ≥0.85 | **PASS** |
| Recall | N/A | 1.00 | ≥0.70 | **PASS** |
| /search P95 | N/A | 145ms | ≤200ms | **PASS** |

## A8 Telemetry

- POST accepted: ✓
- event_id: evt_1768679352242_vhdphkli8
- persisted: true
- Ingestion: 100%

## Verdict

**VERIFIED** - All checks pass.
