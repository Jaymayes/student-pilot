# Event Loop Threshold Change Report

**Gate-2 Stabilization - Phase 3**  
**Implementation Date:** 2026-01-20  
**Status:** COMPLETE

## Overview

Event loop alert tuning to reduce false positive alerts during Gate-2 traffic ramp while maintaining observability.

## Threshold Changes

| Metric | Previous | New | Rationale |
|--------|----------|-----|-----------|
| Critical Alert | 200ms | 300ms | Reduce FP during traffic spikes |
| Warning Alert | N/A | 150ms | Internal health indicator |
| Consecutive Samples | 1 | 2 | Require sustained breach |

## Implementation Summary

### File Created
- `server/lib/capacity-monitoring.ts`

### Features Implemented

| Feature | Status | Description |
|---------|--------|-------------|
| Event Loop Lag Threshold | ✅ | Critical at 300ms (was 200ms) |
| Sustained Alert Logic | ✅ | Alert only after ≥2 consecutive samples |
| Health Warning | ✅ | Internal warning at 150ms |
| Histogram Metrics | ✅ | eventLoop_ms, p50_ms, p95_ms, sample_count, window_sec |

## Alert Logic

### Two-Tier Alert System

```
Lag ≤ 150ms    → GREEN (healthy)
Lag 151-300ms  → YELLOW (warning, internal only)
Lag > 300ms    → RED (critical, after 2 consecutive samples)
```

### Consecutive Sample Requirement

```typescript
if (lag > EVENT_LOOP_CRITICAL_THRESHOLD_MS) {
  consecutiveBreaches++;
  
  // Only alert after 2+ consecutive breaches
  if (consecutiveBreaches >= CONSECUTIVE_SAMPLES_FOR_ALERT && !alertActive) {
    alertActive = true;
    emitAlert({ type: 'critical', ... });
  }
} else {
  // Reset on recovery
  consecutiveBreaches = 0;
  alertActive = false;
}
```

## Histogram Metrics

`getEventLoopHistogram()` returns:

```typescript
{
  eventLoop_ms: number;   // Current lag reading
  p50_ms: number;         // Median lag over window
  p95_ms: number;         // 95th percentile lag
  sample_count: number;   // Samples in window
  window_sec: number;     // Sample window (60s)
  max_ms: number;         // Max lag in window
  min_ms: number;         // Min lag in window
  mean_ms: number;        // Average lag in window
}
```

### Sample Collection

- **Interval:** 1000ms (1 sample per second)
- **Window:** 60 samples (60 seconds of history)
- **Retention:** 120 samples max (automatic cleanup)

## Exported Functions

```typescript
startCapacityMonitoring(): void
stopCapacityMonitoring(): void
getCapacityStatus(): CapacityStatus
getEventLoopHistogram(): EventLoopHistogram
resetCapacityMetrics(): void
isEventLoopHealthy(): boolean
isEventLoopCritical(): boolean
```

## Status API Response

`getCapacityStatus()` returns:

```typescript
{
  event_loop: {
    current_lag_ms: number;
    consecutive_breaches: number;
    alert_active: boolean;
    health_warning: boolean;
    last_sample_at: string | null;
  },
  histogram: EventLoopHistogram,
  alerts: CapacityAlert[],  // Last 10 alerts
  thresholds: {
    event_loop_critical_ms: 300,
    event_loop_warning_ms: 150,
    consecutive_samples_for_alert: 2
  }
}
```

## False Positive Reduction Analysis

### Before (200ms, 1 sample)

- Transient spikes trigger immediate alerts
- Cold starts cause false positives
- GC pauses generate noise

### After (300ms, 2 samples)

- 100ms headroom for normal variance
- Requires sustained issue (2+ seconds)
- Warning tier for early detection without alerting

### Expected FP Reduction

| Scenario | Before | After |
|----------|--------|-------|
| Cold start spike | ALERT | No alert (single sample) |
| GC pause 250ms | ALERT | Warning only |
| Sustained 350ms | ALERT | ALERT (correct) |
| Traffic spike 220ms | ALERT | Warning only |

## Integration Points

- Complements `server/monitoring/productionMetrics.ts`
- Compatible with `server/services/liveMonitoring.ts` thresholds
- Can be exposed via `/api/admin/capacity` endpoint

## Monitoring Dashboard Updates

Recommended metrics to display:

1. `event_loop.current_lag_ms` - Real-time gauge
2. `histogram.p95_ms` - 95th percentile trend
3. `event_loop.consecutive_breaches` - Breach counter
4. `histogram.sample_count` - Data freshness indicator

## CEO Sign-off Requirements

- [x] Event loop threshold raised to 300ms
- [x] Alert requires ≥2 consecutive samples
- [x] Health warning at 150ms implemented
- [x] Histogram metrics: eventLoop_ms, p50_ms, p95_ms, sample_count, window_sec
- [x] All status functions exported
- [x] Recovery detection with console logging

---

**Verification Complete:** 2026-01-20  
**Ready for Gate-2 Traffic Ramp**
