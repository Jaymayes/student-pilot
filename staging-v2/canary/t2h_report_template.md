# Canary Phase 1 T+2h Interim Report

**Run ID:** CEOSPRINT-20260114-CANARY-P1-T2H  
**Phase:** 5% Traffic  
**Report Time:** [TIMESTAMP]

---

## SLO Metrics (10-min Rolling)

| Service | P95 (ms) | Error Rate | Samples | Status |
|---------|----------|------------|---------|--------|
| A2 | [VALUE] | [VALUE] | [VALUE] | [PASS/WARN] |
| A6 | [VALUE] | [VALUE] | [VALUE] | [PASS/WARN] |
| V2 Aggregate | [VALUE] | [VALUE] | [VALUE] | [PASS/WARN] |

**SLO Target:** P95 ≤120ms, Error Rate ≤0.5%

---

## First Upload Parity

| Metric | Value | Status |
|--------|-------|--------|
| Parity Rate | [VALUE]% | [PASS if ≥99.5%] |
| Baseline (7d) | [VALUE]% | - |
| Delta | [VALUE]% | [PASS if ±5%] |

### Anonymized Trace Samples (5)

| Trace ID | DocumentHub | Orchestrator | DataService | Complete |
|----------|-------------|--------------|-------------|----------|
| [HASH_1] | [LAT]ms | [LAT]ms | [LAT]ms | [Y/N] |
| [HASH_2] | [LAT]ms | [LAT]ms | [LAT]ms | [Y/N] |
| [HASH_3] | [LAT]ms | [LAT]ms | [LAT]ms | [Y/N] |
| [HASH_4] | [LAT]ms | [LAT]ms | [LAT]ms | [Y/N] |
| [HASH_5] | [LAT]ms | [LAT]ms | [LAT]ms | [Y/N] |

---

## Verifier KPIs

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Pass Rate | [VALUE]% | >95% | [PASS/WARN] |
| Self-Correction Rate | [VALUE]% | - | - |
| False Positive Rate | [VALUE]% | <1% | [PASS/WARN] |

---

## Cost Tracking

| Metric | Value | Limit | Status |
|--------|-------|-------|--------|
| Current Spend | $[VALUE] | $300 | [OK/ALERT] |
| Velocity | $[VALUE]/hr | - | - |
| Projected 24h | $[VALUE] | $300 | [OK/ALERT] |

**Alert Threshold:** $240

---

## Incident Summary

| Severity | Count | MTTR | Limit | Status |
|----------|-------|------|-------|--------|
| Sev-1 | [VALUE] | N/A | 0 | [PASS/FAIL] |
| Sev-2 | [VALUE] | [VALUE]m | ≤1, <30m | [PASS/FAIL] |

---

## Circuit Breaker State

| Service | Current State | History |
|---------|---------------|---------|
| DataService | [STATE] | [CLOSED→...] |
| DocumentHub | [STATE] | [CLOSED→...] |
| Orchestrator | [STATE] | [CLOSED→...] |

---

## Pre-Warm/Scale Status

| Service | Warm Instances | Idle P95 | Target | Action |
|---------|----------------|----------|--------|--------|
| Orchestrator | [VALUE] | [VALUE]ms | ≤90ms | [NONE/SCALE] |
| DocumentHub | [VALUE] | [VALUE]ms | ≤90ms | [NONE/SCALE] |

---

## Assessment

**Promotion Readiness:** [READY/NOT READY]

**Blockers:**
- [List any blockers]

**Recommendation:**
- [Continue / Hold / Rollback]

---

## Next Checkpoint

**T+6h Report Due:** [TIMESTAMP]
