# Raw Truth Summary

**Run ID:** VERIFY-ZT3G-056  
**Protocol:** AGENT3_HANDSHAKE v30  
**Timestamp:** 2026-01-19T08:32:00.000Z

## Executive Summary

All 8 apps verified healthy with functional markers. No "Waking/Loading" placeholders detected. Trust metrics within guardrails. B2C ready but locked.

## Truth Probes (8/8 PASS)

| App | Endpoint | HTTP | Functional Marker | Status |
|-----|----------|------|-------------------|--------|
| A1 | /health | 200 | scholar_auth | ✅ PASS |
| A2 | /health | 200 | trace_id | ✅ PASS |
| A3 | /readyz | 200 | 13/13 cron jobs | ✅ PASS |
| A4 | /health | 200 | scholarship_sage | ✅ PASS |
| A5 | /api/health | 200 | stripe live_mode | ✅ PASS |
| A6 | /api/providers | 200 | 3 providers | ✅ PASS |
| A7 | /sitemap.xml | 200 | 2854 URLs | ✅ PASS |
| A8 | /api/health | 200 | event_id persisted | ✅ PASS |

## Content Verification (Not Just /health)

- ✅ All responses >50 bytes
- ✅ JSON/HTML content verified
- ✅ No placeholder text detected
- ✅ Functional markers present

## Trust Metrics (FIX-052)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| FPR | 2.8% | ≤5% | ✅ PASS |
| Precision | 96.4% | ≥90% | ✅ PASS |
| Recall | 76.0% | ≥75% | ✅ PASS |

## Safety Status

| Lock | Status |
|------|--------|
| SAFETY_LOCK_ACTIVE | ✅ TRUE |
| B2C_MICRO_CHARGE_ENABLED | ❌ FALSE |
| Live charge permitted | ❌ NO |

## Verdict

**VERIFIED** - All Phase 0 truth probes pass. Proceed to acceptance criteria.
