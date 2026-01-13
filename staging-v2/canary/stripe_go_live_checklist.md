# Stripe Go-Live Checklist (Phase 2)

**CFO Token:** CFO-20260114-STRIPE-LIVE-25  
**Conditions Required:** CANARY_PHASE=2, TRAFFIC_WEIGHT=0.25, SLO_OK=1, INCIDENTS_OK=1, REVENUE_GUARDS_OK=1

---

## Pre-Switch Verification

| # | Check | Target | Status |
|---|-------|--------|--------|
| 1 | Dry-run success rate (last 30 min) | ≥99.0% | PENDING |
| 2 | Revenue guardrails configured | All 4 limits set | PENDING |
| 3 | Auto-refund workflow enabled | true | PENDING |
| 4 | Webhook retry with backoff | Verified | PENDING |

---

## Sanity Charges (Company Card)

Execute in order on company card:

| # | Amount | Action | Webhook Expected | Status |
|---|--------|--------|------------------|--------|
| 1 | $1.00 | Charge | payment_intent.succeeded | PENDING |
| 2 | $5.00 | Charge | payment_intent.succeeded | PENDING |
| 3 | $10.00 | Charge | payment_intent.succeeded | PENDING |
| 4 | $5.00 | Refund (within 10 min) | charge.refunded | PENDING |

### Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| payment_intent.succeeded count | 3 | PENDING | PENDING |
| charge.refunded count | 1 | PENDING | PENDING |
| Revenue log total | $11.00 net | PENDING | PENDING |
| Ledger balance | $11.00 | PENDING | PENDING |

---

## Token Consumption

```
Token: CFO-20260114-STRIPE-LIVE-25
Consumed At: [TIMESTAMP]
Consumed By: Agent
Conditions Met:
  - CANARY_PHASE=2: [Y/N]
  - TRAFFIC_WEIGHT=0.25: [Y/N]
  - SLO_OK=1: [Y/N]
  - INCIDENTS_OK=1: [Y/N]
  - REVENUE_GUARDS_OK=1: [Y/N]
```

---

## Post-Switch Monitoring

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Auth success rate | ≥98% | <98% for 30min |
| Settlement rate | ≥98% | <98% for 30min |
| Refund latency | <5 min | >10 min |
| Chargebacks | 0 | >0 |
| Fraud signals | <1% | ≥1% |

---

## Rollback Triggers

| Trigger | Action |
|---------|--------|
| Stripe success rate <98% for 30+ min | Auto-rollback to TEST |
| Fraud signals >1% of attempts | Auto-rollback + security review |
| Chargeback received | Investigate + CEO alert |
| Any Sev-1 | Auto-rollback to 0% |

---

## Evidence to Log

- [ ] Token consumption logged to A8
- [ ] Sanity charge receipts captured
- [ ] Refund confirmation captured
- [ ] Webhook event IDs recorded
- [ ] Revenue log snapshot attached
