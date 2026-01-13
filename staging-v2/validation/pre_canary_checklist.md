# Pre-Canary Operational Checklist

**Run ID:** CEOSPRINT-20260114-PRECANARY  
**Status:** PENDING  
**Canary Token:** HITL-CEO-20260114-CANARY-V2

---

## Required Before Canary

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | Key rotation dry-run | PENDING | Zero traffic without keys confirmed |
| 2 | Top 5 slowest endpoints | PENDING | Profiles + proposed fixes |
| 3 | Verifier QA | PENDING | Pass/fail rates, false-positive <1% |
| 4 | Synthetic journeys | PENDING | 10 B2C + 10 B2B logged to A8 |

---

## 1. Key Rotation Dry-Run

**Objective:** Confirm zero traffic accepted without valid API keys

| Service | Endpoint | Without Key | With Key | Status |
|---------|----------|-------------|----------|--------|
| DataService | /student/signup | 401 | 201 | PENDING |
| DataService | /provider/onboard | 401 | 201 | PENDING |
| DocumentHub | /upload | 401 | 201 | PENDING |
| DocumentHub | /webhooks/test | 401 | 200 | PENDING |

**Result:** PENDING

---

## 2. Top 5 Slowest Endpoints

| Rank | Endpoint | P95 (ms) | Issue | Proposed Fix |
|------|----------|----------|-------|--------------|
| 1 | PENDING | - | - | - |
| 2 | PENDING | - | - | - |
| 3 | PENDING | - | - | - |
| 4 | PENDING | - | - | - |
| 5 | PENDING | - | - | - |

---

## 3. Verifier QA

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Pass Rate | >95% | PENDING | - |
| Fail Rate | <5% | PENDING | - |
| False Positive | <1% | PENDING | - |
| Self-Correction Loops | Logged | PENDING | - |

---

## 4. Synthetic Journeys

| Journey Type | Runs | Success | Failure | A8 Logged |
|--------------|------|---------|---------|-----------|
| B2C First Upload | 10 | PENDING | PENDING | PENDING |
| B2B Provider Onboard | 10 | PENDING | PENDING | PENDING |

---

## Canary Rollout Plan

### Ramp Schedule

| Phase | Traffic | Duration | SLO Gate |
|-------|---------|----------|----------|
| 1 | 5% | 6h | P95 ≤120ms, error ≤0.5% |
| 2 | 25% | 12h | P95 ≤120ms, error ≤0.5% |
| 3 | 50% | 12h | P95 ≤120ms, error ≤0.5% |
| 4 | 100% | Full Cutover | CEO approval |

### Incident Limits

| Severity | Limit | Action |
|----------|-------|--------|
| Sev-1 | 0 | Auto-rollback |
| Sev-2 | ≤1 | Hold, investigate |
| SLO Breach | <30 min | Continue |
| SLO Breach | ≥30 min | Auto-rollback |

### Cost Caps

| Phase | Cap | CFO Required |
|-------|-----|--------------|
| Shadow | $50 | No |
| Canary | $300 | If exceeded |

### Payment Mode

| Traffic Level | Stripe Mode | Approval |
|---------------|-------------|----------|
| <25% | TEST | None |
| ≥25% | LIVE | CFO sign-off |

---

## Gate Evaluation (T+24h)

| Flag | Required | Status |
|------|----------|--------|
| SHADOW_PASS_24H | 1 | PENDING |
| A2_V26_COMPLIANT | 1 | PENDING |
| EVIDENCE_BUNDLE | 1 | PENDING |

**Canary Authorization:** BLOCKED until all flags = 1

---

## Golden Re-Freeze Tag (Post-Cutover)

If Canary completes and Full Cutover succeeds:

**Tag:** `ZT3G_GOLDEN_20260114_039`
