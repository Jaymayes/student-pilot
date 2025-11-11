# Monitoring & Alerting Runbook
**APPLICATION NAME:** student_pilot  
**APP_BASE_URL:** https://student-pilot-jamarrlmayes.replit.app  
**Document Type:** Operational Runbook  
**Created:** November 11, 2025  
**CEO Deadline:** November 12, 2025 at 12:00 UTC  
**Owner:** student_pilot Engineering Team

---

## Executive Summary

student_pilot implements comprehensive monitoring, alerting, and paging infrastructure to maintain 99.9% uptime SLO and P95 ≤120ms latency targets. This runbook documents operational procedures, alert thresholds, escalation paths, and incident response workflows.

**Monitoring Coverage:**
- ✅ Uptime & availability tracking
- ✅ P50/P95/P99 latency metrics
- ✅ Error rate monitoring (target: ≤0.1%)
- ✅ Request_id correlation (100% coverage)
- ✅ Business event tracking (activation funnel)
- ✅ Resource utilization (memory, CPU)

**Alerting Infrastructure:**
- Throttled event-driven alerts (5-minute cooldown)
- Real-time performance anomaly detection
- Multi-channel notification (console + future PagerDuty/Slack)
- Automated alert deduplication

---

## 1. Monitoring Infrastructure

### 1.1 Metrics Collection System

**Implementation:** `server/monitoring/productionMetrics.ts`

```typescript
// Metrics collected per request:
- Duration (P50/P95/P99)
- HTTP status codes
- Request_id lineage
- Route-level breakdown
- Error tracking
```

**Admin Endpoint:**
- URL: `https://student-pilot-jamarrlmayes.replit.app/api/admin/metrics`
- Auth: `SHARED_SECRET` header
- Returns: Real-time metrics snapshot (P50/P95/P99, error rates, uptime)

**Metrics Retention:**
- In-memory: Last 10,000 requests (ProductionMetricsCollector.MAX_SAMPLES)
- Time-based: 5 minutes rolling window (MetricsCollector.sampleRetentionMs)
- Database: business_events table (permanent audit trail)
- Rollup: Daily 06:00 UTC KPI exports

### 1.2 SLO Targets vs Current Implementation

**CEO-Mandated SLO Targets:**

| Metric | CEO Target | Current Status | Notes |
|--------|-----------|----------------|-------|
| Uptime | ≥99.9% | ✅ Tracked | Monitoring operational |
| P95 Latency | ≤120ms | ⚠️ Tracked, alerts at >1000ms | Alert threshold 8.3× SLO (see Section 2.1) |
| P99 Latency | ≤200ms | ✅ Tracked | Calculated from samples |
| Error Rate | ≤0.1% | ⚠️ Tracked, alerts at >5% | Alert threshold 50× SLO (see Section 2.1) |
| Request_id Coverage | 100% | ✅ Operational | Correlation middleware active |

**Gap Summary:**
- ✅ Metrics collection: Fully operational
- ✅ SLO tracking: All targets measured
- ⚠️ Alert alignment: Thresholds too loose (requires tightening)
- ⏳ External alerting: PagerDuty/Slack not yet integrated

**Recommendation:** See Section 2.1 for detailed alert threshold gaps and remediation plan.

### 1.3 Monitored Components

| Component | Monitoring Method | Key Metrics | Code Reference |
|-----------|------------------|-------------|----------------|
| API Routes | Request middleware | Latency, errors, throughput | `server/monitoring/productionMetrics.ts` |
| Database | Query instrumentation | Query time, slow queries | `server/monitoring/metrics.ts` |
| Authentication | Auth middleware | Success rate, failures | `server/routes.ts` (auth checks) |
| AI Operations | OpenAI wrapper | Token usage, cost, latency | `server/openai.ts` |
| File Uploads | GCS integration | Upload time, failures | `server/storage.ts` |
| Session Management | Express session | Active sessions, errors | `server/index.ts` |
| Business Events | Event emitter | Activation metrics, conversions | `server/analytics/ttvTracker.ts` |

---

## 2. Alerting System

### 2.1 Alert Types & Thresholds

**Implementation:** `server/monitoring/alerting.ts` + `server/monitoring/metrics.ts`

**Current Alert Thresholds (As Implemented):**

| Alert | Trigger Condition | Severity | Throttle Window | Code Reference |
|-------|------------------|----------|-----------------|----------------|
| **High Latency** | Duration >1000ms | WARNING | 5 min | `metrics.ts:135` |
| **High Error Rate** | >5% error rate (min 10 requests) | WARNING | 5 min | `metrics.ts:148` |
| **Slow Query** | Query >500ms | WARNING | 5 min | `metrics.ts:199` |
| **Expensive AI** | Cost not implemented yet | N/A | N/A | Placeholder |
| **High Memory** | Memory thresholds not set | N/A | N/A | `metrics.ts` resource monitoring |
| **Cache Eviction** | >100 entries evicted | INFO | 5 min | `alerting.ts:61` |

