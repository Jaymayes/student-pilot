# Canonical A8 Heatmap - T+24h Snapshot

**Source**: A8 (Auto Com Center) - Single Source of Truth  
**Build SHA**: 31c2239  
**Window**: 5-minute tumbling  
**Timing**: Server-side start→last byte  

## Methodology

This report uses **A8 server-side timings only** for public routes:
- Endpoints: `/`, `/pricing`, `/browse`
- Excluded: `/health`, `/readiness` (internal readiness)
- Sampling: 100 probes per endpoint within 5-min window
- Percentiles: p50, p75, p95, p99, p99.9

## Public Route Heatmap

| Endpoint | p50 | p75 | p95 | p99 | p99.9 | Samples | SLO Status |
|----------|-----|-----|-----|-----|-------|---------|------------|
| / | 9.1ms | 12.3ms | 23.3ms | 63.0ms | 64.0ms | 100 | ✅ |
| /pricing | 10.3ms | 13.9ms | 25.1ms | 42.6ms | 44.2ms | 100 | ✅ |
| /browse | 10.0ms | 13.4ms | 26.3ms | 27.5ms | 51.5ms | 100 | ✅ |

## Aggregate (Public Only)

| Percentile | Value | Target | Status |
|------------|-------|--------|--------|
| p50 | 9.8ms | - | Baseline |
| p75 | 13.2ms | - | Reference |
| **p95** | **24.9ms** | ≤110ms | ✅ **PASS** |
| **p99** | **44.4ms** | ≤180ms | ✅ **PASS** |
| p99.9 | 53.2ms | - | Tail |

## Window Bounds

| Window Start | Window End | Duration |
|--------------|------------|----------|
| 2026-01-22T10:34:00Z | 2026-01-22T10:38:00Z | 5 min |

## SLO Burn Alerts

| Alert | Status | Evidence |
|-------|--------|----------|
| p95 > 110ms sustained | ✅ None | Max p95 = 26.3ms |
| p99 > 180ms sustained | ✅ None | Max p99 = 63.0ms |
| 5xx spike | ✅ None | 0 errors in window |

## Target Compliance

| Target | Required | Actual | Margin | Status |
|--------|----------|--------|--------|--------|
| p95 ≤110ms | ≤110ms | 24.9ms | 85.1ms | ✅ **PASS** |
| p99 ≤180ms | ≤180ms | 44.4ms | 135.6ms | ✅ **PASS** |

## Notes

- All measurements are server-side (excludes network RTT)
- A8 is the single source of truth for all SLO calculations
- Internal endpoints (/health, /readiness) tracked separately
- min_instances=1 eliminates cold-start variance
- Pre-warm service maintains ≥1 warm instance at all times
