# student_pilot Daily KPI Rollup
**Date:** [YYYY-MM-DD]  
**Report Time:** 06:00 UTC  
**Reporter:** student_pilot DRI  
**Status:** [HOLD | CONDITIONAL GO | FULL GO]

---

## Executive Summary (1-2 sentences)
[Brief status update: operational health, key events, blockers]

---

## Uptime & Availability

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Uptime | ≥99.9% | [%] | [✅/⚠️/🔴] |
| P50 Latency | - | [ms] | - |
| **P95 Latency** | **≤120ms** | **[ms]** | **[✅/⚠️/🔴]** |
| P99 Latency | - | [ms] | - |
| Error Rate | ≤0.1% | [%] | [✅/⚠️/🔴] |
| Total Requests | - | [count] | - |

**Uptime Calculation:** `(total_time - downtime) / total_time * 100`

---

## Authentication & Onboarding

| Metric | Count | Notes |
|--------|-------|-------|
| Auth Attempts | [count] | Total login attempts |
| Auth Success Rate | [%] | Successful authentications |
| New Signups (student_signup events) | [count] | New user registrations |
| Cumulative Users | [count] | Total registered users |

**Key Events:**
- [Any auth issues, patterns, or anomalies]

---

## Activation Metrics

| Milestone | Count | Conversion Rate | Median TTV |
|-----------|-------|-----------------|------------|
| Profile Complete (≥80%) | [count] | [%] of signups | [hours] |
| First Document Upload | [count] | [%] of signups | [hours] |
| First Match Viewed | [count] | [%] of signups | [hours] |
| First Application Started | [count] | [%] of signups | [hours] |

**Activation Rate:** `(first_document_upload_count / total_signups) * 100`

**SQL Queries:**
```sql
-- Signups (past 24h)
SELECT COUNT(*) FROM business_events
WHERE event_name = 'student_signup'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Activation rate
SELECT 
  COUNT(DISTINCT CASE WHEN first_document_upload_at IS NOT NULL THEN user_id END) * 100.0 / 
  COUNT(*) as activation_rate
FROM ttv_milestones;
```

---

## Revenue & Monetization

| Metric | Count | Amount (USD) | Notes |
|--------|-------|--------------|-------|
| New Purchases | [count] | $[amount] | Credit package sales |
| Refunds Processed | [count] | $[amount] | Customer refunds |
| Net Revenue (24h) | - | $[amount] | Purchases - refunds |
| Cumulative Revenue | - | $[amount] | All-time revenue |
| ARPU (per credit buyer) | - | $[amount] | Average revenue per purchaser |

**Conversion Metrics:**
- Signup → Purchase: [%]
- First Document → Purchase: [%]

**SQL Queries:**
```sql
-- Revenue (past 24h)
SELECT 
  COUNT(*) as purchases,
  SUM(price_usd_cents) / 100.0 as total_revenue_usd
FROM purchases
WHERE status = 'paid'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Refund rate
SELECT 
  COUNT(CASE WHEN type = 'refund' THEN 1 END) * 100.0 / 
  COUNT(CASE WHEN type = 'purchase' THEN 1 END) as refund_rate
FROM credit_ledger;
```

---

## External Gate Dependencies

| Gate | Owner | Deadline | Status | Notes |
|------|-------|----------|--------|-------|
| **Gate C: scholar_auth P95** | scholar_auth DRI | Nov 12, 20:00 UTC | [🔴/⏳/✅] | P95 ≤120ms target |
| **Gate A: auto_com_center** | auto_com_center DRI | Nov 11, 20:00 UTC | [🔴/⏳/✅] | Deliverability GREEN |
| Stripe PASS | Finance | Nov 11, 18:00 UTC | [🔴/⏳/✅] | Live mode approval |

**Impact on student_pilot:**
- [Summary of how gate status affects launch readiness]

---

## Incidents & Issues

| Time | Severity | Issue | Resolution | Status |
|------|----------|-------|------------|--------|
| [HH:MM UTC] | [P0-P3] | [Description] | [Action taken] | [Open/Resolved] |

**No incidents:** ✅ [if applicable]

---

## Action Items & Next Steps

1. [Action item 1]
2. [Action item 2]
3. [Action item 3]

---

## Appendix: Metrics Collection Commands

### Admin Metrics Snapshot
```bash
curl -s -H "Authorization: Bearer ${SHARED_SECRET}" \
  https://student-pilot-jamarrlmayes.replit.app/api/admin/metrics \
  | jq '.'
```

### Database Queries
```sql
-- Daily signups
SELECT DATE(created_at) as date, COUNT(*) as signups
FROM business_events
WHERE event_name = 'student_signup'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Activation funnel
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN first_document_upload_at IS NOT NULL THEN 1 END) as activated_users,
  COUNT(CASE WHEN first_document_upload_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as activation_rate
FROM ttv_milestones;

-- Revenue summary
SELECT 
  COUNT(*) as total_purchases,
  SUM(price_usd_cents) / 100.0 as total_revenue_usd,
  AVG(price_usd_cents) / 100.0 as avg_purchase_usd,
  MAX(created_at) as last_purchase
FROM purchases
WHERE status = 'paid';
```

---

**Report Generated:** [Timestamp]  
**Next Report:** [Tomorrow @ 06:00 UTC]  
**Submitted to:** CEO + All DRIs
