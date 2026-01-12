# HITL Micro-Charge Runbook

**Version:** 1.1  
**Status:** PREPARED (NOT EXECUTED)  
**File:** tests/perf/reports/hitl_microcharge_runbook.md

---

## Purpose

Validate live B2C payment flow with minimal risk:
- Single $0.50 charge
- Immediate refund (<60 seconds)
- 3-of-3 proof methodology

---

## Preconditions to Execute

| # | Condition | Status |
|---|-----------|--------|
| 1 | Stripe capacity reset OR explicit HITL approval | ⏳ Pending |
| 2 | A3 = 200 across 24-hour window | ⏳ Pending |
| 3 | A6 = 200 across 24-hour window | ⏳ Pending |
| 4 | A8 = 200 across 24-hour window | ⏳ Pending |
| 5 | A1 warm P95 ≤120ms across 24-hour window | ⏳ Pending |
| 6 | Run 009 E2E = FULL PASS | ⏳ Pending |

**ALL conditions must be met before execution.**

---

## Safety Guards

| Guard | Threshold | Action |
|-------|-----------|--------|
| Stripe Remaining | <5 | **STOP IMMEDIATELY** |
| A3 Status | non-200 | **STOP IMMEDIATELY** |
| A6 Status | non-200 | **STOP IMMEDIATELY** |
| A8 Status | non-200 | **STOP IMMEDIATELY** |
| Refund Failure | Any | **STOP + ESCALATE** |

---

## Execution Procedure

### Step 1: Pre-Flight Verification
```bash
# Verify all core apps healthy
A3=$(curl -s -o /dev/null -w '%{http_code}' https://scholarship-agent-jamarrlmayes.replit.app/health)
A6=$(curl -s -o /dev/null -w '%{http_code}' https://scholarship-admin-jamarrlmayes.replit.app/health)
A8=$(curl -s -o /dev/null -w '%{http_code}' https://auto-com-center-jamarrlmayes.replit.app/health)

# STOP if any ≠ 200
if [ "$A3" != "200" ] || [ "$A6" != "200" ] || [ "$A8" != "200" ]; then
  echo "SAFETY STOP: A3=$A3 A6=$A6 A8=$A8"
  exit 1
fi
```

### Step 2: Create Checkout Session
```bash
TRACE_ID="HITL-MICROCHARGE-$(date +%s)"

curl -X POST https://student-pilot-jamarrlmayes.replit.app/api/billing/create-checkout \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: $TRACE_ID" \
  -d '{"credits": 50, "amount": 50}'
```

**Amount:** $0.50 (50 cents)  
**Capture:** session_id, payment_intent_id

### Step 3: Complete Payment (Manual)
- Use Stripe test card: `4242 4242 4242 4242`
- Exp: Any future date
- CVC: Any 3 digits
- Complete checkout flow
- **Timer starts on successful charge**

### Step 4: Immediate Refund (<60 seconds)
```bash
# Via Stripe Dashboard or API
# Refund FULL amount immediately
# Capture refund_id
```

**Target:** Refund within 60 seconds of charge

### Step 5: Collect 3-of-3 Proof

| Proof | Source | Required Evidence |
|-------|--------|-------------------|
| 1 | HTTP Response | X-Trace-Id header, HTTP 200, session_id |
| 2 | A5 Logs | payment_succeeded event with matching X-Trace-Id |
| 3 | Stripe Ledger | Payment entry + Refund entry + A8 checksum |

### Step 6: A8 Round-Trip Verification
```bash
curl -X POST https://auto-com-center-jamarrlmayes.replit.app/events \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: $TRACE_ID" \
  -d '{
    "event_type": "hitl_microcharge_complete",
    "app_id": "A5",
    "data": {
      "amount_cents": 50,
      "payment_intent_id": "pi_xxx",
      "refund_id": "re_xxx",
      "refund_time_seconds": 45,
      "proof_count": 3,
      "verdict": "PASS"
    }
  }'
```

---

## Evidence Template

```json
{
  "run_id": "HITL-MICROCHARGE-xxx",
  "timestamp": "2026-01-xx",
  "amount_cents": 50,
  "payment_intent_id": "pi_xxx",
  "refund_id": "re_xxx",
  "refund_latency_seconds": 45,
  "proof_1_http": {
    "status": 200,
    "x_trace_id": "HITL-MICROCHARGE-xxx",
    "session_id": "cs_xxx"
  },
  "proof_2_logs": {
    "event": "payment_succeeded",
    "timestamp": "2026-01-xx",
    "matching_trace": true
  },
  "proof_3_stripe": {
    "payment_status": "succeeded",
    "refund_status": "succeeded",
    "a8_checksum": "sha256:xxx"
  },
  "a8_event_id": "evt_xxx",
  "verdict": "PASS"
}
```

---

## Rollback Plan

If any step fails:
1. **STOP** immediately - do not proceed
2. If charge succeeded but refund failed:
   - Escalate to BizOps for manual refund
   - Document incident with timestamps
3. Do NOT retry without fresh HITL approval
4. Generate incident report

---

## Post-Execution

**If PASS (3-of-3 verified):**
- Update go_no_go_report.md with HITL verification
- Generate Gold Standard attestation
- Decrement Safety Pause counter (4→3)
- B2C revenue flow VALIDATED

**If FAIL:**
- Document root cause
- Maintain Safety Pause at current level
- Schedule remediation before retry

---

*Version: 1.1*  
*Status: PREPARED - AWAITING PRECONDITIONS*  
*Last Updated: 2026-01-12T08:05:00Z*
