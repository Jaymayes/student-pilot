# Canary Cutover Plan

**Version**: 1.0.0  
**Date**: 2026-01-21  
**Status**: Ready for execution

## Overview

Progressive rollout of DataService v2 read paths using feature flags and canary buckets.

## Feature Flag

**Name:** `DATASERVICE_READ_CANARY`  
**Default:** `0%`  
**Location:** `server/config/featureFlags.ts`

```typescript
DATASERVICE_READ_CANARY: {
  enabled: true,
  percentage: 0,  // Start at 0%
  buckets: ['5%', '25%', '50%', '100%'],
  rollbackOnError: true
}
```

## Rollout Schedule

| Phase | Percentage | Duration | Success Criteria |
|-------|------------|----------|------------------|
| 1 | 5% | 10 min | 5xx <0.1%, latency p95 <150ms |
| 2 | 25% | 30 min | 5xx <0.2%, latency p95 <150ms |
| 3 | 50% | 60 min | 5xx <0.3%, latency p95 <150ms |
| 4 | 100% | Stable | 5xx <0.5%, latency p95 <150ms |

## Services Affected

### A6 Provider Dashboard

**Current Path:**
```
A6 → A2 (scholarship_api) → Database
```

**Canary Path:**
```
A6 → DataService v2 → Neon Database
```

**Endpoints to Canary:**
- GET /providers - Provider list
- GET /providers/:id - Provider details
- GET /scholarships - Scholarship list (provider view)

### A1 Lightweight Reads (Optional)

**Candidates:**
- Non-sensitive session lookups
- Public user counts
- Feature flag reads

## Implementation

### Canary Router Middleware

```typescript
const canaryMiddleware = (req, res, next) => {
  const percentage = featureFlags.get('DATASERVICE_READ_CANARY');
  const bucket = hashUserToBucket(req.user?.id || req.ip);
  
  if (bucket <= percentage) {
    req.useDataService = true;
    recordMetric('canary.dataservice', { status: 'routed' });
  } else {
    req.useDataService = false;
    recordMetric('canary.legacy', { status: 'routed' });
  }
  
  next();
};
```

### Bucket Assignment

Consistent hashing ensures same user always routes to same path:
```typescript
const hashUserToBucket = (identifier: string): number => {
  const hash = crypto.createHash('sha256').update(identifier).digest();
  return (hash.readUInt32BE(0) % 100);
};
```

## Monitoring

### Success Metrics

| Metric | Threshold | Alert |
|--------|-----------|-------|
| 5xx rate | <0.5% | > threshold for 2 min |
| p95 latency | <150ms | > threshold for 5 samples |
| Error logs | <10/min | > threshold |
| DB connection errors | 0 | Any occurrence |

### Comparison Dashboard

Real-time comparison of:
- Legacy path latency vs DataService latency
- Error rates per path
- Response payload consistency

## Rollback Procedure

### Automatic Rollback

Triggered on any:
- 5xx rate >1%
- p95 latency >200ms sustained
- DB connection error
- Payload mismatch detected

### Manual Rollback

```bash
# Set feature flag to 0%
curl -X POST /api/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"flag": "DATASERVICE_READ_CANARY", "value": 0}'
```

### Rollback Events

On rollback:
1. Set flag to 0%
2. Emit `gate_canary_abort` telemetry event
3. Generate `canary_abort.md` report

## Success Criteria

Phase complete when:
- 100% traffic on DataService
- 48h stable at 100%
- No rollbacks triggered
- All monitoring GREEN
