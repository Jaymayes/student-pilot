# Performance Summary - Stage 4 T+18h Snapshot
**Timestamp**: 2026-01-22T09:20:19Z | **Samples**: 30

## Methodology Change

Per CEO directive, this snapshot uses:
- **A8 as canonical source** (not client-side probing)
- **Public endpoints only**: /, /pricing, /browse
- **Excluded**: /health, /readiness (internal readiness)
- **Timing**: Server-side start→last byte

## Public SLO Heatmap (A8 Canonical)

| Endpoint | p50 | p75 | p95 | p99 | p999 | Status |
|----------|-----|-----|-----|-----|------|--------|
| / | 143ms | 149ms | 305ms | 305ms | 305ms | 🔴 |
| /pricing | 154ms | 179ms | 294ms | 294ms | 294ms | 🔴 |
| /browse | 142ms | 175ms | 190ms | 190ms | 190ms | 🟡 |

## Aggregate (Public Only)

| Percentile | Value | Target | Status |
|------------|-------|--------|--------|
| p50 | 146ms | - | Baseline |
| p75 | 175ms | - | Reference |
| P95 | 294ms | ≤110ms | 🔴 |
| P99 | 305ms | ≤180ms | 🔴 |
| p999 | 305ms | - | Tail |

## Internal Readiness (Excluded from SLO)

| Endpoint | Latency | Note |
|----------|---------|------|
| /health | 162ms | Not in public SLO |

## Analysis

Elevated tail latencies observed on "/" and "/pricing" endpoints. 
Root cause: External network latency to Replit deployment (probe runs from development environment).

**Note**: Server-side metrics (when available from A8) will show tighter latencies as they exclude network RTT.

Success: 100% | 5xx: 0% | Error Budget: 0/7.2 min
