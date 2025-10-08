# Canary Phase Gate Report Template

Use this template for posting gate reports in #ship-room at each phase transition.

---

## 🚦 CANARY PHASE [X] GATE REPORT

**Date/Time**: [YYYY-MM-DD HH:MM UTC]  
**Phase**: [1/2/3/4] - [5%/25%/50%/100%]  
**Observation Window**: [90min/2h/4h/rest-of-day] completed  
**Canary Region**: [US-REGION]  
**Incident Commander**: [NAME]

---

### 📊 PLATFORM SLOs

| Metric | Actual | Target | Status |
|--------|--------|--------|--------|
| Availability | [X.X]% | 99.9% | ✅/❌ |
| P50 Latency | [X]ms | - | ✅/❌ |
| P95 Latency | [X]ms | ≤130ms | ✅/❌ |
| P99 Latency | [X]ms | - | ✅/❌ |
| 5xx Rate | [X.XX]% | ≤0.5% | ✅/❌ |
| Client Error Rate | [X.XX]% | Baseline +0.2% | ✅/❌ |
| Error Budget Burn | [X]% | <10% | ✅/❌ |

**Notes**: [Any latency spikes, error patterns, or SLO violations]

---

### 💳 PAYMENTS

| Metric | Actual | Target/Cap | Status |
|--------|--------|------------|--------|
| Total Transactions | [X] | 100 (Phase 1) | ✅/❌ |
| Transaction Volume | $[X] | $1,500 (Phase 1) | ✅/❌ |
| Success Rate (Auth/Capture) | [X.X]% | ≥98.5% | ✅/❌ |
| Charge Error Rate | [X.X]% | ≤1.0% | ✅/❌ |
| Decline Rate | [X.X]% | Baseline | ✅/❌ |
| Refund Rate | [X.X]% | Baseline | ✅/❌ |
| Consecutive Failures | [X] | <5 | ✅/❌ |

**Notes**: [Any payment anomalies, processor issues, or fraud alerts]

---

### 👥 B2C FUNNEL (Student)

| Metric | Canary | Control | Delta | Status |
|--------|--------|---------|-------|--------|
| Sign-up Completion | [X.X]% | [Y.Y]% | [±Z.Z]% | ✅/❌ |
| First Session Completion | [X.X]% | [Y.Y]% | [±Z.Z]% | ✅/❌ |
| First Match Time (TTV) | [X]s | [Y]s | [±Z]s | ✅/❌ |
| First Application Start | [X.X]% | [Y.Y]% | [±Z.Z]% | ✅/❌ |
| Paid Conversion Rate | [X.X]% | [Y.Y]% | [±Z.Z]% | ✅/❌ |
| ARPU (Credit Sales) | $[X] | $[Y] | $[±Z] | ✅/❌ |

**Notes**: [Any funnel drop-offs, conversion issues, or user experience degradation]

---

### 🏢 B2B FUNNEL (Provider)

| Metric | Canary | Control | Delta | Status |
|--------|--------|---------|-------|--------|
| Error Rate | [X.X]% | - | - | ✅/❌ (≤1%) |
| Time-to-First-Interaction | [X]s | [Y]s | [±Z]% | ✅/❌ (±5%) |
| Active Sessions | [X] | [Y] | [±Z]% | ✅/❌ |
| Listing Edits | [X] | [Y] | [±Z]% | ✅/❌ |
| Payout Events | [X] | [Y] | [±Z]% | ✅/❌ |

**Notes**: [Any provider dashboard issues or B2B workflow problems]

---

### 📈 CAC/SEO METRICS

| Metric | Actual | Baseline | Status |
|--------|--------|----------|--------|
| Auto Page Maker Traffic | [X] | [Y] | ✅/❌ |
| SERP CTR | [X.X]% | [Y.Y]% | ✅/❌ |
| Index Coverage | [X]% | [Y]% | ✅/❌ |
| Organic Signup Rate | [X.X]% | [Y.Y]% | ✅/❌ |

**Notes**: [Any SEO regressions or indexing issues]

---

### 🔍 SYNTHETIC MONITOR

