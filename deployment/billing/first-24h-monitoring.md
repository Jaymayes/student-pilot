# ScholarLink Billing Service - First 24h Monitoring Guide

## 🚨 Critical Incidents to Watch

### Stripe Webhook Failures
```bash
# Check webhook delivery status
kubectl logs -l app=scholarlink-billing -n scholarlink-prod | grep "webhook"

# Monitor webhook failure rate
# Prometheus query: webhook_events_total{source="stripe",status!="ok"}
```

**Thresholds:**
- Webhook failure rate > 5% for 5 minutes
- Webhook latency > 3 seconds consistently

### Reconciliation Issues
```bash
# Check for idempotency collisions
kubectl logs -l app=scholarlink-billing -n scholarlink-prod | grep "idempotency"

# Monitor reconciliation failures
# Prometheus query: billing_reconcile_failures_total
```

**Thresholds:**
- Unexpected duplicate reconciliations
- Reconciliation failure rate > 1%

### Ledger Write Failures
```bash
# Check database transaction failures
kubectl logs -l app=scholarlink-billing -n scholarlink-prod | grep -i "transaction\|rollback\|deadlock"

# Monitor database connection health
kubectl exec -n scholarlink-prod deployment/scholarlink-billing -- wget -qO- http://localhost:3000/readyz
```

## 📊 Key Metrics Dashboard

### Request Metrics
```prometheus
# Request rate per minute
rate(http_requests_total{service="billing"}[5m]) * 60

# Error rate percentage
(rate(http_requests_total{service="billing",status=~"4..|5.."}[5m]) / rate(http_requests_total{service="billing"}[5m])) * 100

# P95 latency
histogram_quantile(0.95, http_request_duration_seconds{service="billing"})
```

### Business Metrics
```prometheus
# Credits purchased per hour
increase(billing_credits_purchased_total[1h])

# Credits debited per hour
increase(billing_credits_debited_total[1h])

# Insufficient funds events
billing_reconcile_insufficient_funds_total
```

### System Health
```prometheus
# Database connection pool usage
billing_db_connections_active / billing_db_connections_max

# Memory usage
container_memory_usage_bytes{pod=~"scholarlink-billing-.*"}

# CPU usage
rate(container_cpu_usage_seconds_total{pod=~"scholarlink-billing-.*"}[5m])
```

## 🎯 SLO Monitoring

### Availability (99.9% target)
```bash
# Check uptime over last 24h
uptime_percentage = (1 - (downtime_minutes / 1440)) * 100
```

### Latency (P95 < 500ms target)
```bash
# Monitor API endpoint latency
histogram_quantile(0.95, http_request_duration_seconds{endpoint="/api/usage/reconcile"})
```

### Error Rate (< 0.1% target)
```bash
# Calculate error rate
error_rate = (4xx_requests + 5xx_requests) / total_requests * 100
```

## 🔍 Business Sanity Checks

### Credit Balance Validation
```sql
-- Run this query against billing database
SELECT 
    SUM(CASE WHEN kind = 'credit' THEN amount_credits ELSE 0 END) as total_credits_added,
    SUM(CASE WHEN kind = 'debit' THEN amount_credits ELSE 0 END) as total_credits_used,
    (SUM(CASE WHEN kind = 'credit' THEN amount_credits ELSE 0 END) - 
     SUM(CASE WHEN kind = 'debit' THEN amount_credits ELSE 0 END)) as net_outstanding
FROM ledger_entries 
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

### Revenue Reconciliation
```bash
# Compare Stripe dashboard with billing service
# Stripe gross volume should match sum of successful purchases
echo "Check Stripe dashboard: https://dashboard.stripe.com/payments"
echo "Compare with billing service purchase records"
```

### Usage Pattern Analysis
```sql
-- Top models by usage
SELECT 
    model,
    COUNT(*) as request_count,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    SUM(amount_credits) as total_cost_credits
FROM ledger_entries 
WHERE kind = 'debit' 
    AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY model 
