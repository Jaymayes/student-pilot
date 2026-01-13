# Canary Rollout Plan

**Run ID:** CEOSPRINT-20260114-CANARY  
**Token:** HITL-CEO-20260114-CANARY-V2  
**Status:** PENDING TOKEN CONSUMPTION

---

## Consumption Conditions

| Flag | Required | Current |
|------|----------|---------|
| SHADOW_PASS_24H | 1 | PENDING |
| A2_V26_COMPLIANT | 1 | PENDING |
| EVIDENCE_BUNDLE | 1 | PENDING |

**All flags must be 1 to consume token. If any flag is 0, HOLD.**

---

## Ramp Schedule

### Phase 1: 5% Traffic (6 hours)

| Metric | Target | Monitoring |
|--------|--------|------------|
| P95 Latency | ≤120ms | Continuous |
| Error Rate | ≤0.5% | Continuous |
| Incidents | 0 Sev-1 | Alert on breach |

**Promotion Gate:** P95 ≤120ms AND error ≤0.5% for 6h

### Phase 2: 25% Traffic (12 hours)

| Metric | Target | Additional |
|--------|--------|------------|
| P95 Latency | ≤120ms | - |
| Error Rate | ≤0.5% | - |
| Stripe Mode | LIVE | CFO sign-off required |

**Promotion Gate:** P95 ≤120ms AND error ≤0.5% for 12h

### Phase 3: 50% Traffic (12 hours)

| Metric | Target | Notes |
|--------|--------|-------|
| P95 Latency | ≤120ms | Monitor closely |
| Error Rate | ≤0.5% | No degradation |
| Revenue | Active | Track B2C + B2B |

**Promotion Gate:** P95 ≤120ms AND error ≤0.5% for 12h

### Phase 4: 100% Traffic (Full Cutover)

| Requirement | Status |
|-------------|--------|
| CEO Approval | Required |
| All SLO Gates | Passed |
| Incident Count | ≤1 Sev-2, 0 Sev-1 |

---

## Auto-Rollback Triggers

| Trigger | Action |
|---------|--------|
| Any Sev-1 incident | Immediate rollback to V1 |
| SLO breach ≥30 minutes | Immediate rollback to V1 |
| 2+ Sev-2 incidents | Hold, CEO decision |

**Time to Restore:** <5 minutes

---

## Cost Controls

| Phase | Budget | Approval |
|-------|--------|----------|
| Shadow | $50 | Pre-approved |
| Canary | $300 | Standard |
| Canary | >$300 | CFO co-sign |

---

## Payment Mode Transitions

| Phase | Traffic | Stripe | Authorization |
|-------|---------|--------|---------------|
| Shadow | 0% | N/A | Pre-approved |
| Canary 1 | 5% | TEST | Auto |
| Canary 2 | 25% | LIVE | CFO sign-off |
| Canary 3+ | 50-100% | LIVE | Continuous |

---

## Monitoring Dashboards

| Dashboard | Metrics | Alert Threshold |
|-----------|---------|-----------------|
| A8 Command Center | All events | - |
| SLO Monitor | P95, error rate | >120ms, >0.5% |
| Revenue Tracker | B2C credits, B2B fees | Anomaly detection |
| Privacy Log | DoNotSell, PII | Any violation |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Canary Duration | 30h (6+12+12) |
| Incidents | ≤1 Sev-2, 0 Sev-1 |
| SLO Adherence | 100% |
| Revenue | Positive signal |

---

## Golden Re-Freeze

Upon successful Full Cutover:

1. Generate new baseline hashes
2. Tag: `ZT3G_GOLDEN_20260114_039`
3. POST + GET checksum round-trip to A8
4. Restore FREEZE_LOCK=1
5. Update drift baseline
