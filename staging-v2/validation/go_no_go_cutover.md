# GO/NO-GO Cutover Plan (V2)

**RUN_ID:** CEOSPRINT-20260114-CUTOVER-V2-038  
**Status:** PENDING CEO HITL APPROVAL  
**Production:** FREEZE_LOCK=1 (ACTIVE)

---

## Pre-Cutover Checklist

| # | Item | Status |
|---|------|--------|
| 1 | V2 services deployed to staging | PENDING |
| 2 | Functional deep-dive passed | READY (code complete) |
| 3 | P95 ≤120ms validated | PENDING DEPLOY |
| 4 | Privacy middleware tested | READY |
| 5 | Circuit breakers configured | READY |
| 6 | A8 evidence bundle posted | PENDING |
| 7 | Shadow mode 24h complete | NOT STARTED |
| 8 | CEO HITL approval logged | NOT RECORDED |

---

## Cutover Strategy

### Phase 1: Shadow Mode (24 hours)

1. Deploy V2 services to staging workspaces
2. Configure routing to shadow-copy traffic:
   - A1/A5 continue serving production
   - V2 services receive duplicate reads (no writes)
3. Post shadow events to A8 with `shadow=true`
4. Compare metrics:
   - Response times (V2 vs V1)
   - Error rates
   - Conversion tracking

### Phase 2: Gradual Rollout

1. **CEO HITL Required:** Log approval in `hitl_approvals.log`
2. Route 10% of traffic to V2
3. Monitor for 2 hours:
   - P95 latency
   - Error rates
   - Upload conversion
4. If stable, increase to 50%, then 100%

### Phase 3: Re-Freeze

1. Update drift baselines with V2 hashes
2. Regenerate Golden Record bundle
3. POST + GET checksum round-trip to A8
4. Restore FREEZE_LOCK=1

---

## Backout Plan

**Time to Restore:** <5 minutes

1. Revert routing to V1 endpoints (A1/A5 legacy)
2. Disable V2 services
3. Verify production health
4. Post incident report to A8

---

## Impact Projections

| Metric | V1 Current | V2 Expected | Change |
|--------|------------|-------------|--------|
| Onboarding Time | 3 screens | 1 screen + upload | -66% |
| Activation Rate | ~15% | ~35% (projected) | +133% |
| Upload Conversion | N/A | 25% (target) | New |
| P95 Latency | 98ms | <100ms | Stable |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss | Low | High | No writes in shadow mode |
| Latency regression | Medium | Medium | Circuit breakers + backoff |
| Privacy violation | Low | High | Age-gate middleware tested |
| Service cascade | Low | High | Circuit breakers active |

---

## Required Approvals

| Role | Name | Approval |
|------|------|----------|
| CEO | - | PENDING |
| Tech Lead | Agent | PENDING REVIEW |

---

## Next Steps

1. Deploy V2 services to staging Replit workspaces
2. Run live SLO validation (10-minute P95)
3. Execute 24-hour shadow mode
4. Present results to CEO for HITL approval
5. Execute cutover with monitoring

---

**Attestation:** PENDING CEO DECISION

Cutover plan ready. Awaiting staging deployment validation and explicit CEO HITL approval before execution.
