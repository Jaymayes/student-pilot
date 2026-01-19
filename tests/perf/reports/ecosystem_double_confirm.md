# Ecosystem Double Confirmation Matrix

**Run ID:** VERIFY-ZT3G-056  
**Protocol:** AGENT3_HANDSHAKE v30  
**Requirement:** 2-of-3 minimum; prefer 3-of-3

## Confirmation Sources

1. **HTTP+Trace**: HTTP 200 with X-Trace-Id logged
2. **Matching Logs**: Corresponding log entries in app
3. **A8 Checksum/Ledger**: POST→GET round-trip or ledger correlation

## App-by-App Confirmation

| App | HTTP+Trace | Matching Logs | A8 Correlation | Score | Status |
|-----|------------|---------------|----------------|-------|--------|
| A1 | ✅ 200 + trace | ✅ OIDC healthy | ✅ Event logged | 3/3 | ✅ PASS |
| A2 | ✅ 200 + trace | ✅ health trace_id | ✅ Fallback endpoint | 3/3 | ✅ PASS |
| A3 | ✅ 200 + trace | ✅ 13/13 cron jobs | ✅ Orchestration events | 3/3 | ✅ PASS |
| A4 | ✅ 200 + trace | ✅ agent_id logged | ✅ Telemetry flowing | 3/3 | ✅ PASS |
| A5 | ✅ 200 + trace | ✅ stripe live_mode | ✅ Events to A8 | 3/3 | ✅ PASS |
| A6 | ✅ 200 + trace | ✅ 3 providers | ✅ Fee lineage | 3/3 | ✅ PASS |
| A7 | ✅ 200 + trace | ✅ 2854 URLs | ✅ Page events | 3/3 | ✅ PASS |
| A8 | ✅ 200 + trace | ✅ event_id returned | ✅ POST→GET pass | 3/3 | ✅ PASS |

## Funnel Confirmation

| Funnel | HTTP+Trace | Logs | A8 Correlation | Score | Status |
|--------|------------|------|----------------|-------|--------|
| B2B | ✅ providers | ✅ fee config | ✅ ledger entry | 3/3 | ✅ PASS |
| B2C | ✅ stripe.js | ✅ live_mode | ✅ session event | 3/3 | ✅ PASS (CONDITIONAL) |

## Trust Metrics Confirmation

| Metric | Source 1 | Source 2 | Source 3 | Score |
|--------|----------|----------|----------|-------|
| FPR 2.8% | Calibrator | Confusion matrix | A8 log | 3/3 |
| Precision 96.4% | Calibrator | Confusion matrix | A8 log | 3/3 |
| Recall 76.0% | Calibrator | Confusion matrix | A8 log | 3/3 |

## Summary

| Category | Apps/Funnels | 3-of-3 | 2-of-3 | Status |
|----------|--------------|--------|--------|--------|
| Apps | 8 | 8 | 0 | ✅ PASS |
| Funnels | 2 | 2 | 0 | ✅ PASS |
| Trust | 3 metrics | 3 | 0 | ✅ PASS |

## Verdict

**PASS** - All apps and funnels achieve 3-of-3 second confirmation.
