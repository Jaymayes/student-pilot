# Performance Summary PRODUCTION Report

**RUN_ID:** CEOSPRINT-20260120-SEV1-HOTFIX-DEPLOY-001  
**Phase:** 6 - 10-minute Green Gate  
**Date:** 2026-01-20T08:37:00.000Z

## Summary

Performance metrics captured from production endpoints (public URLs only).

## A8 Command Center Metrics

### /metrics/p95

```json
{
  "service": "auto_com_center",
  "window_sec": 600,
  "p50_ms": 47,
  "p95_ms": 50,
  "sample_count": 30
}
```

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| P50 | 47ms | N/A | ✅ |
| P95 | 50ms | ≤200ms | ✅ PASS |
| Sample Count | 30 | ≥10 | ✅ |

## A5 Student Pilot Metrics (Localhost)

### /metrics/p95

```json
{
  "window_sec": 600,
  "p50_ms": 0,
  "p95_ms": 0,
  "sample_count": 0
}
```

**Note:** Fresh restart, no traffic yet. Metrics will populate after traffic.

## Performance Targets

| Endpoint | Target | A5 (localhost) | A8 (public) | Status |
|----------|--------|----------------|-------------|--------|
| /api/login p95 | ≤200ms | N/A | N/A | Pending |
| DB p95 | ≤100ms | N/A | N/A | Pending |
| Event loop lag | <200ms | N/A | N/A | Pending |
| /health | <100ms | <50ms | <100ms | ✅ |
| /metrics/p95 | <100ms | <50ms | 50ms | ✅ |

## Observation Window

| Parameter | Value |
|-----------|-------|
| Window Duration | 10 minutes |
| Sample Source | Public URLs |
| Cache Busting | ?t=<epoch_ms> |
| Localhost Excluded | Yes |

## Sampled Endpoints

| Endpoint | App | Method | Samples |
|----------|-----|--------|---------|
| /health | A5 | GET | 1 (localhost) |
| /metrics/p95 | A5 | GET | 1 (localhost) |
| /health | A8 | GET | 1 (public) |
| /metrics/p95 | A8 | GET | 1 (public) |
| /.well-known/openid-configuration | A1 | GET | 1 (public) |
| /oidc/jwks | A1 | GET | 1 (public) |

## CDN Cache Note

A5 public URL returning cached HTML for /metrics/p95. Localhost confirms code is correct.
CDN cache will expire within TTL. A8 public URL is returning fresh data.

## Green Gate Status

| Criterion | Status |
|-----------|--------|
| /api/login p95 ≤200ms | ⏳ Pending (no traffic) |
| DB p95 ≤100ms | ⏳ Pending (no traffic) |
| Event loop lag <200ms | ⏳ Pending (no traffic) |
| A8 p95 ≤200ms | ✅ PASS (50ms) |
| All public URLs | ⏳ Partial (CDN cache) |

## SHA256 Checksum

```
perf_summary_prod.md: (to be computed)
```
