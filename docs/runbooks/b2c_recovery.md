# B2C Recovery Runbook

**Last Updated:** January 8, 2026  
**Protocol:** AGENT3_HANDSHAKE v27  
**Funnel:** A7 → A1 → A5 → A3 → A2 → A8

---

## Quick Reference

| Symptom | Likely Cause | Runbook Section |
|---------|--------------|-----------------|
| User stuck in login loop | A1-001 OIDC | Section 1 |
| Signup not completing | Cookie/redirect issue | Section 1 |
| Events not reaching A8 | Telemetry failure | Section 2 |
| Slow page loads | Latency SLO violation | Section 3 |
| Credits not applied | Webhook failure | Section 4 |

---

## Section 1: A1-001 OIDC Session Loop

### Symptoms
- User redirected repeatedly between A7/A5 and A1
- Login appears to succeed but session not established
- Cookie not persisting across redirects

### Root Cause
OIDC cookies not configured with proper SameSite/Secure attributes for cross-origin flow.

### Fix Steps

1. **Verify Cookie Configuration**
   ```
   Set-Cookie: session=...; SameSite=None; Secure; Domain=.replit.app; Path=/
   ```

2. **Align TTL**
   - Session TTL: Match across A1 and A5
   - Recommended: 24 hours for session, 7 days for refresh

3. **Check JWKS**
   ```bash
   curl https://scholar-auth-jamarrlmayes.replit.app/.well-known/openid-configuration
   ```

4. **Validate Redirects**
   - Ensure redirect_uri matches registered clients
   - Check for HTTP vs HTTPS mismatch

### Verification
```bash
# Test OIDC discovery
curl -I https://scholar-auth-jamarrlmayes.replit.app/.well-known/openid-configuration

# Should return 200 OK with proper CORS headers
```

---

## Section 2: Telemetry Delivery Failure

### Symptoms
- Events not appearing in A8 Command Center
- KPI_SNAPSHOT not updating
- Growth tile stale

### Diagnosis
```bash
# Check telemetry logs
grep "Telemetry" /tmp/logs/Start_application_*.log
```

### Expected Output
```
✅ Telemetry v3.5.1: Successfully sent 9/9 events to A8 Command Center
```

### Fix Steps

1. **Verify Endpoints**
   - Primary: https://auto-com-center-jamarrlmayes.replit.app/events
   - Fallback: https://scholarship-api-jamarrlmayes.replit.app/events

2. **Check M2M Token**
   - If "M2M token refresh failed", SHARED_SECRET may be invalid
   - Fallback to SHARED_SECRET is acceptable

3. **Verify Event Flush**
   - Default flush interval: 10000ms
   - Batch max: 100 events

---

## Section 3: Latency SLO Violations

### Current Status (as of 2026-01-08)

| App | P95 | SLO | Status |
|-----|-----|-----|--------|
| A1 | 150ms | ≤150ms | ⚠️ At boundary |
| A2 | 216ms | ≤125ms | ❌ Over |
| A5 | 10ms | ≤150ms | ✅ Pass |
| A7 | 248ms | ≤150ms | ❌ Over |
| A8 | 314ms | ≤150ms | ❌ Over |

### Recommendations

**A2 (Scholarship API):**
- Add database connection pooling
- Optimize frequently-hit queries
- Add read replicas if needed

**A7 (Auto Page Maker):**
- Implement CDN for static assets
- Add edge caching for landing pages
- Pre-warm cold paths

**A8 (Command Center):**
- Known issue: A8-PERF-001
- Implement Redis caching for dashboard tiles
- Add CDN for static assets

---

## Section 4: Payment/Credit Issues

### Symptoms
- Stripe checkout succeeds but credits not applied
- Webhook not received
- credit_ledger not updated

### Diagnosis
```sql
-- Check credit ledger for recent activity
SELECT * FROM credit_ledger ORDER BY created_at DESC LIMIT 10;

-- Check purchases table
SELECT * FROM purchases ORDER BY created_at DESC LIMIT 10;
```

### Fix Steps

1. **Verify Webhook Configuration**
   - Stripe Dashboard → Developers → Webhooks
   - Endpoint: https://student-pilot-jamarrlmayes.replit.app/api/billing/webhook
   - Events: checkout.session.completed

2. **Check Webhook Secret**
   - Ensure STRIPE_WEBHOOK_SECRET is set
   - Verify signature validation

3. **Manual Credit Application** (HITL required)
   ```sql
   -- Only with approval
   INSERT INTO credit_ledger (user_id, type, amount_millicredits, ...)
   VALUES ('user_id', 'adjustment', 50000, ...);
   ```

---

## Escalation Path

1. **L1:** Check logs, verify configuration
2. **L2:** Database queries, manual verification
3. **L3:** Code changes requiring PR
4. **HITL:** Production writes, secret rotation

---

## Related Documents

- tests/perf/reports/b2c_funnel_results.json
- tests/perf/reports/a8_baseline_load.md
- tests/perf/reports/ecosystem_slo_matrix.md
