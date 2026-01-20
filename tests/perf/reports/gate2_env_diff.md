# Gate-2 Environment Diff Report

**RUN_ID:** CEOSPRINT-20260120-EXEC-ZT3G-GATE2-029
**HITL_ID:** HITL-CEO-20260120-OPEN-TRAFFIC-G2
**Timestamp:** 2026-01-20T16:40:38.000Z

---

## Configuration Changes

| Parameter | Gate-1 Value | Gate-2 Value |
|-----------|--------------|--------------|
| TRAFFIC_CAP_B2C_PILOT | 10 | 25 |
| pilot_traffic_pct | 10 | 25 |
| gate1_status | IN_PROGRESS | COMPLETE |
| gate2_status | N/A | IN_PROGRESS |

---

## Finance Controls (UNCHANGED - FREEZE ACTIVE)

| Parameter | Value | Status |
|-----------|-------|--------|
| ledger_freeze | true | ACTIVE |
| provider_invoicing_paused | true | ACTIVE |
| fee_postings_paused | true | ACTIVE |
| stripe_cap_6h | 0 | BLOCKED |
| require_cfo_signoff | true | PENDING |

---

## Safety Controls

| Control | Status |
|---------|--------|
| SAFETY_LOCK | ACTIVE |
| B2C_CAPTURE | active (25%) |
| auto_refunds | ENABLED |
| localhost_probes_disabled | true |
| waf_sitemap_block | true |

---

## Rollback Thresholds (Hard Gates)

| Metric | Threshold | Action |
|--------|-----------|--------|
| A1 Login P95 | >200ms sustained OR >250ms any | ROLLBACK |
| Error Rate 5xx | ≥0.5% | ROLLBACK |
| Neon DB P95 | >100ms | ROLLBACK |
| Event Loop Lag | >200ms x2 consecutive | ROLLBACK |
| Telemetry Acceptance | <99% sustained | ROLLBACK |
| WAF _meta blocks | >0 | ROLLBACK |
| Probe Storms | >0 | ROLLBACK |

---

## HITL Authorization

```
HITL-CEO-20260120-OPEN-TRAFFIC-G2
Scope: Gate-2 = 25% traffic
Finance Freeze: ACTIVE
B2C Charges: CONDITIONAL (readiness only)
Authorized at: 2026-01-20T16:40:38.000Z
```

---

## Git Reference

```
Commit: cdf926d
Branch: main
Published: 2026-01-20
```
