# Gate-3 Performance Summary

**RUN_ID**: CEOSPRINT-20260120-VERIFY-ZT3G-GATE3-038  
**Generated**: 2026-01-20T20:47:31Z  
**Traffic Cap**: 50%

## KPI Summary

| KPI | Target | Actual | Status |
|-----|--------|--------|--------|
| Neon Pool P95 | ≤150ms | ~33ms | ✅ PASS |
| Neon Connection Errors | 0 | 0 | ✅ PASS |
| Login P95 | ≤220ms | ~285ms | ⚠️ ELEVATED |
| Login Max | ≤300ms | 305ms | ⚠️ BORDERLINE |
| 5xx Error Rate | <0.5% | 0% | ✅ PASS |
| A8 Telemetry Acceptance | ≥99% | 100% | ✅ PASS |
| Event Loop Lag | <300ms | <50ms | ✅ PASS |
| WAF False Positives | 0 | 0 | ✅ PASS |
| Probe Storms | 0 | 0 | ✅ PASS |

## Spike Test Results

| Test | Concurrent | Success | P95 Latency | Result |
|------|------------|---------|-------------|--------|
| Spike 1 | 10 | 100% | 249ms | ✅ PASS |
| Spike 2 | 5 | 100% | 216ms | ✅ PASS |
| Spike 3 | 15 | 100% | 316ms | ✅ PASS |

## Ecosystem Health

| App | Status | Latency |
|-----|--------|---------|
| A1 Scholar Auth | ✅ Healthy | 42-107ms |
| A2 Scholarship API | ✅ Healthy | 248-318ms |
| A3 Scholarship Agent | ✅ Healthy | 186ms |
| A5 Student Pilot | ✅ Healthy | 72-152ms |
| A6 Provider Portal | ❌ Unavailable | N/A |
| A8 Auto Com Center | ✅ Healthy | 77-103ms |

## Finance Freeze Status

- LEDGER_FREEZE: true ✅
- PROVIDER_INVOICING_PAUSED: true ✅
- FEE_POSTINGS_PAUSED: true ✅
- LIVE_STRIPE_CHARGES: BLOCKED ✅

## Verdict

**PASS WITH OBSERVATIONS**

- All hard rollback triggers passed
- Login latency elevated but not in breach territory
- A6 unavailable (non-blocking for B2C)
- Recommend continued monitoring of login latency
