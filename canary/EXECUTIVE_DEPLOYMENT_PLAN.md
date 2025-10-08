# ScholarLink Production Canary - Executive Deployment Plan
## ✅ EXECUTIVE GO AUTHORIZATION RECEIVED

**Authorization Date**: October 8, 2025  
**Deployment Type**: Phased canary with guardrails  
**Phases**: 5% → 25% → 50% → 100%  
**Executive Approver**: CEO

---

## EXECUTIVE DECISIONS (FINAL)

### 1. Canary Region
**Decision**: Use the **lowest-traffic US region** based on last 7-day average RPS and concurrent sessions.

**Selection Criteria**:
- If two regions are within ±5%, choose the one with:
  - Most spare capacity
  - No known scholarship deadline spikes in next 72 hours
- **SRE Action**: Post selected region in #ship-room before kickoff

### 2. Load Balancer/CDN and Feature Flags
**Decision**: **No infrastructure changes** during canary.

**Requirements**:
- Use production providers-of-record (LB/CDN)
- Use existing feature flag platform
- Control exposure via weighted routing + flags
- **DO NOT** ship environment/provider changes during canary

### 3. Payments Scope
**Decision**: **Limited real transactions** during canary.

**Phase 1 (5%)**:
- Allow up to 100 real transactions
- Max $20 per transaction
- Global cap: $1,500
- Monitor: Payment success rate (auth/capture) ≥98.5%
- Monitor: Charge error rate ≤1.0%

**Phase 2 (25%)**:
- Maintain same caps if Phase 1 thresholds met
- Continue monitoring payment KPIs

**Phase 3 (50%)**:
- Unlock normal volume ONLY if payment KPIs hold steady
- Requires observation window completion

**Fallback**:
- If anomalies occur → immediately fall back to smoke-only
- No real charges until investigation complete

### 4. Ship-room Leads (DRIs)
**Required Staffing** (full rollout window):

| Role | Primary | Backup | Contact |
|------|---------|--------|---------|
| **Incident Commander** | SRE on-call | SRE manager | <publish in #ship-room> |
| **Release Engineering** | Platform/Infra lead | - | <publish in #ship-room> |
| **Product/Comms (B2C)** | PM for Student funnel | - | <publish in #ship-room> |
| **Product/Comms (B2B)** | PM for Provider funnel | - | <publish in #ship-room> |
| **Security/Compliance** | Security lead on-call | - | <publish in #ship-room> |
| **Data/Observability** | Analytics/DA owner | - | <publish in #ship-room> |
| **Executive Approver** | CEO | - | For step-ups beyond plan or error budget consumed |

**Action**: Post names/rotations and on-call numbers **T-2h before kickoff**

---

## ROLLOUT PHASES AND OBSERVATION WINDOWS

### Phase Timing
| Phase | Traffic % | Observation Window | Advance Criteria |
|-------|-----------|-------------------|------------------|
| **Phase 1** | 5% | 90 minutes minimum | All Go Gates green |
| **Phase 2** | 25% | 2 hours minimum | All Go Gates green |
| **Phase 3** | 50% | 4 hours minimum | All Go Gates green + P95 ≤120ms |
| **Phase 4** | 100% | Rest of day | All Go Gates green |

**Scheduling**:
- ❌ Avoid peak scholarship deadline windows
- ❌ Avoid top-3 traffic hours in chosen region
- ✅ Select low-risk time window

---

## GO GATES (Must Meet ALL to Advance)

### 1. Platform SLOs
- ✅ **Availability**: 99.9%
- ✅ **P95 Latency**: ≤130ms during canary (target remains ≤120ms)
- ✅ **Error Budget**: 5xx ≤0.5%
- ✅ **Client-Visible Error Rate**: Within +0.2% of regional baseline

### 2. Payments (All Phases)
- ✅ **Success Rate**: ≥98.5% (auth/capture)
- ✅ **Declines/Refunds**: Not elevated vs baseline

