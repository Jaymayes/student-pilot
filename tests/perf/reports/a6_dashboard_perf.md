# A6 Provider Dashboard Performance Design

**Run ID:** CEOSPRINT-20260121-EXEC-ZT3G-V2-S1-058  
**Target:** Dashboard read p95 ≤ 300ms during traffic spikes  
**Status:** Design Complete

---

## 1. Read-Model / Caching Strategy for Common Queries

### High-Frequency Query Patterns

| Query | Frequency | Current Latency | Target |
|-------|-----------|-----------------|--------|
| Provider summary stats | Every page load | 150-250ms | <80ms |
| Application list (paginated) | High | 100-200ms | <100ms |
| Scholarship listings by provider | Medium | 80-150ms | <60ms |
| Revenue/analytics aggregates | Dashboard load | 200-400ms | <150ms |

### Caching Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Request Layer                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              L1: In-Memory Cache (Node.js)              │
│  TTL: 30-60s  │  Max: 1000 entries  │  LRU eviction    │
└─────────────────┬───────────────────────────────────────┘
                  │ Miss
                  ▼
┌─────────────────────────────────────────────────────────┐
│              L2: Read Replica (if available)            │
│  Connection pool: 10  │  Read-only queries             │
└─────────────────┬───────────────────────────────────────┘
                  │ Miss / Write
                  ▼
┌─────────────────────────────────────────────────────────┐
│              L3: Primary PostgreSQL                     │
│  Connection pool: 20  │  All writes + cache miss       │
└─────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// server/cache/dashboardCache.ts
import { responseCache } from '../cache/responseCache';

interface DashboardCacheEntry<T> {
  data: T;
  timestamp: number;
  etag: string;
}

class DashboardCache {
  private cache = new Map<string, DashboardCacheEntry<any>>();
  
  private readonly TTL_CONFIG = {
    provider_summary: 60000,      // 1 min - frequently changing
    application_list: 30000,      // 30s - high churn
    scholarship_list: 120000,     // 2 min - moderate churn
    revenue_aggregates: 300000,   // 5 min - computed less frequently
  };

  async getOrFetch<T>(
    key: string,
    type: keyof typeof this.TTL_CONFIG,
    fetcher: () => Promise<T>
  ): Promise<{ data: T; cached: boolean }> {
    const entry = this.cache.get(key);
    const ttl = this.TTL_CONFIG[type];
    
    if (entry && Date.now() - entry.timestamp < ttl) {
      return { data: entry.data, cached: true };
    }
    
    const data = await fetcher();
    const etag = this.computeEtag(data);
    
    this.cache.set(key, { data, timestamp: Date.now(), etag });
    this.evictOldEntries();
    
    return { data, cached: false };
  }

