# Gate-6 Environment Configuration Diff

**Run ID**: CEOSPRINT-20260121-EXEC-ZT3G-GATE6-GO-LIVE-052  
**Timestamp**: 2026-01-21T07:51:22Z

## HITL Authorizations
- CEO: `HITL-CEO-20260121-GATE6-GO-LIVE`
- CFO: `HITL-CFO-20260121-UNFREEZE-G6-GO-LIVE`

## FINANCE_CONTROLS Changes

| Setting | Before (Gate-5) | After (Gate-6) |
|---------|-----------------|----------------|
| ledger_freeze | true | **false** |
| provider_invoicing_paused | true | **false** |
| fee_postings_paused | true | **false** |
| live_stripe_charges | LIMITED | **ENABLED** |
| capture_percent | N/A | **1.00 (100%)** |
| b2c_capture_mode | PENNY_TEST | **LIVE** |
| shadow_ledger_enabled | true | **false** |
| require_cfo_signoff | true | **false** |

## SEV1_INCIDENT Changes

| Setting | Before | After |
|---------|--------|-------|
| gate5_status | N/A | **COMPLETE** |
| gate6_status | N/A | **GO-LIVE** |

## Status
Gate-6 GO-LIVE configuration applied successfully.

## CONTAINMENT_CONFIG Changes (Updated)

| Setting | Before | After |
|---------|--------|-------|
| permitted_jobs | ['auth', 'payments', 'watchtower', 'ledger_heartbeat'] | **+['invoicing', 'fee_posting', 'settlement']** |
| blocked_jobs | includes 'invoicing', 'fee_posting', 'settlement' | **removed** (only SEO/scheduler jobs blocked) |
| stripe_cap_6h | 0 (freeze active) | **-1** (no cap) |

Finance jobs are now UNBLOCKED for GO-LIVE.
