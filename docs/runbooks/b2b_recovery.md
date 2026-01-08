# B2B Recovery Runbook

**Last Updated:** January 8, 2026  
**Protocol:** AGENT3_HANDSHAKE v27  
**Funnel:** A7 → A6 → A8

---

## Quick Reference

| Symptom | Likely Cause | Runbook Section |
|---------|--------------|-----------------|
| Provider registration fails | A6 endpoint issue | Section 1 |
| Finance lineage missing | A8 tile wiring | Section 2 |
| Revenue not attributed | Lineage calculation | Section 3 |

---

## Section 1: Provider Registration (A6)

### Expected Flow
1. Provider lands on A7 (Auto Page Maker)
2. Redirects to A6 (Provider Portal) for registration
3. A6 registers provider and triggers billing setup
4. Events flow to A8 for finance tracking

### Endpoints
- A6 Registration: `/register`
- A6 Billing: `/api/billing`

### Expected Lineage Parameters
```json
{
  "provider_fee_pct": 3,
  "ai_markup_factor": 4.0
}
```

### Diagnosis
```bash
# Probe A6 health (if available)
curl https://provider-portal-jamarrlmayes.replit.app/api/health

# Check A8 for finance events
# (Manual verification in Command Center UI)
```

---

## Section 2: A8 Finance Tile Wiring

### Expected Behavior
- A6 transactions visible in A8 Finance tile
- Revenue lineage shows 3% provider fee
- AI markup factor of 4.0x applied

### Known Issues
- A8-001: Tile wiring incomplete
- A8-PERF-001: Dashboard latency ~314ms

### Verification
1. Log into A8 Command Center
2. Navigate to Finance tile
3. Verify A6 transactions appear
4. Confirm lineage calculations match expected values

---

## Section 3: Revenue Attribution

### Formula
```
Net Revenue = Gross Revenue - (Gross Revenue * 0.03)
AI Revenue = Base AI Cost * 4.0
```

### Where to Verify
- A6 logs: Transaction creation
- A8 Finance tile: Aggregated revenue
- A8 lineage endpoint: Detailed breakdown

---

## Items Not Assessed

Due to external app dependency, the following require A6 team coordination:

1. A6 /register endpoint probe
2. A6 /api/billing endpoint probe
3. Finance lineage 3% + 4x verification
4. Provider listing creation flow
5. A8 finance tile data accuracy

---

## Escalation Path

1. **L1:** A7 team for landing page issues
2. **L2:** A6 team for provider portal
3. **L3:** A8 team for finance tile wiring
4. **HITL:** Any production data changes

---

## Related Documents

- tests/perf/reports/b2b_funnel_results.json
- tests/perf/reports/a8_baseline_load.md
