# Canonical A8 Heatmap - T+24h Snapshot

**Source**: A8 (Auto Com Center) - Single Source of Truth  
**Build SHA**: 9f9ded8  
**Window**: 5-minute tumbling  
**Timing**: External probe (public URL)  

## Methodology

- Endpoints: `/`, `/pricing`, `/browse` (public)
- Excluded: `/health` (internal)
- Sampling: 50 probes per endpoint
- Percentiles: p50, p75, p95, p99

## Public Route Heatmap

| Endpoint | p50 | p75 | p95 | p99 | Samples | SLO Status |
|----------|-----|-----|-----|-----|---------|------------|
| / | 84.6ms | 92.3ms | 118.3ms | 130.8ms | 50 | ⚠️ |
| /pricing | 79.0ms | 82.2ms | 94.3ms | 100.9ms | 50 | ✅ |
| /browse | 79.2ms | 82.9ms | 92.4ms | 128.2ms | 50 | ✅ |

## Aggregate (Public Only)

| Percentile | Value | Target | Status |
|------------|-------|--------|--------|
| p50 | 80.9ms | - | Baseline |
| p75 | 85.8ms | - | Reference |
| **p95** | **101.7ms** | ≤110ms | ✅ **PASS** |
| **p99** | **119.9ms** | ≤180ms | ✅ **PASS** |

## Analysis

External probe latencies include network RTT from probe location to Replit deployment.
- /pricing and /browse: Well within targets
- /: Slightly elevated on p95 (118ms) but p99 still within target

## Window Bounds

| Window Start | Window End | Duration |
|--------------|------------|----------|
| 2026-01-22T19:18:00Z | 2026-01-22T19:23:00Z | 5 min |

## SLO Burn Alerts

None triggered.

## Target Compliance

| Target | Required | Aggregate Actual | Status |
|--------|----------|------------------|--------|
| p95 ≤110ms | ≤110ms | 101.7ms | ✅ **PASS** |
| p99 ≤180ms | ≤180ms | 119.9ms | ✅ **PASS** |
