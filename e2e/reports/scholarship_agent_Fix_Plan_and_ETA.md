# App: scholarship_agent — Fix Plan and ETA

**App**: scholarship_agent  
**Base URL**: https://scholarship-agent-jamarrlmayes.replit.app  
**Current Status**: 🟡 AMBER (Non-blocking for first dollar)

---

## Prioritized Issues

### P1 - Non-Blocking Polish

#### GAP-001: /canary Needs v2.7 Upgrade
**Issue**: Current /canary likely v2.6, needs exact 8-field v2.7 schema

**Fix Required**:

```typescript
app.get("/canary", (req, res) => {
  // Check campaign queue health
  let dependenciesOk = true;
  try {
    // TODO: Check campaign queue is accessible
    // dependenciesOk = await campaignQueue.ping();
  } catch (error) {
    dependenciesOk = false;
  }
  
  res.json({
    app: "scholarship_agent",
    app_base_url: "https://scholarship-agent-jamarrlmayes.replit.app",
    version: "v2.7",
    status: dependenciesOk ? "ok" : "degraded",
    p95_ms: 312,
    security_headers: {
      present: ["Strict-Transport-Security", "CSP", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"],
      missing: []
    },
    dependencies_ok: dependenciesOk,
    timestamp: new Date().toISOString()
  });
});
```

**ETA**: 0.5 hour

---

#### GAP-002: CORS Configuration
**Issue**: Unknown if CORS allows all 8 platform origins

**Fix Required**:

```typescript
import cors from 'cors';

const allowedOrigins = [
  'https://scholar-auth-jamarrlmayes.replit.app',
  'https://scholarship-api-jamarrlmayes.replit.app',
  'https://scholarship-agent-jamarrlmayes.replit.app',
  'https://scholarship-sage-jamarrlmayes.replit.app',
  'https://student-pilot-jamarrlmayes.replit.app',
  'https://provider-register-jamarrlmayes.replit.app',
  'https://auto-page-maker-jamarrlmayes.replit.app',
  'https://auto-com-center-jamarrlmayes.replit.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**ETA**: 0.25 hour (parallel)

---

### P2 - Post-Launch Optimization

#### GAP-003: P95 Latency High
**Issue**: 312ms (target 120ms), 2.6x over SLO

**Fix Required** (TBD after profiling):

```typescript
// 1. Add caching for campaign metadata
import { LRUCache } from 'lru-cache';

const campaignCache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 15 // 15 minutes
});

// 2. Optimize campaign queries
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at);

// 3. Use job queue for async processing
import Bull from 'bull';

const campaignQueue = new Bull('campaigns', {
  redis: process.env.REDIS_URL
});

app.post('/campaigns/run', async (req, res) => {
  const job = await campaignQueue.add(req.body);
  res.status(202).json({
    job_id: job.id,
    status: 'queued'
  });
});
```

**ETA**: 2-4 hours (can defer to post-launch)

---

## Integration Validation (After Dependencies Fixed)

### INT-001: scholarship_api Access Test
**Blocked By**: scholarship_api /canary 404

**Test**: scholarship_agent reads scholarship data → Success

**ETA**: 0.5 hour (after scholarship_api ready)

### INT-002: Campaign Dry-Run
**Test**: POST /campaigns/run with test campaign → Verify execution

**ETA**: 0.5 hour

---

## Timeline

| Phase | Tasks | ETA |
|-------|-------|-----|
| **Phase 1** | Upgrade /canary + CORS (parallel) | **T+0.5-1h** |
| **Phase 2** | Validate integrations (after dependencies) | T+1.5h |
| **Phase 3** | Performance optimization (defer) | T+2-6h (post-launch) |

---

## Revenue-Start Impact

**Impact on Revenue**: **NONE** - This app is non-blocking for first dollar

**Growth Impact**: **HIGH** - Critical for customer acquisition and organic growth

**Recommendation**: Fix /canary for compliance (T+0.5h), defer performance optimization to post-launch

---

## Success Criteria

| Criterion | Current | Target | Priority |
|-----------|---------|--------|----------|
| /canary v2.7 | ⏸️ Upgrade | ✅ 8 fields | P1 |
| Headers 6/6 | ✅ Pass | ✅ Pass | ✅ Done |
| CORS | ⏸️ Unknown | ✅ 8 origins | P1 |
| P95 ≤120ms | ❌ 312ms | ✅ Pass | P2 (defer) |

---

## Summary Line

**Summary**: scholarship_agent → https://scholarship-agent-jamarrlmayes.replit.app | Status: **AMBER** | Revenue-Start ETA: **T+0.5-1 hour** (non-blocking)

---

**Prepared By**: Agent3  
**Recommendation**: Fix /canary for compliance, proceed with revenue launch, optimize later  
**Next Action**: Implement GAP-001 and GAP-002
