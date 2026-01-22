# Canonical A8 Heatmap - T+24h Snapshot

**Source**: A8 (Auto Com Center) - Single Source of Truth  
**Build SHA**: c8efad6f  
**Window**: 5-minute tumbling  
**Timing**: Server-side start→last byte  

## Methodology

This report uses **A8 server-side timings only** for public routes:
- Endpoints: `/`, `/pricing`, `/browse`
- Excluded: `/health`, `/readiness` (internal readiness)
- Sampling: All requests within 5-min window
- Percentiles: p50, p75, p95, p99, p99.9

## Public Route Heatmap

| Endpoint | p50 | p75 | p95 | p99 | p99.9 | Samples | Window |
|----------|-----|-----|-----|-----|-------|---------|--------|
| / | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| /pricing | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| /browse | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Aggregate (Public Only)

| Percentile | Value | Target | Status |
|------------|-------|--------|--------|
| p50 | TBD | - | - |
| p75 | TBD | - | - |
| p95 | TBD | ≤110ms | TBD |
| p99 | TBD | ≤180ms | TBD |
| p99.9 | TBD | - | - |

## Window Bounds

| Window Start | Window End | Duration |
|--------------|------------|----------|
| TBD | TBD | 5 min |

## Notes

- Server-side timing excludes network RTT from probe location
- A8 is the single source of truth for all SLO calculations
- Internal endpoints tracked separately for operational visibility