**SLO vs Alert Threshold Gaps:**

| Metric | CEO SLO Target | Current Alert Threshold | Gap Analysis |
|--------|---------------|------------------------|--------------|
| P95 Latency | ≤120ms | Alerts at >1000ms | ⚠️ Alert too loose (8.3× SLO) |
| Error Rate | ≤0.1% | Alerts at >5% | ⚠️ Alert too loose (50× SLO) |
| Query Performance | Not specified | Alerts at >500ms | ✅ Reasonable threshold |

**Recommendation:** Tighten alert thresholds to align with CEO SLO targets:
- P95 latency: Alert at >150ms (WARNING), >200ms (CRITICAL)
- Error rate: Alert at >0.5% (WARNING), >1.0% (CRITICAL)
- Requires code update: `server/monitoring/metrics.ts` lines 135, 148

### 2.2 Alert Deduplication

**Throttling Logic:**
```typescript
// Alerts throttled per key (route/operation) with 5-minute cooldown
const ALERT_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
```

**Benefits:**
- Prevents alert storms
- Reduces noise during incidents
- Focuses response on root causes

### 2.3 Alert Channels

**Currently Operational:**
- ✅ Console logs with severity markers (`🚨 [ALERT]`, `⚠️ [ALERT]`)
- ✅ Structured error messages with context (route, duration, threshold)
- ✅ Throttled emission (5-minute cooldown per alert key)
- ✅ Secure logging (no PII exposure)

**Not Yet Implemented (Planned):**
- ⏳ PagerDuty webhook integration (for critical P0/P1 incidents)
- ⏳ Slack webhook integration (for WARNING/INFO alerts)
- ⏳ Email digest (daily rollup summary)
- ⏳ SMS paging (for P0 incidents)

**Current Limitations:**
- Alerts only visible in application logs (no external notifications)
- On-call engineers must proactively monitor logs
- No automated paging for after-hours incidents

**Integration Points (TODO):**
```typescript
// server/monitoring/alerting.ts - TODO comments at lines 28, 34, 41, 49
// Example: POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL
// Example: POST https://events.pagerduty.com/v2/enqueue
```

**Mitigation:**
- Daily health check procedures (Section 4.1)
- Admin metrics endpoint for on-demand monitoring
- Real-time dashboard access (Section 5.1)

---

## 3. Paging Policy

### 3.1 On-Call Rotation

**Structure:**
- Primary: Engineering Team Lead
- Secondary: Platform Engineer
- Escalation: CTO

**Rotation:**
- Weekly rotation (Monday 00:00 UTC)
- Handoff includes runbook review
- Incident history shared

### 3.2 Escalation Thresholds

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| **P0 - Critical** | Service down, revenue impact | 5 minutes | Page primary immediately |
| **P1 - High** | SLO breach, degraded performance | 15 minutes | Page primary within 15min |
| **P2 - Medium** | Non-critical errors, warnings | 1 hour | Email + Slack notification |
| **P3 - Low** | Info alerts, trends | Next business day | Slack notification only |

### 3.3 Incident Response Workflow

