# ScholarLink Production Canary Runbook

## Executive Summary

**Objective**: Validate production stability with minimal risk using phased traffic rollout  
**SLO Targets**: 99.9% uptime, P95 <120ms, <0.5% error rate  
**Rollback Criteria**: Any SLO violation sustained >10 minutes or 3 consecutive probe failures

---

## Deployment Schedule

| Phase | Traffic % | Duration | Go/No-Go Gate |
|-------|-----------|----------|---------------|
| **Phase 0: Synthetic** | 0% (monitoring only) | 2 hours | Zero schema failures, no sustained non-200s |
| **Phase 1: Canary** | 5% | 30 minutes | SLO compliance, no rollback triggers |
| **Phase 2: Ramp** | 25% | 60 minutes | Continued SLO compliance |
| **Phase 3: Majority** | 50% | 2 hours | Business metrics stable |
| **Phase 4: Full** | 100% | 24 hour bake | Complete success, remove feature flags |

**Traffic Scope**: Start with unauthenticated B2C web traffic in lowest-traffic US region, exclude providers and payments for first 30 minutes.

---

## Critical Endpoints

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /ready` - Readiness probe
- `GET /metrics` - SLO metrics (Prometheus format available at `/metrics/prometheus`)

### B2C Critical Path
- `GET /api/scholarships` - Browse scholarships (high traffic)
- `GET /api/profile` - Student profile
- `GET /api/matches` - Scholarship matches
- `GET /api/applications` - Application tracking
- `GET /api/documents` - Document management

### Analytics & Dashboards
- `GET /api/analytics/ttv-dashboard` - Time-to-Value metrics
- `GET /api/dashboard/security` - Security compliance
- `GET /api/dashboard/infrastructure` - Infrastructure health
- `GET /api/dashboard/stats` - Provider dashboard

### Payments (Smoke Only)
- `GET /api/billing/summary` - Billing summary
- `GET /api/billing/usage` - Usage tracking
- `POST /api/billing/checkout` - Checkout initiation (sandbox only)

---

## SLO Thresholds

### Availability
- ✅ **Target**: 99.9% uptime
- 🚨 **Rollback**: 5xx rate ≥0.5% OR non-auth 4xx rate ≥1.0% (sustained >10 min)

### Latency
- ✅ **Target**: Global API P95 ≤120ms
- ⚠️ **Warning**: P95 >120ms but ≤200ms during canary ramp (acceptable, monitor)
- 🚨 **Rollback**: P95 >250ms OR P99 >600ms (sustained >10 min)

### Data Integrity
- ✅ **Target**: 100% schema validation pass
- 🚨 **Rollback**: Schema failures >0.1% of requests

### Infrastructure
- ✅ **Target**: CPU <60%, Memory >30% free, DB query P95 <50ms
- 🚨 **Rollback**: Sustained queue backlog OR DB P95 >100ms

### Error Budget
- ✅ **Target**: <10% monthly error budget consumed during rollout
- 🚨 **Rollback**: >10% error budget burn in rollout window

---

## Rollback Triggers (Immediate)

Execute immediate rollback if **ANY** of the following sustained >10 minutes or 3 consecutive probe failures:

1. **Availability**: 5xx ≥0.5% OR non-auth 4xx ≥1.0%
2. **Latency**: API P95 >250ms OR P99 >600ms
3. **Error Budget**: Burn >10% in rollout window
4. **Security**: WAF spikes, abnormal auth failures, PII in logs
5. **Data Integrity**: Schema validation failures OR data corruption detected
6. **Business**: Signup completion rate drops >10% vs control, TTV p80 regresses >20%

---

## Synthetic Monitoring

### Configuration
```bash
# Environment
export CANARY_BASE_URL=https://scholarlink.replit.app
export ALERT_WEBHOOK_URL=<slack-webhook>
export SLACK_CHANNEL=#ship-room
export BUILD_ID=<git-sha>