### 3. B2C Funnel
- ✅ **Sign-up Completion**: Within 1% of control region
- ✅ **First-Session Completion**: Within 1% of control region

### 4. B2B Provider Dashboard
- ✅ **Error Rate**: ≤1%
- ✅ **Time-to-First-Interaction**: Within 5% of baseline

### 5. **CRITICAL Gate for 50% → 100%**
- ✅ **P95 Latency**: Must be ≤120ms for full observation window
- ⚠️ **Note**: Will not block 5% on P95 ~180ms, but WILL block 50% advance

---

## AUTOMATIC ROLLBACK TRIGGERS

**Trigger Condition**: ANY single trigger sustained for **5 consecutive minutes**

### 1. Latency Degradation
- 🚨 P95 latency >160ms
- 🚨 P99 latency >350ms

### 2. Error Rate Spike
- 🚨 5xx rate >1.0%
- 🚨 Synthetic monitor failures ≥3 consecutive checks

### 3. Payment Failures
- 🚨 Payment auth/capture failures ≥2.0%
- 🚨 >5 consecutive payment failures

### 4. Analytics Anomalies
- 🚨 Material anomalies (CTR, sign-up completion) deviating >3σ from control

**Action**: Immediate rollback → postmortem within 24h → fix-forward plan before retry

---

## OBSERVABILITY AND ALERTING

### Synthetic Monitor
- **Frequency**: 60s cadence with exponential backoff
- **Status**: ON for:
  - Health endpoints
  - B2C happy path
  - Provider dashboard
  - Payments smoke
- **Auto-alert**: #ship-room on threshold breaches

### Health Endpoints
- `/health` - Must remain green
- `/ready` - Must remain green
- `/metrics` - Must remain green
- `/metrics/prometheus` - Must remain green

### E2E Test Mode
- Enforce `?e2e=1` test mode for scripted checks
- Prevent analytics pollution during synthetic monitoring

---

## PERFORMANCE REMEDIATION (Before 50% Step-Up)

**Current Dev Metrics**: P95 ~180ms  
**Production Target**: P95 ≤120ms  
**Gate**: Will not advance past 50% unless P95 ≤120ms

### Priority 1: Cache Optimization
- [ ] Verify CDN/edge caching on read-heavy endpoints (scholarship browse/search)
- [ ] Confirm cache keys and TTLs correct
- [ ] Ensure prewarming active on dashboard tiles

### Priority 2: Database Optimization
- [ ] Confirm essential indexes for top queries
- [ ] Validate N+1 hotspots eliminated
- [ ] Cap payload sizes and enable compression

### Priority 3: Application Optimization
- [ ] Confirm React Query `staleTime=0` scoped to E2E only
- [ ] Avoid forcing no-cache on standard user paths
- [ ] Enable ETag/Last-Modified selectively at CDN (even if disabled in Express)

### Priority 4: Infrastructure Optimization
- [ ] Verify connection pooling and keep-alives
- [ ] Confirm P95 path-by-path to isolate slow endpoints
- [ ] Reduce cold-start risk on autoscaled components

---

## COMPLIANCE AND RISK REQUIREMENTS

### FERPA/COPPA
- ✅ Ensure logs and metrics do not capture PII
- ✅ E2E test mode excluded from analytics attribution
- ✅ Student data protected per regulations

### Payments (PCI)
- ✅ Use processor-of-record's PCI scope
- ✅ Do not broaden scope during canary
- ✅ Limited transaction caps enforced

### Security
- ✅ Confirm prototype pollution and circular refs fixes in production image
- ✅ Run dependency and container scans pre-ship
- ✅ Enforce least-privileged secrets

---

## BUSINESS KPIs TO MONITOR

### B2C (Student Funnel)
- Landing → sign-up conversion
- First match time (TTV)
- First application start rate
- Paid conversion rate
- ARPU on paid credit sales

### B2B (Provider Funnel)
- Active provider sessions
- Listing edits
- Payout events

### CAC/SEO
- Auto Page Maker traffic stable
- SERP CTR remains stable
- No indexing regressions

---