**Step 1: Acknowledge (Within 5 minutes)**
1. Acknowledge page in PagerDuty
2. Join incident war room (Slack #incidents)
3. Update status page

**Step 2: Investigate (Within 15 minutes)**
1. Check admin metrics endpoint: `/api/admin/metrics`
2. Review application logs
3. Check database performance
4. Identify root cause

**Step 3: Mitigate (Within 30 minutes)**
1. Apply immediate mitigation (restart, rollback, circuit breaker)
2. Restore service to SLO targets
3. Monitor for stability

**Step 4: Resolve (Within 2 hours)**
1. Deploy permanent fix
2. Verify SLO compliance
3. Document incident in postmortem

**Step 5: Postmortem (Within 48 hours)**
1. Root cause analysis
2. Action items for prevention
3. Runbook updates

---

## 4. Monitoring Runbook Procedures

### 4.1 Daily Health Check

**Frequency:** Every day at 06:00 UTC  
**Owner:** scholarship_sage (automated rollup)

**Checklist:**
- [ ] Review daily KPI rollup output
- [ ] Check uptime ≥99.9% (24-hour window)
- [ ] Verify P95 latency ≤120ms
- [ ] Confirm error rate ≤0.1%
- [ ] Validate activation metrics (4/4 present)
- [ ] Check business event counts

**Failure Action:**
- If SLO breach: Create P1 incident
- If trending down: Investigate preemptively

### 4.2 Performance Investigation

**Triggered By:** High latency alert

**Procedure:**
1. **Check Admin Metrics:**
   ```bash
   curl -H "X-Shared-Secret: $SHARED_SECRET" \
     https://student-pilot-jamarrlmayes.replit.app/api/admin/metrics
   ```

2. **Identify Slow Routes:**
   - Review P95/P99 latency by route
   - Check request counts

3. **Database Query Analysis:**
   - Look for slow query alerts
   - Check database connection pool
   - Review query execution plans

4. **Resource Check:**
   - CPU utilization
   - Memory usage
   - Network I/O

5. **Mitigation:**
   - Add caching if repeated queries
   - Optimize slow queries
   - Scale resources if needed

### 4.3 Error Rate Investigation

**Triggered By:** High error rate alert

**Procedure:**
1. **Check Error Distribution:**
   - Group errors by status code
   - Identify failing routes
   - Check error messages

2. **Common Root Causes:**
   - Authentication failures (401/403)
   - Validation errors (400)
   - Database connection issues (500)
   - OpenAI API rate limits (429)
   - Timeout errors (504)

3. **Mitigation:**
   - Fix validation logic
   - Reset database connections
   - Implement retry logic
   - Add circuit breakers

### 4.4 Incident Response

**P0 Incident: Service Down**

**Detection:**
- Health check endpoint fails
- Uptime drops below 99%
- No successful requests for 5 minutes

**Response:**
1. **Immediate:**
   - Page on-call engineer
   - Check application logs
   - Verify database connectivity
   - Check external dependencies

2. **Mitigation:**
   - Restart service if crashed
   - Rollback if recent deployment
   - Activate circuit breakers
   - Scale resources if overloaded

3. **Communication:**
   - Update status page
   - Notify CEO if revenue impact
   - Communicate ETA to stakeholders

**P1 Incident: SLO Breach**

**Detection:**
- P95 >200ms sustained
- Error rate >1.0%
- Uptime <99.5%

**Response:**
1. **Investigate:**
   - Check recent code changes
   - Review deployment timeline
   - Analyze error patterns

2. **Mitigate:**
   - Rollback if regression
   - Add caching if traffic spike
   - Optimize if performance issue

3. **Monitor:**
   - Watch metrics for 30 minutes
   - Verify SLO recovery
   - Document findings

---

## 5. Dashboard & Reporting

### 5.1 Real-Time Metrics Dashboard

**Access:** `https://student-pilot-jamarrlmayes.replit.app/api/admin/metrics`

**Metrics Displayed:**
```json
{
  "timestamp": "2025-11-11T00:00:00Z",
  "uptime_percent": 99.95,
  "request_count": 1234,
  "error_count": 2,
  "error_rate": 0.16,
  "latency": {
    "p50": 45,
    "p95": 95,
    "p99": 150
  },
  "routes": {
    "/api/scholarships": { "count": 500, "p95": 80 },
    "/api/applications": { "count": 300, "p95": 120 }
  }
}
```

### 5.2 Daily KPI Rollup

**Frequency:** 06:00 UTC daily  
**Owner:** scholarship_sage

**Includes:**
- B2C metrics (signups, activation rate, ARPU)
- B2B metrics (providers, GMV, fees)
- SLO compliance (uptime, latency, errors)
- Gate status updates
- Activation funnel (4 metrics)

**Template:** `evidence_root/student_pilot/DAILY_KPI_ROLLUP_TEMPLATE.md`

### 5.3 Audit Trail

**Storage:** `business_events` table

**Event Types:**
- student_signup
- first_document_upload
- first_scholarship_saved
- first_application_started
- first_application_submitted
- credit_purchase
- credit_refund

**Query Example:**
```sql
SELECT * FROM business_events 
WHERE event_type = 'first_document_upload' 
AND created_at >= NOW() - INTERVAL '24 hours';
```

---

## 6. Operational Procedures

### 6.1 Service Restart Procedure

**When to Use:**
- High memory usage (>500MB)
- Connection pool exhaustion
- Unrecoverable errors

**Steps:**
1. Notify team in #incidents
2. Trigger graceful shutdown
3. Wait for in-flight requests (max 30s)
4. Restart service
5. Verify health endpoint
6. Monitor metrics for 15 minutes

**Verification:**
```bash
# Check health
curl https://student-pilot-jamarrlmayes.replit.app/api/health

# Expected: { "status": "healthy" }
```

### 6.2 Rollback Procedure

**When to Use:**
- Error rate spike after deployment
- Performance regression
- Critical bug introduced

**Steps:**
1. Identify last known good version
2. Execute rollback command
3. Verify health endpoint
4. Check metrics dashboard
5. Monitor for 30 minutes
6. Document rollback reason

**Target:** Rollback complete within 5 minutes

### 6.3 Database Maintenance

**Scheduled:** Weekly, Sundays at 03:00 UTC

**Tasks:**
- Vacuum analyze database
- Update statistics
- Check index health
- Archive old business_events (>90 days)

**Impact:** <1 minute downtime expected

---

## 7. Code References

### 7.1 Monitoring Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `server/monitoring/productionMetrics.ts` | Metrics collection middleware | collectRequestMetrics() |
| `server/monitoring/alerting.ts` | Alert event handlers | throttledAlert() |
| `server/monitoring/metrics.ts` | Core metrics engine | metricsCollector |
| `server/monitoring/alertManager.ts` | Alert management | AlertManager class |
| `server/monitoring/dashboards.ts` | Dashboard configurations | Dashboard definitions |
| `server/routes/adminMetrics.ts` | Admin metrics endpoint | GET /api/admin/metrics |

### 7.2 Key Dependencies

```json
{
  "monitoring": [
    "@sentry/node",
    "@sentry/profiling-node"
  ],
  "metrics": [
    "express middleware (custom)",
    "events (Node.js builtin)"
  ]
}
```

---

## 8. SLA Compliance

### 8.1 15-Minute Evidence SLA

**CEO Requirement:** Evidence submission within 15 minutes of request

**Preparation:**
- ✅ Admin metrics endpoint operational (real-time data)
- ✅ Logs readily accessible
- ✅ Runbook procedures documented
- ✅ Alert history queryable

**Evidence Collection:**
1. Export `/api/admin/metrics` output
2. Capture recent alert logs
3. Screenshot dashboard (if applicable)
4. SQL query for business events
5. Package in evidence bundle

**Time Estimate:** 5-10 minutes

### 8.2 SLO Monitoring

**Continuous Monitoring:**
- Real-time metrics collection (every request)
- Alert evaluation (every 5 minutes)
- Daily rollup (06:00 UTC)
- Weekly review (Mondays)

**Compliance Reporting:**
- Included in daily KPI rollup
- Available via admin metrics endpoint
- Tracked in monitoring dashboards

---

## 9. Escalation Contacts

| Role | Responsibility | Contact Method |
|------|----------------|----------------|
| On-Call Engineer | First responder | PagerDuty |
| Engineering Lead | Escalation point | PagerDuty + Slack |
| CTO | Executive escalation | PagerDuty + Phone |
| CEO | Revenue-impacting incidents | Direct notification |

**Escalation Triggers:**
- P0 incidents (immediate)
- SLO breach >2 hours
- Revenue impact detected
- Security incident

---

## 10. Continuous Improvement

### 10.1 Runbook Updates

**Frequency:** After every P0/P1 incident

**Process:**
1. Document new procedures discovered during incident
2. Update alert thresholds if needed
3. Add new troubleshooting steps
4. Review with team

**Version Control:** Track in evidence_root/student_pilot/

### 10.2 Metrics Evolution

**Planned Enhancements:**
- WebVitals monitoring (frontend performance)
- Database query profiling
- Cache hit/miss rates
- AI token usage optimization
- User journey funnel tracking

---

## Appendices

### A. Alert Examples

**High Latency Alert:**
```
🚨 [ALERT] HIGH LATENCY: /api/scholarships took 180ms (threshold: 150ms)
```

**High Error Rate Alert:**
```
🚨 [ALERT] HIGH ERROR RATE: /api/applications has 1.2% error rate (15/1250)
```

**Slow Query Alert:**
```
🚨 [ALERT] SLOW QUERY: SELECT scholarships took 1200ms (threshold: 1000ms)
```

### B. Health Check Endpoint

**URL:** `https://student-pilot-jamarrlmayes.replit.app/api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-11T00:00:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

### C. Admin Metrics Endpoint

**URL:** `https://student-pilot-jamarrlmayes.replit.app/api/admin/metrics`  
**Auth:** `X-Shared-Secret: $SHARED_SECRET`

**Sample Response:**
```json
{
  "timestamp": "2025-11-11T12:00:00Z",
  "uptime_percent": 99.95,
  "request_count": 12450,
  "error_count": 12,
  "error_rate": 0.096,
  "latency": {
    "p50": 42,
    "p95": 98,
    "p99": 145
  },
  "memory_mb": 280,
  "routes": [
    {
      "path": "/api/scholarships",
      "count": 5000,
      "errors": 5,
      "p95": 85
    },
    {
      "path": "/api/applications",
      "count": 3000,
      "errors": 3,
      "p95": 120
    }
  ]
}
```

---

**Document Version:** 1.0  
**Last Updated:** November 11, 2025  
**Next Review:** After first P0/P1 incident or Dec 1, 2025  
**Owned By:** student_pilot Engineering Team  
**CEO Deadline Compliance:** ✅ Submitted before Nov 12, 12:00 UTC
