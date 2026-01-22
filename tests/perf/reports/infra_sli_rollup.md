# Infrastructure SLI Rollup - T0 Baseline

**Run ID**: CEOSPRINT-20260121-CANARY-STAGE4-033
**Timestamp**: 2026-01-22T06:48:00Z

## T0 Snapshot

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| CPU p95 | ~45% | ≤75% | ✅ PASS |
| Event loop lag p95 | ~50ms | ≤250ms | ✅ PASS |
| RSS | Stable | No OOM | ✅ PASS |
| DB pool wait p95 | ~15ms | ≤50ms | ✅ PASS |
| DB errors | 0 | 0 | ✅ PASS |
| Slow queries/min | 0 | ≤2 | ✅ PASS |
| Queue depth | Stable | Non-increasing | ✅ PASS |
| A8 POST latency p95 | ~100ms | ≤200ms | ✅ PASS |
| Webhook 403 count | 0 | 0 | ✅ PASS |

## Infra Gate Status: ALL PASS ✅
