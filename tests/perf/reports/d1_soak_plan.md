# Day-1 Soak Plan

**Run ID**: CEOSPRINT-20260121-VERIFY-ZT3G-D1-SOAK-057  
**Start**: 2026-01-21T08:00:00Z  
**Duration**: 24 hours  
**Traffic**: 100%

## Sampling Schedule

- **Frequency**: Every 60 seconds
- **Metrics recorded**: A1 p50/p95/max, Neon p95, error rate, A8 acceptance, WAF decisions

## Spike Windows

| Hour | Window | Test |
|------|--------|------|
| 1 | T+1h | Provider login burst (10 concurrent) |
| 4 | T+4h | SEO POST burst (5 concurrent) |
| 8 | T+8h | Provider login burst (10 concurrent) |
| 12 | T+12h | SEO POST burst (5 concurrent) |
| 16 | T+16h | Provider login burst (10 concurrent) |
| 20 | T+20h | SEO POST burst (5 concurrent) |

## Hard Gate Thresholds

| Category | Metric | Threshold | Breach Action |
|----------|--------|-----------|---------------|
| Financial | live vs shadow mismatch | >0 | ROLLBACK |
| Financial | orphan entries | >0 | ROLLBACK |
| Financial | missing webhook | any | ROLLBACK |
| Reliability | 5xx rate | ≥0.5%/min | ROLLBACK |
| Reliability | A8 acceptance | <99% | ROLLBACK |
| Performance | A1 login p95 | >240ms (2x) OR >320ms (1x) | ROLLBACK |
| Performance | Neon DB p95 | >150ms | ROLLBACK |
| Performance | Event loop | ≥300ms (2x) | ROLLBACK |
| Security | WAF false positive | any on S2S | ROLLBACK |
| Security | Probe overlap | any | ROLLBACK |

## Metrics Collection

```json
{
  "a1_p50_ms": 0,
  "a1_p95_ms": 0,
  "a1_max_ms": 0,
  "neon_p95_ms": 0,
  "neon_active": 0,
  "neon_idle": 0,
  "neon_reconnects": 0,
  "neon_errors": 0,
  "error_rate_5xx": 0,
  "a8_acceptance_pct": 100,
  "a8_checksum_ok": true,
  "waf_blocks": 0,
  "waf_false_positives": 0,
  "probe_overlaps": 0,
  "webhook_deliveries": 0,
  "live_ledger_count": 0,
  "shadow_ledger_count": 0,
  "reconciliation_diff": 0
}
```

## Rollback Procedure

1. Set CAPTURE_PERCENT=0
2. Set LEDGER_FREEZE=true
3. Set PROVIDER_INVOICING_PAUSED=true
4. Set FEE_POSTINGS_PAUSED=true
5. Set LIVE_STRIPE_CHARGES=BLOCKED
6. Emit A8 "finance_rollback" event
7. Generate d1_abort.md with breach details

## Status

- [x] Plan created
- [ ] Monitoring started
- [ ] Spike windows executed
- [ ] 24h observation complete
