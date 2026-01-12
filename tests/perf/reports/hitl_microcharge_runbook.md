# HITL Micro-Charge Runbook

**Version:** 1.0  
**Status:** PREPARED (NOT EXECUTED)  
**Prerequisites:** Stripe capacity reset OR explicit HITL approval

---

## Purpose

Validate live B2C payment flow with minimal risk:
- Single $0.50 charge
- Immediate refund
- 3-of-3 proof methodology

---

## Safety Guards

| Guard | Threshold | Action |
|-------|-----------|--------|
| Stripe Remaining | <5 | **STOP** |
| A3 Status | non-200 | **STOP** |
| A6 Status | non-200 | **STOP** |
| A8 Status | non-200 | **STOP** |

---

## Pre-Execution Checklist

- [ ] HITL approval obtained (verbal or written)
- [ ] Stripe capacity ≥5
- [ ] A3/A6/A8 all returning 200
- [ ] Run 009 (24h E2E) PASSED
- [ ] Test customer exists in Stripe

---

## Execution Steps

### Step 1: Pre-Flight Verification
```bash
# Verify fleet health
curl -s https://scholarship-agent-jamarrlmayes.replit.app/health
curl -s https://scholarship-admin-jamarrlmayes.replit.app/health
curl -s https://auto-com-center-jamarrlmayes.replit.app/health
```

### Step 2: Create Test Checkout Session
```bash
# POST to A5 billing endpoint
curl -X POST https://student-pilot-jamarrlmayes.replit.app/api/billing/create-checkout \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: HITL-MICROCHARGE-001" \
  -d '{"credits": 50, "amount": 50}'  # $0.50
```

### Step 3: Complete Payment (Manual)
- Use Stripe test card: 4242 4242 4242 4242
- Complete checkout flow
- Capture payment_intent_id

### Step 4: Immediate Refund
```bash
# POST refund via Stripe Dashboard or API
# Refund full amount immediately
```

### Step 5: Collect 3-of-3 Proof

| Proof | Source | Evidence |
|-------|--------|----------|
| 1 | HTTP Response | X-Trace-Id header, 200 status |
| 2 | A5 Logs | payment_succeeded event with matching trace |
| 3 | Stripe Ledger | Payment + Refund entries |

### Step 6: A8 Round-Trip Verification
```bash
# Verify payment event in A8
curl https://auto-com-center-jamarrlmayes.replit.app/events \
  -H "X-Trace-Id: HITL-MICROCHARGE-001" \
  -d '{"event_type":"hitl_microcharge_complete","data":{"amount":50,"refunded":true}}'
```

---

## Evidence Template

```json
{
  "run_id": "HITL-MICROCHARGE-001",
  "timestamp": "TBD",
  "amount_cents": 50,
  "payment_intent_id": "pi_xxx",
  "refund_id": "re_xxx",
  "proof_1_http": {
    "status": 200,
    "x_trace_id": "HITL-MICROCHARGE-001"
  },
  "proof_2_logs": {
    "event": "payment_succeeded",
    "timestamp": "TBD"
  },
  "proof_3_stripe": {
    "payment_status": "succeeded",
    "refund_status": "succeeded"
  },
  "a8_event_id": "evt_xxx",
  "verdict": "PASS/FAIL"
}
```

---

## Rollback Plan

If any step fails:
1. **STOP** immediately
2. Document failure point
3. Do NOT retry without HITL re-approval
4. Refund any pending charges

---

## Post-Execution

**If PASS:**
- Update go_no_go_report.md with HITL verification
- Generate Gold Standard attestation
- Reduce Safety Pause counter by 1

**If FAIL:**
- Document root cause
- Schedule remediation
- Maintain Safety Pause

---

*Status: PREPARED - AWAITING HITL APPROVAL*
