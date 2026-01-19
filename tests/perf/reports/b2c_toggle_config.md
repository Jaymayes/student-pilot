# B2C Toggle Configuration

**Soak ID:** SOAK-049  
**Generated:** 2026-01-19T04:02:00.000Z

## Current Status

| Config | Value | Status |
|--------|-------|--------|
| SAFETY_LOCK_ACTIVE | **true** | ✓ Enforced |
| B2C_MICRO_CHARGE_ENABLED | **false** | Awaiting soak PASS |

## Toggle Preparation

### Environment Variable

```bash
# To enable after soak PASS (CEO authorization required):
B2C_MICRO_CHARGE_ENABLED=true
```

### Code Guard (server/routes/billing.ts)

```typescript
const B2C_ENABLED = process.env.B2C_MICRO_CHARGE_ENABLED === 'true';
const SAFETY_LOCK = !fs.existsSync('tests/perf/reports/hitl_approvals.log') || 
                    !fs.readFileSync('tests/perf/reports/hitl_approvals.log', 'utf8')
                      .includes('[CEO] [APPROVE] MICRO_CHARGE');

if (!B2C_ENABLED || SAFETY_LOCK) {
  return res.status(403).json({ error: 'SAFETY_LOCK_ACTIVE' });
}
```

## Pilot Parameters

| Parameter | Value |
|-----------|-------|
| Cohort | First 100 US users |
| Price | $1 verification micro-purchase |
| Per-user cap | $5 |
| Global cap | $250 |
| Visitor→Signup | ≥3% |
| Signup→Paid | ≥5% |
| Cohort ARPU | ≥$0.35 |
| Refunds/chargebacks | ≤2% |
| Purchase P95 | ≤150ms |

## Rollback Triggers

Auto-pause pilot if any of:
- Chargeback >2%
- Fraud flags >1%
- Purchase P95 >170ms for 10min

## Activation Sequence

1. ✅ Soak T+0 baseline captured
2. ⏳ Soak T+12h snapshot (scheduled)
3. ⏳ Soak T+24h final report (scheduled)
4. ⏳ CEO authorization after soak PASS
5. ⏳ Set B2C_MICRO_CHARGE_ENABLED=true
6. ⏳ Remove SAFETY_LOCK (CEO override in hitl_approvals.log)
7. ⏳ Commence micro-charge pilot
