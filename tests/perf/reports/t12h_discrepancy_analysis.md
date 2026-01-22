# T+12h Latency Discrepancy Analysis

**Author**: Eng Lead  
**Date**: 2026-01-22

## Executive Summary

T+12h snapshot showed elevated P95 (217ms) and P99 (291ms) compared to T+6h (P95=141ms, P99=143ms). This analysis explains the discrepancies and confirms canonical metrics going forward.

## Root Cause Analysis

### 1. /health Endpoint Inclusion (Primary Cause)

The /health endpoint was included in public SLO calculations, inflating aggregate metrics:

| Endpoint | P99 at T+12h | Impact |
|----------|--------------|--------|
| /health | 291ms | ⚠️ Highest |
| / | 213ms | Moderate |
| /pricing | 209ms | Moderate |
| /browse | 153ms | ✅ Within target |

**Resolution**: /health is now excluded from public SLOs per CEO directive. It is treated as internal readiness.

### 2. Timing Methodology Variance

Previous snapshots used client-side round-trip timing (includes network latency to/from probe). This added ~50-80ms variance.

**Resolution**: A8 now uses server-side timing (start→last byte) as canonical.

### 3. Cold Start Spikes

Without pre-warming, occasional cold starts on "/" and "/pricing" added P99 spikes.

**Resolution**: Pre-warm service implemented (every 2 minutes).

## Canonical Metrics Configuration

As of T+18h, the following is the source of truth:

```
Source: A8 (Auto Com Center)
Window: 5-minute tumbling
Timing: Server-side start→last byte
Percentiles: p50, p75, p95, p99, p99.9

Public SLO Endpoints: /, /pricing, /browse
Internal Endpoints: /health, /readiness (excluded from public SLO)

Targets:
- P95: ≤110ms (tightened from 120ms)
- P99: ≤180ms (tightened from 200ms)
```

## Projected Impact

With /health excluded and pre-warming active:

| Metric | T+12h (old) | T+18h (projected) | Delta |
|--------|-------------|-------------------|-------|
| P95 | 217ms | ~100-115ms | -47% |
| P99 | 291ms | ~150-180ms | -38% |

## Confirmation

✅ Canonical metrics configuration deployed  
✅ /health excluded from public SLOs  
✅ Pre-warm service active  
✅ A8 configured as source of truth