ORDER BY total_cost_credits DESC;
```

## 🚨 Alert Configuration

### High Priority Alerts (PagerDuty/SMS)
```yaml
# Error rate > 1% for 5 minutes
- alert: BillingHighErrorRate
  expr: rate(http_requests_total{service="billing",status=~"4..|5.."}[5m]) / rate(http_requests_total{service="billing"}[5m]) > 0.01
  for: 5m
  annotations:
    summary: "Billing service error rate is {{ $value | humanizePercentage }}"

# Webhook failures > 5% for 5 minutes  
- alert: StripeWebhookFailures
  expr: rate(webhook_events_total{source="stripe",status!="ok"}[5m]) / rate(webhook_events_total{source="stripe"}[5m]) > 0.05
  for: 5m

# Database connection failures
- alert: BillingDatabaseDown
  expr: up{job="billing-readiness"} == 0
  for: 1m
```

### Medium Priority Alerts (Slack)
```yaml
# High latency
- alert: BillingHighLatency
  expr: histogram_quantile(0.95, http_request_duration_seconds{service="billing"}) > 1.0
  for: 5m

# Credit reconciliation anomalies
- alert: UnusualCreditActivity
  expr: increase(billing_credits_debited_total[1h]) > 100000  # Adjust threshold
  for: 1h
```

## 📈 Hourly Checks (First 24h)

### Hour 1-6: Critical Monitoring
- [ ] Check all pods are running and healthy
- [ ] Verify Stripe webhook deliveries
- [ ] Monitor error rates < 0.1%
- [ ] Validate first real transactions

### Hour 6-12: Pattern Analysis
- [ ] Review usage patterns by model
- [ ] Check for any abuse or unusual spending
- [ ] Validate credit calculations match rate card
- [ ] Monitor database performance

### Hour 12-24: Optimization
- [ ] Review autoscaling behavior
- [ ] Check for any memory leaks
- [ ] Validate backup and monitoring systems
- [ ] Plan any immediate optimizations

## 🛠️ Troubleshooting Commands

### Quick Health Check
```bash
# All-in-one status check
kubectl get pods,svc,ingress -l app=scholarlink-billing -n scholarlink-prod
curl -s https://billing.student-pilot.replit.app/health | jq
```

### Debug Performance Issues
```bash
# Check resource usage
kubectl top pods -l app=scholarlink-billing -n scholarlink-prod

# Get detailed pod metrics
kubectl describe pod -l app=scholarlink-billing -n scholarlink-prod
```

### Debug Database Issues
```bash
# Check database connectivity
kubectl exec -n scholarlink-prod deployment/scholarlink-billing -- node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => console.log('DB OK')).catch(console.error);
"
```

### Debug Stripe Integration
```bash
# Check webhook endpoint
curl -X POST https://billing.student-pilot.replit.app/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verify webhook secret is set
kubectl get secret scholarlink-billing-env -n scholarlink-prod -o jsonpath='{.data.STRIPE_WEBHOOK_SECRET}' | base64 -d | wc -c
```

## 📋 Daily Report Template

### Morning Report (8 AM)
```
📊 Billing Service - 24h Report

🎯 SLOs:
- Availability: ___% (target: 99.9%)
- P95 Latency: ___ms (target: <500ms)
- Error Rate: ___% (target: <0.1%)

💳 Business Metrics:
- Total Purchases: $___
- Credits Purchased: ___
- Credits Used: ___
- Top Model: ___ (___% of usage)

🚨 Incidents:
- Critical: ___
- Warnings: ___

📈 Performance:
- Peak RPS: ___
- Peak Latency: ___ms
- Database Connections: ___/10

✅ Action Items:
- [ ] ___
- [ ] ___
```

## 🔄 Weekly Review Items

After first week of production:
- [ ] Review rate card pricing effectiveness
- [ ] Analyze customer spending patterns
- [ ] Optimize resource allocation based on actual usage
- [ ] Plan feature enhancements
- [ ] Update monitoring thresholds based on baseline