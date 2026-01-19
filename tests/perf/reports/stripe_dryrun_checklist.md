# Stripe Live-Mode Dry-Run Checklist

**Soak ID:** SOAK-049  
**Generated:** 2026-01-19T04:02:00.000Z  
**Status:** PREPARED (Awaiting Soak PASS)

## Pre-Pilot Checklist

### 1. AVS + CVV Verification

| Check | Status |
|-------|--------|
| AVS (Address Verification) enabled | ⏳ PENDING |
| CVV required for all charges | ⏳ PENDING |
| Radar rules configured | ⏳ PENDING |

### 2. 3D Secure (3DS) Challenge

| Check | Status |
|-------|--------|
| 3DS enabled for high-risk transactions | ⏳ PENDING |
| Challenge flow tested | ⏳ PENDING |
| Fallback handling implemented | ⏳ PENDING |

### 3. Webhook Signature Verification

| Check | Status |
|-------|--------|
| STRIPE_WEBHOOK_SECRET configured | ⏳ PENDING |
| Signature validation in handler | ⏳ PENDING |
| Idempotency key handling | ⏳ PENDING |
| Event replay protection | ⏳ PENDING |

### 4. Payment Flow Configuration

| Parameter | Value | Status |
|-----------|-------|--------|
| Mode | LIVE | ✅ Configured |
| Publishable Key | pk_live_* | ✅ Present |
| Secret Key | sk_live_* | ✅ Present (secret) |
| Webhook endpoint | /api/webhooks/stripe | ⏳ PENDING verify |

### 5. Pilot Caps

| Cap | Value | Status |
|-----|-------|--------|
| Per-user | $5 | ⏳ PENDING implement |
| Global | $250 | ⏳ PENDING implement |
| Daily | $50 | ⏳ PENDING implement |

### 6. Rollback Automation

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Chargeback rate | >2% | Auto-pause |
| Fraud flags | >1% | Auto-pause |
| P95 latency | >170ms for 10min | Auto-pause |

## Dry-Run Test Sequence

To be executed after soak PASS:

1. [ ] Create $0.50 test charge (internal account)
2. [ ] Verify webhook fires and processes
3. [ ] Verify telemetry event emitted
4. [ ] Immediate refund
5. [ ] Verify refund webhook processes
6. [ ] Confirm no orphaned records

## CEO Authorization Required

Before executing pilot:
1. Add to hitl_approvals.log: `[CEO] [APPROVE] MICRO_CHARGE $1 PILOT`
2. Set environment: `B2C_MICRO_CHARGE_ENABLED=true`
3. Confirm soak T+24h PASS