  invalidateProvider(providerId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`provider:${providerId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}

export const dashboardCache = new DashboardCache();
```

### Cache Invalidation Strategy

| Event | Invalidation Scope |
|-------|-------------------|
| Application submitted | `provider:{id}:applications`, `provider:{id}:summary` |
| Scholarship created/updated | `provider:{id}:scholarships`, `provider:{id}:summary` |
| Award disbursed | `provider:{id}:revenue`, `provider:{id}:summary` |
| Provider profile update | `provider:{id}:*` (full invalidation) |

---

## 2. Required Database Indexes

### Critical Indexes for Dashboard Queries

```sql
-- Provider-scoped application queries (most common)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_provider_status 
ON applications (scholarship_id, status, created_at DESC);

-- Provider's scholarships listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scholarships_provider_active
ON scholarships (organization, is_active, deadline DESC);

-- Optimized for provider dashboard summary stats
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_provider_summary
ON applications (scholarship_id, status) 
INCLUDE (created_at, updated_at);

-- Partial index for active/pending applications only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_active
ON applications (scholarship_id, updated_at DESC)
WHERE status IN ('draft', 'in_progress', 'submitted', 'under_review');

-- Revenue/analytics aggregation (provider_id lookup)
-- Note: Requires provider_id column on scholarships or join optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scholarships_deadline_amount
ON scholarships (deadline, amount)
WHERE is_active = true;
```

### Composite Indexes for Common Filters

```sql
-- Dashboard filtering: status + date range
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_status_date
ON applications (status, updated_at DESC);

-- Scholarship search with deadline filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scholarships_active_deadline
ON scholarships (is_active, deadline)
WHERE deadline > NOW();
```

### Index Monitoring Query

```sql
-- Check index usage and identify missing indexes
SELECT 
  schemaname || '.' || relname AS table,
  seq_scan,
  idx_scan,
  CASE WHEN seq_scan > 0 
    THEN round(idx_scan::numeric / (seq_scan + idx_scan) * 100, 2) 
    ELSE 100 
  END AS idx_usage_pct,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE n_live_tup > 1000
ORDER BY seq_scan DESC
LIMIT 20;
```

---

## 3. Connection Pool Sizing Recommendations

### Current Configuration Analysis

| Parameter | Current | Recommended | Rationale |
|-----------|---------|-------------|-----------|
| `max` connections | 20 | 25-30 | Handle spike traffic |
| `min` connections | 2 | 5 | Reduce cold-start latency |
| `idleTimeoutMillis` | 30000 | 20000 | Faster reclaim under load |
| `connectionTimeoutMillis` | 2000 | 3000 | Allow for network jitter |
| `statement_timeout` | None | 5000ms | Prevent runaway queries |

### Pool Configuration

```typescript
// server/db.ts - Recommended pool settings
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // Connection limits
  max: 25,                      // Max concurrent connections
  min: 5,                       // Minimum warm connections
  
  // Timeouts
  idleTimeoutMillis: 20000,     // Close idle after 20s
  connectionTimeoutMillis: 3000, // Wait 3s for connection
  
  // Query safety
  statement_timeout: 5000,      // 5s max query time
  
  // SSL for production
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
});

// Health check - run every 30s
setInterval(async () => {
  try {
    const { totalCount, idleCount, waitingCount } = pool;
    
    if (waitingCount > 5) {
      console.warn(`⚠️ Pool pressure: waiting=${waitingCount}, total=${totalCount}`);
    }
    
    // Emit metrics to A8
    telemetryClient.emit({
      event_name: 'db_pool_health',
      data: { totalCount, idleCount, waitingCount },
    });
  } catch (e) {
    console.error('Pool health check failed:', e);
  }
}, 30000);
```

### Read Replica Configuration (If Available)

```typescript
// server/db.ts - Read replica pool
export const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL || process.env.DATABASE_URL,
  max: 15,                      // Separate pool for reads
  min: 3,
  idleTimeoutMillis: 30000,
  statement_timeout: 3000,      // Reads should be faster
});

// Query router
export async function query(sql: string, params?: any[], options?: { write?: boolean }) {
  const pool = options?.write ? primaryPool : readPool;
  return pool.query(sql, params);
}
```

---

## 4. Query Optimization Patterns

### Pagination Best Practice

```typescript
// Cursor-based pagination (faster than OFFSET for large datasets)
async function getApplications(providerId: string, cursor?: string, limit = 20) {
  const cacheKey = `provider:${providerId}:apps:${cursor}:${limit}`;
  
  return dashboardCache.getOrFetch(cacheKey, 'application_list', async () => {
    const query = `
      SELECT a.*, s.title as scholarship_title
      FROM applications a
      JOIN scholarships s ON a.scholarship_id = s.id
      WHERE s.organization = $1
        ${cursor ? 'AND a.id < $3' : ''}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT $2
    `;
    
    const params = cursor 
      ? [providerId, limit + 1, cursor]
      : [providerId, limit + 1];
    
    const result = await db.query(query, params);
    const hasMore = result.rows.length > limit;
    
    return {
      items: result.rows.slice(0, limit),
      nextCursor: hasMore ? result.rows[limit - 1].id : null,
    };
  });
}
```

### Aggregation with Materialized View Pattern

```sql
-- Create materialized view for dashboard summary (refresh every 5 min)
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_dashboard_summary AS
SELECT 
  s.organization as provider_id,
  COUNT(DISTINCT s.id) as total_scholarships,
  COUNT(DISTINCT a.id) as total_applications,
  COUNT(DISTINCT CASE WHEN a.status = 'submitted' THEN a.id END) as pending_applications,
  COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as accepted_applications,
  SUM(CASE WHEN a.status = 'accepted' THEN s.amount ELSE 0 END) as total_awarded,
  MAX(a.updated_at) as last_activity
FROM scholarships s
LEFT JOIN applications a ON a.scholarship_id = s.id
WHERE s.is_active = true
GROUP BY s.organization;

-- Unique index for fast lookups
CREATE UNIQUE INDEX idx_provider_summary_id ON provider_dashboard_summary(provider_id);

-- Refresh function (call from cron or trigger)
REFRESH MATERIALIZED VIEW CONCURRENTLY provider_dashboard_summary;
```

---

## 5. Performance Targets Summary

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Dashboard load p95 | 300-450ms | ≤300ms | Caching + indexes |
| Application list p95 | 150-250ms | <100ms | Cursor pagination + cache |
| Summary stats p95 | 200-350ms | <80ms | Materialized view |
| Pool wait time p95 | 50-100ms | <30ms | Pool sizing |
| Cache hit rate | N/A | >70% | L1 cache layer |

---

## 6. Monitoring & Alerting

### Key Metrics

```typescript
// Emit to A8 telemetry
{
  event_name: 'dashboard_performance',
  data: {
    endpoint: string,
    provider_id_hash: string,
    query_ms: number,
    cache_hit: boolean,
    row_count: number,
    pool_wait_ms: number,
  }
}
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Dashboard p95 | >250ms | >300ms |
| Pool utilization | >70% | >85% |
| Cache hit rate | <60% | <40% |
| Query timeout rate | >0.1% | >1% |
| Slow query count (>1s) | >5/min | >20/min |

---

## 7. Implementation Priority

1. **P0 (Pre-Gate-6)**: Add critical indexes (applications, scholarships)
2. **P1 (D+1)**: Implement L1 dashboard cache
3. **P2 (D+3)**: Pool sizing optimization + monitoring
4. **P3 (D+7)**: Materialized view for summary stats
5. **P4 (D+14)**: Read replica routing (if scaling needed)

---

*Document generated: 2026-01-21*  
*Author: Agent3 Performance Engineering*