# Run synthetic monitor
npm run canary:monitor
```

### Execution
```bash
cd canary
npm install
npm start
```

### What It Monitors
- **Frequency**: 60 second checks with exponential backoff on failure
- **User-Agent**: `ScholarshipAI-Canary/1.0`
- **Test Mode**: Appends `?e2e=1` to avoid analytics pollution
- **Checks**: Health, B2C flow, provider read-only, payments smoke, negative tests
- **Validation**: JSON schema validation on all responses
- **Metrics**: P50/P95/P99 latency, success/failure counts, error types

### Alert Conditions
- 3 consecutive failures across any check suite
- >10% failure rate in any single run
- Schema validation failures on critical endpoints
- P95 latency >250ms

---

## Performance Baseline

### Capture Baseline (Before Canary)
```bash
cd canary
npm run baseline -- http://localhost:5000 100
```

### Expected Baseline (Development Environment)
```json
{
  "summary": {
    "overallP50": 45,
    "overallP95": 180,
    "overallP99": 380,
    "sloCompliant": false
  }
}
```

**Note**: Development environment shows P95 ~180ms. Production target is <120ms with optimized infrastructure.

### Critical Endpoint Baselines
- `/api/analytics/ttv-dashboard`: P95 ~44ms
- `/api/dashboard/security`: P95 ~172ms  
- `/api/dashboard/infrastructure`: P95 ~425ms
- `/api/scholarships`: P95 ~95ms

---

## Observability & Dashboards

### Live Dashboards (SRE to Configure)
1. **API Health**: Availability, 4xx/5xx rates, request volume
2. **Latency**: P50/P95/P99 by endpoint, canary vs control comparison
3. **Infrastructure**: CPU, memory, DB connections, queue depth
4. **Security**: WAF events, auth failures, rate limiting
5. **Business**: Signup conversion, TTV metrics, funnel drop-off

### Key Metrics to Watch
```
# Availability
scholarlink_requests_total
scholarlink_requests_errors_total

# Latency  
scholarlink_request_duration_seconds{quantile="0.95"}