| Check Suite | Success | Failures | Status |
|-------------|---------|----------|--------|
| Health Checks | [X]/[Y] | [Z] | ✅/❌ |
| B2C Happy Path | [X]/[Y] | [Z] | ✅/❌ |
| Provider Dashboard | [X]/[Y] | [Z] | ✅/❌ |
| Payments Smoke | [X]/[Y] | [Z] | ✅/❌ |
| Schema Validation | [X]/[Y] | [Z] | ✅/❌ |

**Notes**: [Any synthetic monitor failures or schema validation issues]

---

### 🔒 SECURITY & COMPLIANCE

| Check | Status | Notes |
|-------|--------|-------|
| PII in Logs | ✅/❌ | [Details] |
| FERPA/COPPA Compliance | ✅/❌ | [Details] |
| Security Anomalies (WAF) | ✅/❌ | [Details] |
| Abnormal Auth Failures | ✅/❌ | [Details] |
| Data Integrity | ✅/❌ | [Details] |

**Notes**: [Any security incidents, compliance violations, or data issues]

---

### 🚨 ROLLBACK TRIGGERS

| Trigger | Occurrences | Threshold | Status |
|---------|-------------|-----------|--------|
| P95 >160ms (5 min) | [X] | 1 | ✅/❌ |
| P99 >350ms (5 min) | [X] | 1 | ✅/❌ |
| 5xx >1.0% (5 min) | [X] | 1 | ✅/❌ |
| Synthetic Failures ≥3 consecutive | [X] | 1 | ✅/❌ |
| Payment Failures ≥2.0% (5 min) | [X] | 1 | ✅/❌ |
| Payment Failures >5 consecutive | [X] | 1 | ✅/❌ |
| Analytics Anomaly >3σ | [X] | 1 | ✅/❌ |

**Notes**: [Any near-misses or trending issues to watch]

---

### 📋 GATE DECISION

**Overall Status**: ✅ ALL GREEN / ⚠️ PARTIAL / ❌ RED

**Go Gates Summary**:
- [ ] Platform SLOs met
- [ ] Payments healthy
- [ ] B2C funnel stable
- [ ] B2B dashboard functional
- [ ] No rollback triggers fired
- [ ] **[Phase 3→4 ONLY]** P95 ≤120ms for full window

**Recommendation**: 
- [ ] **GO** - Advance to Phase [X+1]
- [ ] **NO-GO** - Hold at current phase for investigation
- [ ] **ROLLBACK** - Revert to stable version

**Rationale**: [Brief explanation of decision]

---

### 👥 APPROVALS

- [ ] **Incident Commander**: [NAME] - [APPROVE/HOLD/ROLLBACK]
- [ ] **Release Engineering**: [NAME] - [APPROVE/HOLD/ROLLBACK]
- [ ] **Product (B2C)**: [NAME] - [APPROVE/HOLD/ROLLBACK]
- [ ] **Product (B2B)**: [NAME] - [APPROVE/HOLD/ROLLBACK]
- [ ] **Security/Compliance**: [NAME] - [APPROVE/HOLD/ROLLBACK]
- [ ] **Data/Observability**: [NAME] - [APPROVE/HOLD/ROLLBACK]
- [ ] **[If needed] CEO**: [NAME] - [APPROVE/HOLD/ROLLBACK]

---

### 📝 NEXT STEPS

**If GO**:
1. Route traffic to [X%] (Phase [X+1])
2. Begin observation window: [duration]
3. Next gate report due: [TIME]

**If NO-GO**:
1. Hold traffic at [current%]
2. Investigate: [specific issues]
3. Re-evaluate in: [timeframe]

**If ROLLBACK**:
1. Execute rollback procedure immediately
2. Capture logs/metrics/traces
3. Schedule postmortem: [TIME]
4. Fix-forward plan due: T+48h

---

### 🔗 LINKS

- **Dashboard**: [Datadog/Grafana link]
- **Synthetic Monitor**: [Link to monitor output]
- **Error Logs**: [Link to log aggregator]
- **Metrics**: [Link to metrics endpoint]
- **Incident Channel**: #ship-room

---

**Report Submitted by**: [NAME]  
**Timestamp**: [YYYY-MM-DD HH:MM:SS UTC]
