# A8 Data Lineage Report

**Date:** January 8, 2026  
**Protocol:** AGENT3_HANDSHAKE v27  
**Phase:** 4 - Monetization

---

## Revenue Lineage Requirements

Per AGENT3 specification, all revenue events must include:
- `provider_fee_pct`: 3%
- `ai_markup_factor`: 4.0x

---

## Current State

### A5 → A8 Telemetry Path

| Component | Status | Evidence |
|-----------|--------|----------|
| Telemetry Client | ✅ Active | "Protocol ONE_TRUTH v1.2" |
| Event Delivery | ✅ 100% | "9/9 events to A8 Command Center" |
| Flush Interval | 10s | Configuration |
| Batch Size | Max 100 | Configuration |

### Revenue Event Fields

| Field | Expected | Status |
|-------|----------|--------|
| revenue_event_id | UUID | NOT ASSESSED |
| provider_fee_pct | 3 | NOT ASSESSED |
| ai_markup_factor | 4.0 | NOT ASSESSED |
| stripe_payment_id | pi_xxx | Present in synthetic |
| amount_cents | Variable | Present in purchases |

---

## Lineage Flow Diagram

```
A5 (Student Pilot)
    │
    ├── payment_succeeded event
    │   ├── user_id
    │   ├── amount_cents
    │   ├── stripe_payment_intent_id
    │   ├── utm_source (if present)
    │   └── revenue_event_id
    │
    ▼
A8 (Command Center) /events
    │
    ├── Finance Tile
    │   ├── Total Revenue
    │   ├── Revenue by Source
    │   └── LTV Metrics
    │
    └── Lineage Verification
        ├── provider_fee_pct: 3%
        └── ai_markup_factor: 4.0x
```

---

## B2B Lineage (A6 → A8)

### Expected Flow
```
A6 (Provider Portal)
    │
    ├── provider_registered event
    │   ├── provider_id
    │   └── created_at
    │
    ├── billing_configured event
    │   ├── provider_fee_pct: 3
    │   └── ai_markup_factor: 4.0
    │
    ▼
A8 (Command Center) /events
    │
    └── Finance Tile
        ├── Provider Revenue
        ├── Fee Attribution (3%)
        └── AI Markup (4.0x)
```

### Status: NOT ASSESSED
- A6 endpoints not probed
- Lineage verification requires A6 transactions

---

## Verification Evidence

### Database Evidence
```
Source: tests/perf/reports/evidence/phase4_db_output.txt

-- Credit ledger shows purchase tracking
id,user_id,type,amount_millicredits,reference_type,reference_id
...,trial-test-user-DUTokS,purchase,50000,stripe,pi_synthetic_xxx
```

### Log Evidence
```
Source: tests/perf/reports/evidence/phase4_stripe_log.txt

🔒 Stripe LIVE initialized (rollout: 100%)
✅ Temporary credit API registered: /api/v1/credits/{credit,debit,balance,purchase}
```

---

## Items Not Assessed

1. **Revenue Event Emission**
   - No real Stripe transactions to verify
   - Synthetic purchases don't emit full lineage

2. **provider_fee_pct Calculation**
   - Requires A6 transaction
   - Expected: 3% of transaction value

3. **ai_markup_factor Application**
   - Requires AI usage billing
   - Expected: 4.0x multiplier on AI costs

4. **A8 Finance Tile Accuracy**
   - Requires Command Center access
   - Manual verification needed

---

## Recommendations

1. **Execute Real Checkout** (HITL required)
   - Trigger Stripe test-mode checkout
   - Verify revenue event includes lineage fields

2. **Probe A6 Endpoints**
   - `/register` and `/api/billing`
   - Verify 3% + 4.0x parameters

3. **Verify A8 Finance Tile**
   - Manual inspection of Command Center
   - Confirm lineage calculations match

---

## Status

| Lineage Path | Verified | Notes |
|--------------|----------|-------|
| A5 → A8 Telemetry | ✅ | 100% event delivery |
| A5 → A8 Revenue | ⏳ | Pending real transaction |
| A6 → A8 Provider | ⏳ | External dependency |
| Lineage 3% + 4x | ⏳ | Not assessed |

**Overall Status:** PARTIAL PASS

Full lineage verification requires real transactions and A6 probe.
