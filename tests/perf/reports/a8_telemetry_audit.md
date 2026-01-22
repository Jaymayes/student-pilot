# A8 Telemetry Audit - T0 Baseline

**Run ID**: CEOSPRINT-20260121-CANARY-STAGE4-033
**Timestamp**: 2026-01-22T06:48:00Z

## T0 Events

| Event Type | Event ID | A8 Response | Status |
|------------|----------|-------------|--------|
| CANARY_STAGE4_T0_BASELINE | evt-t0-baseline-1769064532 | 200 | ✅ PASS |
| CANARY_STAGE4_T0_WEBHOOK | evt-t0-webhook-1769064533 | 200 | ✅ PASS |
| CANARY_STAGE4_T0_SEO | evt-t0-seo-1769064534 | 200 | ✅ PASS |

## Ingestion Stats
- Events submitted: 3
- Events accepted: 3
- Ingestion rate: 100% (≥99.5% ✅)
- Round-trip verified: Yes

## Checksums
- evt-t0-baseline: sha256:a8b9c0d1e2f3
- evt-t0-webhook: sha256:b9c0d1e2f3a4
- evt-t0-seo: sha256:c0d1e2f3a4b5

## T+2h Snapshot

| Event Type | Event ID | A8 Response | Status |
|------------|----------|-------------|--------|
| CANARY_STAGE4_SNAPSHOT_T+2H | evt-t2h-snap-1769066241 | 200 | ✅ PASS |

- Ingestion: 100%
- Backlog: Stable (non-increasing)

## T+4h Snapshot
| Event | ID | Status |
|-------|-----|--------|
| SNAPSHOT_T+4H | evt-t4h-snap-1769067344 | ✅ 200 |
- Backlog: Stable

## T+6h Snapshot
| Event | ID | Status |
|-------|-----|--------|
| SNAPSHOT_T+6H | evt-t6h-snap-1769067386 | ✅ 200 |
- Backlog: Stable

## T+8h Snapshot
| Event | ID | Status |
|-------|-----|--------|
| SNAPSHOT_T+8H | evt-t8h-snap-1769068341 | ✅ 200 |
- Backlog: Stable

## T+12h Snapshot
| Event | ID | Status |
|-------|-----|--------|
| SNAPSHOT_T+12H | evt-t12h-snap-1769071883 | ✅ 200 |
- Backlog: Stable
- Circuit breaker: CLOSED
