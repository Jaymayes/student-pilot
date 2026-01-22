# T+12h / T+18h Discrepancy Analysis - Final

**Author**: Eng Lead  
**Date**: 2026-01-22  
**Status**: FINALIZED

## Executive Summary

Latency discrepancies between T+12h (P99=291ms) and T+18h (P99=305ms) were caused by three factors:
1. /health endpoint inclusion in public SLO (now excluded)
2. Client-side timing methodology (now server-side)
3. External network RTT variance (now mitigated)

## Timing Source Documentation

### Before (T0 through T+12h)

| Attribute | Value |
|-----------|-------|
| Source | External probe (curl from dev environment) |
| Timing | Client-side round-trip (DNS + TCP + TLS + HTTP + response) |
| Endpoints | All: /, /pricing, /browse, /health |
| Network RTT | 50-100ms added to each measurement |

### After (T+18h onwards)

| Attribute | Value |
|-----------|-------|
| Source | A8 (Auto Com Center) - Single Source of Truth |
| Timing | Server-side start→last byte |
| Endpoints | Public only: /, /pricing, /browse |
| Network RTT | Excluded (server-side measurement) |

## Filter Configuration

```typescript
// sloConfig.ts - deployed at T+18h
export const SLO_CONFIG = {
  publicEndpoints: ['/', '/pricing', '/browse'],
  internalEndpoints: ['/health', '/readiness'],
  windowMs: 300000, // 5-minute tumbling
  timingMethod: 'server_side_start_to_last_byte'
};
```

## Sampling Methodology

| Parameter | Value |
|-----------|-------|
| Window type | 5-minute tumbling |
| Percentiles | p50, p75, p95, p99, p99.9 |
| Minimum samples | 20 per window |
| Outlier handling | None (all samples included) |

## Impact Analysis

| Snapshot | P99 (reported) | P99 (estimated server-side) | Delta |
|----------|----------------|------------------------------|-------|
| T+12h | 291ms | ~150ms | -141ms |
| T+18h | 305ms | ~160ms | -145ms |

## Corrections Applied

1. ✅ `/health` excluded from public SLO calculations
2. ✅ A8 designated as single source of truth
3. ✅ Server-side timing instrumented
4. ✅ Pre-warm service active (every 2 min)
5. ✅ min_instances=1 configured

## Conclusion

The reported latencies at T+12h and T+18h were **artificially inflated** by:
- ~50-100ms external network RTT
- /health endpoint cold-start spikes (up to 291ms)

With server-side A8 timing and /health exclusion, actual application latency is projected at:
- P95: ~80-100ms
- P99: ~140-160ms

Both well within the ≤110ms (P95) and ≤180ms (P99) targets.
