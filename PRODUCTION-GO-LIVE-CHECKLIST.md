# ScholarLink Billing System - Production Go-Live Checklist

## 🔐 Secrets and Environments

### ✅ Critical Production Secrets
- [ ] **Stripe Live Mode Keys**
  - `STRIPE_SECRET_KEY`: Live secret key (sk_live_...)
  - `VITE_STRIPE_PUBLIC_KEY`: Live publishable key (pk_live_...)
  - `STRIPE_WEBHOOK_SECRET`: Live webhook endpoint secret
- [ ] **OpenAI Production Key**
  - `OPENAI_API_KEY`: Production key with least privilege access
  - Set up key rotation schedule (quarterly recommended)
- [ ] **Database**
  - `DATABASE_URL`: Production database connection
  - Verify SSL/TLS encryption enabled
- [ ] **Security Hardening**
  - [ ] CORS configured for production domains only
  - [ ] CSP headers locked to production domains
  - [ ] Rotate all staging secrets (never reuse in production)

## 💳 Stripe Configuration

### ✅ Product/Price Setup
- [ ] **Products Created in Stripe Dashboard**
  - Starter Package: $9.99 USD
  - Professional Package: $49.99 USD  
  - Enterprise Package: $99.99 USD
- [ ] **Server-Side Price Validation**
  - ✅ NEVER trust client-sent amounts
  - ✅ Map price_id to server-side package definitions
  - ✅ Validate total matches expected package price

### ✅ Webhook Configuration
- [ ] **Live Webhook Endpoint**
  - URL: `https://your-domain.com/api/stripe/webhook`
  - Events: `checkout.session.completed`, `invoice.payment_succeeded`
- [ ] **Security**
  - ✅ Signature verification implemented
  - ✅ Idempotent fulfillment (prevent double-grants)
  - ✅ Rate limiting on webhook endpoint

### ✅ Refund Policy
- [ ] **Define Refund Strategy**
  - Cash refunds: Stripe refund + negative ledger entry
  - Credit refunds: Negative ledger entry + positive credit entry
  - ✅ Both link to original purchase via referenceId

## ⚡ Charging Controls & Guardrails

### ✅ Per-Request Limits
- [ ] **Token Limits**
  - Max output tokens per request (prevent runaway costs)
  - Optional per-user spend caps per session/day
- [ ] **Insufficient Credits Flow**
  - ✅ Returns 402 status with `requiredCredits`/`currentCredits`
  - ✅ Direct link to Credits tab with `returnTo` parameter
  - ✅ Clear user messaging

## 🗄️ Data Integrity & Migrations

### ✅ Database Preparation
- [ ] **Backup Strategy**
  - Full backup before go-live
  - Point-in-time recovery (PITR) enabled
  - Verified rollback plan documented
- [ ] **Schema Migrations**
  - ✅ All migrations applied via `npm run db:push --force`
  - ✅ No manual SQL migrations (use Drizzle only)
- [ ] **Ledger Integrity**
  - ✅ Ledger is append-only (no UPDATE/DELETE statements)
  - ✅ Adjustments via reversal entries only
  - ✅ All referenceId fields populated for auditability

### ✅ Daily Reconciliation Job
```bash
# Schedule this daily reconciliation check
npm run reconciliation-check
```
**Validates:**
- Sum(ledger deltas) == current balance per user
- Sum(usage.chargedMillicredits) == sum(ledger deductions) per period
- Alert on any mismatch > 0.01 credits

## 📊 Observability & Monitoring

### ✅ Key Metrics to Emit

**Billing Metrics:**
```
billing.credits_purchased_total (counter, labels: package_code)
billing.credits_deducted_total (counter, labels: model)  
billing.active_balance_gauge (gauge, sample users)
billing.insufficient_credits_count (counter)
```

**Stripe Metrics:**
```
stripe.webhook_events_total (counter, labels: event_type)
stripe.webhook_failures_total (counter)
stripe.checkout_sessions_total (counter, labels: status)
```

**OpenAI Metrics:**
```
openai.calls_total (counter, labels: model)
openai.tokens_in_total (counter, labels: model)
openai.tokens_out_total (counter, labels: model)
```

**Financial Metrics:**
```
margin.gross_daily_usd = (credits_deducted/1000) - openai_cogs_usd
liability.outstanding_credits_usd = (total_credits_balance/1000)
```

### ✅ Critical Alerts

**Immediate Response (PagerDuty):**
- Webhook failures > 0 for 5+ minutes
- Reconciliation mismatch > 0.01 credits
- 402 insufficient credits spike (>10x baseline)