## EXECUTION CHECKLIST (Pre-Kickoff)

### T-2h Before Kickoff
- [ ] **SRE**: Post chosen canary region in #ship-room
- [ ] **SRE**: Post DRI roster with names/rotations/on-call numbers in #ship-room
- [ ] **Platform**: Lock providers-of-record (LB/CDN, feature flags) - no infra substitutions
- [ ] **Data**: Establish control vs canary dashboards (latency, errors, funnel, payments)

### T-1h Before Kickoff
- [ ] **Security**: Confirm log scrubbing and secrets posture, sign off in #ship-room
- [ ] **PM/Comms**: Prep status updates at phase gates per runbook
- [ ] **PM/Comms**: Confirm stakeholder notification list
- [ ] **All Teams**: Final pre-flight checks

### T-0 (Kickoff)
- [ ] Start synthetic monitor (60s cadence)
- [ ] Route 5% traffic to canary
- [ ] Enable payment caps (100 tx, $20 max, $1,500 global)
- [ ] Begin observation window (90 min)

---

## PHASE GATE REPORTING

### Required at Each Gate
Post in #ship-room with the following summary:

```
🚦 CANARY PHASE [X] GATE REPORT

**Observation Window**: [duration] completed
**Traffic**: [X%]

**SLOs**:
- Availability: [X%] (target: 99.9%) ✅/❌
- P95 Latency: [X]ms (target: ≤130ms) ✅/❌
- 5xx Rate: [X%] (target: ≤0.5%) ✅/❌

**Payments**:
- Transactions: [X] (cap: 100)
- Success Rate: [X%] (target: ≥98.5%) ✅/❌
- Total Volume: $[X] (cap: $1,500) ✅/❌

**Funnel KPIs**:
- B2C Sign-up: [X%] vs control [Y%] (Δ[Z%]) ✅/❌
- B2B Error Rate: [X%] (target: ≤1%) ✅/❌

**Recommendation**: GO / NO-GO / ROLLBACK
**Next**: [Advance to Phase X+1 / Hold / Revert]
```

---

## ROLLBACK PROCEDURE

### Trigger Detection
- Automated monitoring detects rollback trigger (5 consecutive minutes)
- Alert fires to #ship-room and pages Incident Commander

### Immediate Actions
1. **Execute Rollback**: Revert traffic to 100% stable version
2. **Communicate**: Post rollback notice in #ship-room
3. **Verify**: Confirm traffic shifted and metrics recovering
4. **Preserve**: Capture logs, metrics, traces for postmortem

### Post-Rollback
- **T+24h**: Complete postmortem (root cause, timeline, impact)
- **T+48h**: Propose fix-forward plan
- **CEO Approval**: Required before reattempting canary

---

## AUTHORIZATION SUMMARY

✅ **Executive GO**: Affirmed for 4-phase rollout (5%→25%→50%→100%)  
✅ **Guardrails**: All gates and rollback triggers defined  
✅ **Deviation Protocol**: Any deviation requires CEO approval  
✅ **Reporting**: Post-phase summaries required at each gate  

**Executive Statement**: *"Let's move with urgency and discipline. This canary validates our SLOs and protects our student and provider experience while we scale toward our 5-year objective."*

---

## NEXT STEPS FOR SRE/PLATFORM

1. **T-2h**: Staff and publish DRI roster in #ship-room
2. **T-2h**: Select and publish canary region in #ship-room
3. **T-1h**: Security sign-off in #ship-room
4. **T-0**: Execute Phase 1 (5% traffic, 90 min observation)
5. **Each Gate**: Post gate report and await GO decision
6. **Post-100%**: Monitor for rest of day, then declare success

**Deployment Artifacts**: All tools and documentation in `/canary` directory  
**Questions/Escalation**: CEO for any step-ups beyond plan

---

**END OF EXECUTIVE DEPLOYMENT PLAN**

*Authorized*: CEO - October 8, 2025  
*Prepared by*: ScholarLink Engineering Team  
*Status*: ✅ Ready for Immediate Execution
