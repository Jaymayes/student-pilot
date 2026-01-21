# Revenue Anomaly Guardrails

**Version**: 1.0.0  
**Date**: 2026-01-21

## Overview

Automated anomaly detection and rate limiting for revenue operations.

## Caps and Limits

### Global Caps

| Cap | Limit | Window |
|-----|-------|--------|
| Global Daily Revenue | $50,000 | 24h rolling |
| Global Per-Hour | $5,000 | 1h rolling |
| Peak Hour Multiplier | 2.0x | During peak |

### Per-User Caps

| Cap | Limit | Window |
|-----|-------|--------|
| Per-User Daily | $500 | 24h |
| Per-User Transaction | $100 | Single |
| Transaction Count | 10 | 24h |

### Provider Payout Caps

| Cap | Limit | Window |
|-----|-------|--------|
| Provider Daily Payout | $10,000 | 24h |
| Provider Transaction | $5,000 | Single |

## Anomaly Detection

### Z-Score Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Revenue spike | Z > 3.0 | Alert + Hold |
| Volume spike | Z > 2.5 | Alert |
| Avg transaction size | Z > 2.0 | Monitor |

### EWMA Configuration

```typescript
{
  alpha: 0.3,  // Smoothing factor
  window: 60,  // Minutes
  threshold: 2.0  // Standard deviations
}
```

## Enforcement Actions

### On Threshold Breach

1. **Alert Level 1**: Log + Telemetry event
2. **Alert Level 2**: Slack notification
3. **Alert Level 3**: Auto-pause + Escalation

### On Cap Breach

```typescript
// Automatic enforcement
if (userDailyTotal > PER_USER_DAILY_CAP) {
  reject({ code: 'DAILY_LIMIT_REACHED' });
  emit('cap_breach', { userId, cap: 'per_user_daily' });
}
```

## Telemetry Events

| Event | Trigger |
|-------|---------|
| revenue_anomaly_detected | Z-score breach |
| cap_breach | Limit exceeded |
| payment_held | Manual review required |
| payment_released | After review |

## Monitoring Dashboard

Real-time visibility into:
- Hourly revenue vs baseline
- Z-score trends
- Cap utilization %
- Anomaly alerts

## Rollback Integration

Anomaly guardrails integrate with rollback triggers:
- Sustained anomalies (>15 min) → Finance rollback consideration
- Fraud patterns → Immediate pause + investigation