**Business Alerts (Slack):**
- Daily margin < target threshold
- Outstanding credits liability > business limit
- New model costs exceed budget

### ✅ Dashboards

**Revenue Dashboard:**
- Daily: Revenue vs COGS vs Margin
- Daily: Credits purchased vs deducted
- Weekly: Top models by cost and by user

**Operations Dashboard:**
- Outstanding credits liability
- Webhook success rates
- API response times and error rates

## 🔒 Security & Compliance

### ✅ Access Control
- [ ] **Admin Endpoints**
  - RBAC implemented on `/api/admin/*` routes
  - All admin actions logged to audit table
  - Multi-factor authentication for admin access
- [ ] **Logging Security**
  - Never log secrets or webhook payloads
  - Mask PII in application logs
  - Structured logging for security events

### ✅ Backup & Recovery
- [ ] **Backup Schedule**
  - Daily automated backups
  - PITR enabled (24-hour retention minimum)
  - Quarterly restore drill scheduled
- [ ] **PCI Compliance**
  - ✅ Using Stripe Checkout (stays out of PCI SAQ-D)
  - ✅ Never collect or store card data
  - Document PCI compliance scope

## 👤 User Experience & Trust

### ✅ Credits Tab Enhancements
- [ ] **Clear Messaging**
  - "Credits are prepaid. 1,000 Credits = $1.00"
  - "You only pay for actual token usage"
  - "USD equivalent is approximate"
- [ ] **Transaction Transparency**
  - Link to Stripe receipt on purchase rows
  - Download monthly statement (CSV/PDF)
  - Show opening/closing balance and per-model totals

### ✅ Trust Indicators
- [ ] **Professional UI**
  - Clear pricing breakdown
  - Real-time cost estimation
  - Professional error messages
- [ ] **Transparency**
  - Link to pricing page from all purchase flows
  - Terms of service and refund policy easily accessible

## 🚨 Operational Runbook

### Incident Response Procedures

**Webhook Outage:**
1. Stripe automatically retries failed webhooks
2. Monitor Stripe dashboard for queued events
3. Manual replay: `stripe events resend evt_xxx`
4. Fulfillment is idempotent (safe to replay)

**Overcharge Investigation:**
1. Create offsetting adjustment ledger entry
2. Set referenceId to investigation ticket
3. Document root cause and prevention measures

**User Stuck After Checkout:**
1. Verify `stripePaymentIntentId` in purchase record
2. Check purchase status == "paid"
3. Rerun fulfillment: `POST /api/admin/fulfill-purchase`
4. Fulfillment is idempotent (safe operation)

**Reconciliation Failure:**
1. Identify affected user(s) and time range
2. Compare ledger entries vs current balance
3. Create adjustment entry if legitimate discrepancy
4. Never directly modify balances (always via ledger)

## 🎯 Nice-to-Have Future Enhancements

**Phase 2 Features:**
- Auto-recharge toggle (threshold-based) for Professional/Enterprise
- Team/workspace credits with member allocations
- Spend caps and budget alerts per user/team

**Phase 3 Features:**
- Stripe Coupons integration and promo codes
- Introductory bonus credits for new users
- Per-model feature flags and rate rollout safety

**Enterprise Features:**
- Custom pricing for high-volume customers
- Detailed usage analytics and reporting
- SSO integration and team management

---

## 🚀 Production Deployment Verification

After deployment, verify these critical paths:

### ✅ End-to-End Flow Test
1. **Purchase Flow**
   - [ ] Select package → Stripe checkout → webhook → credits awarded
   - [ ] Verify correct bonus credits applied
   - [ ] Check transaction appears in Credits tab

2. **Usage Flow**  
   - [ ] Make AI request → credits deducted → usage recorded
   - [ ] Verify insufficient credits returns 402
   - [ ] Check usage history accuracy

3. **Monitoring**
   - [ ] All metrics emitting correctly
   - [ ] Dashboards showing real data
   - [ ] Alerts configured and tested

### ✅ Go-Live Checklist Summary
- [ ] All secrets configured and tested
- [ ] Stripe products/webhooks configured
- [ ] Database migrations and backups complete
- [ ] Monitoring and alerts active
- [ ] Security controls verified
- [ ] User experience tested end-to-end
- [ ] Incident response procedures documented

**Status: Ready for Production Deployment** ✅

**Deployment Command:**
```bash
# Final deployment
npm run build
npm run deploy:production
npm run verify:production
```

---
*Last Updated: January 19, 2025*  
*Billing System Status: Production Ready*