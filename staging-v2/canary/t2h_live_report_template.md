# Phase 2 T+2h LIVE Report

**Run ID:** CEOSPRINT-20260114-CANARY-P2-LIVE-T2H  
**Phase:** 25% Traffic  
**Stripe Mode:** LIVE  
**Report Time:** [TIMESTAMP]

---

## SLO Snapshot (10-min Rolling)

| Service | P95 (ms) | Error Rate | Samples | Status |
|---------|----------|------------|---------|--------|
| A2 | [VALUE] | [VALUE] | [VALUE] | [PASS/WARN] |
| A6 | [VALUE] | [VALUE] | [VALUE] | [PASS/WARN] |
| V2 Aggregate | [VALUE] | [VALUE] | [VALUE] | [PASS/WARN] |

**Phase 3 Target:** P95 ≤110ms (tightened)

---

## Error Histogram

| Status Code | Count | % of Total |
|-------------|-------|------------|
| 200 | [VALUE] | [VALUE]% |
| 201 | [VALUE] | [VALUE]% |
| 400 | [VALUE] | [VALUE]% |
| 401 | [VALUE] | [VALUE]% |
| 500 | [VALUE] | [VALUE]% |

---

## First Upload Parity

| Metric | Current | Baseline (7d) | Delta | Status |
|--------|---------|---------------|-------|--------|
| signup→first_upload | [VALUE]% | [VALUE]% | [±X]% | [PASS if ±5%] |
| first_upload→credit_purchase | [VALUE]% | [VALUE]% | [±X]% | [PASS if ±5%] |

---

## Verifier KPIs

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Pass Rate | [VALUE]% | >95% | [PASS/WARN] |
| Self-Correction Rate | [VALUE]% | - | - |
| False Positive Rate | [VALUE]% | <1% | [PASS/WARN] |

---

## Stripe Metrics (LIVE)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Auth Success Rate | [VALUE]% | ≥98% | [PASS/WARN] |
| Settlement Success Rate | [VALUE]% | ≥98% | [PASS/WARN] |
| Refund Latency | [VALUE]s | <300s | [PASS/WARN] |
| Chargebacks | [VALUE] | 0 | [PASS/FAIL] |
| Disputes | [VALUE] | 0 | [PASS/WARN] |
| Fraud Signals | [VALUE]% | <1% | [PASS/WARN] |

---

## Cost Tracking

| Metric | Value | Limit | Status |
|--------|-------|-------|--------|
| Current Spend | $[VALUE] | $300 | [OK/ALERT] |
| Velocity | $[VALUE]/hr | - | - |
| Projected 24h | $[VALUE] | $300 | [OK/ALERT] |

---

## Incident Summary

| Severity | Count | MTTR | Limit | Status |
|----------|-------|------|-------|--------|
| Sev-1 | [VALUE] | N/A | 0 | [PASS/FAIL] |
| Sev-2 | [VALUE] | [VALUE]m | ≤1, <30m | [PASS/FAIL] |

---

## Executive KPIs

### B2C Metrics

| Metric | Value |
|--------|-------|
| ARPU (credits) | $[VALUE] |
| Visitor→Signup | [VALUE]% |
| Signup→First Upload | [VALUE]% |
| First Upload→Paid | [VALUE]% |
| Refund Rate | [VALUE]% |

### B2B Metrics

| Metric | Value |
|--------|-------|
| Provider Fee Accrual | $[VALUE] |
| Fee Rate | 3% |
| Active Providers | [VALUE] |

### Unit Economics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Gross Margin (AI) | [VALUE]% | ≥60% | [PASS/WARN] |
| LTV:CAC Ratio | [VALUE]:1 | >3:1 | [PASS/WARN] |
| CAC | $[VALUE] | ~$0 (organic) | [PASS/WARN] |

---

## Phase 3 Gate Status

| Flag | Required | Current |
|------|----------|---------|
| PHASE2_STABLE_12H | 1 | [0/1] |
| SLO_OK (P95 ≤110ms) | 1 | [0/1] |
| STRIPE_OK (≥98.5%) | 1 | [0/1] |
| BUSINESS_PARITY_OK | 1 | [0/1] |
| PRIVACY_SECURITY_OK | 1 | [0/1] |

**Phase 3 Token:** HITL-CEO-20260114-CANARY-PH3  
**Status:** [READY/BLOCKED]

---

## Next Checkpoints

| Checkpoint | ETA |
|------------|-----|
| T+6h | [TIMESTAMP] |
| T+12h | [TIMESTAMP] |