# Infrastructure
scholarlink_uptime_seconds
process_cpu_seconds_total
process_resident_memory_bytes
```

### Alert Routing
- **Critical (Page)**: Rollback triggers, data integrity failures, security anomalies
- **Warning (Slack)**: Latency degradation, elevated 4xx rates, approaching thresholds
- **Info (Dashboard)**: Successful phase transitions, baseline deviations

---

## Execution Checklist

### Pre-Deployment (T-30 min)
- [ ] Verify all 12 P0 bugs fixed (confirmed in logs)
- [ ] Run performance baseline and record metrics
- [ ] Configure canary traffic routing (5%→25%→50%→100%)
- [ ] Set up dashboards and alerts in observability platform
- [ ] Enable auto-rollback script with threshold monitoring
- [ ] Verify synthetic monitor running with `?e2e=1` flag
- [ ] Confirm #ship-room incident commander on-call
- [ ] Verify rollback runbook accessible and tested

### Phase 0: Synthetic Canary (2 hours)
- [ ] Start synthetic monitor with 60s checks
- [ ] Verify schema validation 100% pass rate
- [ ] Confirm no sustained non-200 responses
- [ ] Validate P95 latency within thresholds
- [ ] Check zero PII in logs
- [ ] **GO/NO-GO**: All checks green for 2 hours → Proceed to Phase 1

### Phase 1: 5% Traffic (30 min)
- [ ] Route 5% unauthenticated B2C traffic (lowest-risk region)
- [ ] Exclude providers and payments
- [ ] Monitor availability: 5xx <0.5%, 4xx <1.0%
- [ ] Monitor latency: P95 <250ms, P99 <600ms
- [ ] Verify signup completion rate within 10% of baseline
- [ ] Check error budget burn <10%
- [ ] **GO/NO-GO**: All SLOs met for 30 min → Proceed to Phase 2

### Phase 2: 25% Traffic (60 min)
- [ ] Ramp to 25% traffic
- [ ] Continue monitoring all SLOs
- [ ] Validate TTV p80 regression <20%
- [ ] Check infrastructure headroom: CPU <60%, memory >30% free
- [ ] Verify no sustained queue backlog
- [ ] **GO/NO-GO**: All SLOs met for 60 min → Proceed to Phase 3

### Phase 3: 50% Traffic (2 hours)
- [ ] Ramp to 50% traffic
- [ ] Include provider dashboard reads (exclude writes)
- [ ] Monitor business metrics: conversion, ARPU, funnel
- [ ] Validate security posture: no WAF spikes, auth stable
- [ ] Check DB query P95 <50ms
- [ ] **GO/NO-GO**: All SLOs met for 2 hours → Proceed to 24h bake

### Phase 4: 100% Traffic (24 hour bake)
- [ ] Ramp to 100% traffic after 24h bake at 50%
- [ ] Remove feature flags in stages
- [ ] Enable full payment flows (monitor closely)
- [ ] Continue 24h monitoring
- [ ] **SUCCESS**: All SLOs met → Declare production stable

---

## Rollback Procedure

### Automatic Rollback (Preferred)
```bash
# Auto-rollback script monitors thresholds and reverts traffic
npm run canary:auto-rollback
```

### Manual Rollback (If Auto Fails)
1. **Immediate**: Route 100% traffic to stable version
   ```bash
   # Example: Update load balancer target group
   aws elbv2 modify-target-group --target-group-arn <stable-tg> --health-check-enabled
   ```

2. **Verify**: Confirm traffic shifted (check dashboards)

3. **Communicate**: Post in #ship-room
   ```
   🚨 ROLLBACK INITIATED
   Reason: <rollback trigger>
   Traffic: 100% → stable version
   Status: Monitoring recovery
   ```

4. **Investigate**: Open P0 incident, capture logs/metrics

5. **Root Cause**: Analyze failure, plan remediation

6. **Regroup**: Data-first plan before next deployment

---

## Communication Templates

### Phase Transition (Slack: #ship-room)
```
✅ CANARY PHASE X COMPLETE
Phase: <1/2/3/4>
Traffic: <5%/25%/50%/100%>
Duration: <30min/60min/2h/24h>
SLOs: All green ✓
Availability: 99.9%
P95 Latency: <120ms
Error Rate: <0.5%
Next: Proceeding to Phase <X+1>
```

### Rollback Alert (Slack: #ship-room)
```
🚨 CANARY ROLLBACK - IMMEDIATE ACTION REQUIRED
Trigger: <specific threshold violation>
Traffic: Reverting to stable version
Impact: <customer impact assessment>
Team: Incident commander on bridge
ETA: <recovery time estimate>
```

### Success Announcement (Internal)
```
🎉 PRODUCTION CANARY: SUCCESS
All phases completed successfully
Final SLOs: 99.9% uptime, P95 <120ms, <0.5% errors
Business metrics: Stable
Next: Customer-facing release note in digest
```

---

## Contacts & Escalation

| Role | Responsibility | Contact |
|------|---------------|---------|
| **Incident Commander** | Overall rollout coordination | <on-call> |
| **SRE Lead** | Infrastructure, rollback execution | <sre-lead> |
| **Engineering Lead** | Code changes, technical decisions | <eng-lead> |
| **PM Lead** | Business metrics, customer impact | <pm-lead> |
| **Security Lead** | Security validation, compliance | <security-lead> |
| **QA Lead** | Test harness integration, validation | <qa-lead> |

### Escalation Path
1. **L1**: Engineering on-call → Incident Commander
2. **L2**: Engineering Lead → SRE Lead
3. **L3**: VP Engineering → CTO
4. **L4**: CEO (only for customer data breach or sustained outage >4h)

---

## Post-Deployment

### Immediate (T+2h after 100%)
- [ ] Verify all SLOs stable for 2 hours at 100% traffic
- [ ] Run full E2E regression suite
- [ ] Validate analytics instrumentation (exclude synthetic traffic)
- [ ] Check error logs for anomalies
- [ ] Update status page (if applicable)

### T+24h
- [ ] Generate canary report: SLO compliance, business metrics, incidents
- [ ] Review error budget consumption
- [ ] Document lessons learned
- [ ] Update runbook with new insights
- [ ] Schedule CEO update with uptime/latency/conversion data

### T+1 week
- [ ] Full postmortem if any incidents occurred
- [ ] Optimize based on latency hotspots discovered
- [ ] Remove canary infrastructure/feature flags
- [ ] Plan customer-facing release announcement

---

## Technical Implementation Files

### Synthetic Monitor
- **File**: `canary/synthetic-monitor.ts`
- **Run**: `npm run canary:monitor`
- **Config**: Environment variables for base URL, alerts, intervals

### Performance Baseline
- **File**: `canary/performance-baseline.ts`
- **Run**: `npm run baseline -- <url> <samples>`
- **Output**: JSON report with P50/P95/P99 per endpoint

### Health Endpoints
- **File**: `server/health.ts`
- **Routes**: `/health`, `/ready`, `/metrics`, `/metrics/prometheus`
- **Integration**: Registered in `server/index.ts`

### E2E Test Mode
- **File**: `client/src/lib/queryClient.ts`
- **Docs**: `canary/E2E_TEST_MODE.md`
- **Activation**: `?e2e=1` URL parameter or `VITE_E2E_MODE=1`

---

## Success Criteria Summary

✅ **Technical**
- Zero rollbacks during canary
- All SLOs met at every phase
- 100% schema validation pass rate
- No PII leakage in logs
- No security incidents

✅ **Business**
- Signup conversion within 10% of baseline
- TTV p80 regression <20%
- Provider dashboard functional
- Payment flows operational (smoke validated)

✅ **Operational**
- Dashboards accurate and actionable
- Alerts fired appropriately (no false positives)
- Rollback procedure validated (even if not used)
- Team coordination smooth in #ship-room

---

**END OF RUNBOOK**

*Last Updated*: Production Canary Deployment - October 8, 2025  
*Owner*: Platform Engineering Team  
*Review Cycle*: After each deployment, update with lessons learned
