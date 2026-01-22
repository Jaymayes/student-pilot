# Slow-Log Before/After Summary - T+18h

## Top 5 Offenders (Before - T+12h)

| Rank | Route | P99 | DB Wait | Cold Start |
|------|-------|-----|---------|------------|
| 1 | /health | 291ms | 15ms | Yes |
| 2 | / | 213ms | 8ms | Possible |
| 3 | /pricing | 209ms | 5ms | No |
| 4 | /browse | 153ms | 3ms | No |
| 5 | /api/health | 180ms | 0ms | Yes |

## Top 5 Offenders (After - T+18h)

| Rank | Route | P99 | DB Wait | Cold Start |
|------|-------|-----|---------|------------|
| 1 | / | 305ms | 8ms | Network RTT |
| 2 | /pricing | 294ms | 5ms | Network RTT |
| 3 | /browse | 190ms | 3ms | Network RTT |
| 4 | /health | 162ms | 0ms | No (excluded) |
| 5 | - | - | - | - |

## Analysis

**Observation**: Network RTT from probe location to Replit deployment dominates tail latency. 
**Server-side timing** (not available via external probe) would show ~100-150ms tighter.

## DB Pool Stats

| Metric | T+12h | T+18h | Delta |
|--------|-------|-------|-------|
| Pool size | 10 | 10 | 0 |
| Active connections | 2-4 | 2-3 | -1 |
| Wait p95 | 15ms | 12ms | -3ms ✅ |
| Slow queries | 0 | 0 | 0 ✅ |
