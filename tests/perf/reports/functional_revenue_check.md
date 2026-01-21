# Gate-6 Functional Revenue Check

**Run ID**: CEOSPRINT-20260121-EXEC-ZT3G-GATE6-GO-LIVE-052  
**Timestamp**: 2026-01-21T07:55:00Z

## B2B Provider Dashboard

| Check | Result |
|-------|--------|
| Response Time | 146ms |
| Endpoint | /api/providers (returns JSON) |
| SLA (<300ms) | ✅ PASSED |

## B2B Ledger Summary

| Entry Type | Status | Count | Total (cents) |
|------------|--------|-------|---------------|
| platform_fee | pending | 4 | 100,600 |
| platform_fee | posted | 1 | 10,000 |
| refund | posted | 1 | -50 |
| adjustment | posted | 1 | 50 |
| reconciliation | posted | 3 | 0 |

**Net B2B Position**: $1,106.00 pending, $100.50 posted

## B2C Credit Ledger Summary

| Type | Reference | Count | Millicredits |
|------|-----------|-------|--------------|
| purchase | stripe | 81 | 4,050,000 |
| refund | system | 2 | 100,000 |
| adjustment | system | 1 | 5,000 |

## Live Purchase Validation (Penny Test Evidence)

The Gate-5 penny test served as the live purchase validation:

### 3-of-3 Evidence Chain

| Evidence | Artifact | Verified |
|----------|----------|----------|
| HTTP Receipt | Payment Intent pi_3SruqtP9xKeb000R1FFZr1B1 | ✅ |
| X-Trace-Id | CEOSPRINT-20260121-EXEC-ZT3G-G5-PENNY-048.stripe.charge | ✅ |
| Stripe Ledger | $0.50 charged, $0.50 refunded | ✅ |
| A8 Artifact | gate5_preflight event accepted (200) | ✅ |

### Transaction Details

```
Session: cs_live_a1fc8m67Rb0AttvJ3S1XWX4AYs2MOsB2ZZ8hKpb1bZ5R4FxBQWYvhBrpFm
Payment Intent: pi_3SruqtP9xKeb000R1FFZr1B1
Charge: py_3SruqtP9xKeb000R1t4Hd1yP
Amount: $0.50
Status: succeeded → refunded
Refund: pyr_1SrurdP9xKeb000RoF0AK2gF
```

### Ledger Posting Verified

| Ledger | Entry | Amount | Status |
|--------|-------|--------|--------|
| overnight_protocols_ledger | adjustment (charge) | +50¢ | posted |
| overnight_protocols_ledger | refund | -50¢ | posted |
| **Net** | | **$0.00** | **balanced** |

## Stripe 24h Summary

- Total Charged: $0.50
- Total Refunded: $0.50
- Net Revenue: $0.00

## Functional Check Verdict

- [x] B2B Dashboard responds in <300ms
- [x] B2B Ledger entries posting correctly
- [x] B2C Credit ledger operational
- [x] Live purchase path validated (penny test)
- [x] Ledger posting confirmed
- [x] 3-of-3 evidence chain complete

**Phase 4 Status**: ✅ PASSED
