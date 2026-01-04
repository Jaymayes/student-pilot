# A5 (student_pilot) Truth Tables
**Date:** 2026-01-04
**Protocol:** v3.5.1

## System State Matrix

| Component | Before Fix | After Fix | Expected | Status |
|-----------|------------|-----------|----------|--------|
| Telemetry Endpoint | /ingest (404) | /events | /events | ✅ |
| Telemetry Protocol | v3.5.1 | v3.5.1 | v3.5.1 | ✅ |
| Stripe Mode | mixed_mode (1%) | live_mode (100%) | live_mode (100%) | ✅ |
| A8 Event Receipt | ❌ Failed | ✅ Success | ✅ Success | ✅ |
| Auth Probe | pass | pass | pass | ✅ |
| Lead Probe | pass | pass | pass | ✅ |
| Data Probe | pass | pass | pass | ✅ |

---

## External Dependencies Matrix

| App | Endpoint | Expected Status | Actual Status | Impact |
|-----|----------|-----------------|---------------|--------|
| A1 | /oidc/auth | 302 | 400 | ❌ BLOCKS AUTH |
| A1 | /.well-known/openid-configuration | 200 | 200 | ✅ |
| A3 | /api/automations/won-deal | 200 | 404 | ❌ LTV LOSS |
| A3 | /api/leads/won-deal | 200 | 404 | ❌ LEAD SCORING |
| A3 | /api/revenue-by-page | 200 | 404 | ⚠️ ANALYTICS |
| A3 | /api/orchestration/status | 200 | 404 | ⚠️ MONITORING |
| A8 | /events | 200 | 200 | ✅ |
| A8 | /api/metrics | 200 | 200 | ✅ |

---

## Golden Path Status

### Phase 1: Signup/Login
| Step | Status | Blocker |
|------|--------|---------|
| User clicks "Sign Up" | ✅ Works | - |
| Redirect to A1 OIDC | ❌ BLOCKED | A1 returns 400 |
| Return with auth token | ❌ BLOCKED | - |
| Profile creation | ⏸️ Pending | Depends on auth |

### Phase 2: Onboarding
| Step | Status | Blocker |
|------|--------|---------|
| Profile completion | ⏸️ Pending | Auth required |
| Trial credits granted | ✅ Ready | 5 credits on signup |
| Scholarship matching | ✅ Ready | - |

### Phase 3: Payment
| Step | Status | Blocker |
|------|--------|---------|
| Stripe checkout | ✅ Ready | - |
| Payment processing | ✅ Live Mode | Fixed |
| Credit purchase | ✅ Ready | - |
| Webhook handling | ✅ Ready | - |

### Phase 4: AI Assistance
| Step | Status | Blocker |
|------|--------|---------|
| Credit deduction | ✅ Ready | - |
| OpenAI call | ✅ Ready | - |
| Response delivery | ✅ Ready | - |

### Phase 5: Revenue Reporting
| Step | Status | Blocker |
|------|--------|---------|
| Payment telemetry | ✅ Ready | - |
| A8 receipt | ✅ Working | Fixed |
| Won Deal automation | ❌ BLOCKED | A3 404 |
| LTV tracking | ⚠️ Partial | A3 required |

---

## Event Flow Matrix

| Event | Source | Destination | Status |
|-------|--------|-------------|--------|
| app_started | A5 | A8 /events | ✅ |
| app_heartbeat | A5 | A8 /events | ✅ |
| page_view | A5 | A8 /events | ✅ |
| payment_succeeded | A5 | A8 /events | ✅ |
| won_deal | A5 | A3 /api/automations | ❌ 404 |
| lead_score_elevated | A5 | A3 /api/leads | ❌ 404 |
| revenue_by_page | A5 | A7 /api/revenue | ⚠️ Pending |

---

## Resolution Summary

| Issue ID | Severity | Owner | Status | Resolution |
|----------|----------|-------|--------|------------|
| TEL-001 | RS-3 | A5 | ✅ FIXED | Migrate /ingest to /events |
| BIL-001 | RS-2 | A5 | ✅ FIXED | Set BILLING_ROLLOUT_PERCENTAGE=100 |
| AUTH-001 | RS-1 | A1 | ❌ EXTERNAL | Register client in A1 |
| AUTO-001 | RS-1 | A3 | ❌ EXTERNAL | Implement /api/automations |
| AUTO-002 | RS-3 | A3 | ❌ EXTERNAL | Implement /api/orchestration/status |
| TILE-001 | RS-4 | A8 | ℹ️ DESIGN | Uses /api/metrics instead |

---

## Confidence Scores

| Metric | Score | Notes |
|--------|-------|-------|
| A5 Internal Health | 100% | All probes passing |
| Telemetry Pipeline | 100% | Events flowing to A8 |
| Payment Readiness | 100% | Stripe live mode active |
| Authentication | 0% | A1 blocker |
| Learning Loop | 25% | A3 blockers |
| Overall Launch Readiness | 65% | External dependencies blocking |
