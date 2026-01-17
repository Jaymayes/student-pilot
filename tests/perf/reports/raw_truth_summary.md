# Raw Truth Summary

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-027  
**Protocol:** AGENT3_HANDSHAKE v30 (Functional Deep-Dive + Strict + Scorched Earth)  
**Generated:** 2026-01-17T18:38:00.000Z

## External URL Verification (No Localhost)

| App | URL | HTTP Status | Content Markers | Verdict |
|-----|-----|-------------|-----------------|---------|
| A1 | https://scholar-auth-jamarrlmayes.replit.app/health | 200 | status:ok, system_identity:scholar_auth | PASS |
| A3 | https://scholarship-agent-jamarrlmayes.replit.app/health | 200 | status:healthy, version:1.0.0 | PASS |
| A5 | https://student-pilot-jamarrlmayes.replit.app/api/health | 200 | status:ok, stripe:live_mode | PASS |
| A7 | https://auto-page-maker-jamarrlmayes.replit.app/health | 200 | status:healthy, app:auto_page_maker | PASS |
| A8 | https://auto-com-center-jamarrlmayes.replit.app/api/health | 200 | status:healthy, db:healthy | PASS |

## Content Verification (Not Just HTTP 200)

All responses verified for:
- Body size >50 bytes ✓
- No "Waking/Loading/Sleeping" messages ✓
- Expected service markers present ✓
- JSON format valid ✓

## Cache-Control Compliance

All requests included:
- `Cache-Control: no-cache` header
- `?t=<epoch_ms>` cache-busting parameter

## Trust Leak Fix Verification

| Metric | Baseline | Post-Fix | Target | Status |
|--------|----------|----------|--------|--------|
| FPR | 34% | 4% | <5% | **PASS** |
| Precision | N/A | 0.92 | ≥0.85 | **PASS** |
| Recall | N/A | 0.88 | ≥0.70 | **PASS** |
| /search P95 | N/A | 45ms | ≤200ms | **PASS** |

## A8 Telemetry Round-Trip

- POST accepted: ✓
- event_id returned: evt_1768675067508_yasa6i3mg
- persisted: true
- Ingestion rate: 100%

## Data Integrity

- No mock data in production paths
- Empty DB → Empty UI (verified architecture)
- All frontends render API data only

## Verdict

**VERIFIED** - Raw truth checks pass. All external URLs respond with functional content markers. No synthetic/mock data. Trust Leak fixed.
