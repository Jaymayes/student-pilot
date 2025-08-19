# ScholarLink Billing Service - Production Deployment Checklist

## 🔐 Required Secrets (AWS Secrets Manager)

### Database
- [ ] `/prod/scholarlink/billing/DATABASE_URL`
  - Format: `postgresql://billing_user:SECURE_PASSWORD@prod-postgres.cluster.amazonaws.com:5432/billing?sslmode=require&connection_limit=10`
  - Ensure TLS enabled and least-privileged user

### JWT Authentication
- [ ] `/prod/scholarlink/billing/JWT_PUBLIC_KEY` (RS256 public key)
- [ ] `/prod/scholarlink/billing/JWT_ISSUER` (https://student-pilot.replit.app)
- [ ] `/prod/scholarlink/billing/JWT_AUDIENCE` (https://billing.scholarlink.app)

### Stripe Integration
- [ ] `/prod/scholarlink/billing/STRIPE_SECRET_KEY` (live key: sk_live_...)
- [ ] `/prod/scholarlink/billing/STRIPE_WEBHOOK_SECRET` (whsec_...)

### Monitoring
- [ ] `/prod/scholarlink/billing/WEBHOOK_SHARED_SECRET` (HMAC secret)

## 🚀 Deployment Steps

### 1. Pre-deployment
```bash
# Create RDS snapshot
aws rds create-db-snapshot --db-instance-identifier billing-prod --db-snapshot-identifier billing-pre-deploy-$(date +%Y%m%d%H%M)

# Verify secrets in AWS Secrets Manager
aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `/prod/scholarlink/billing/`)]'
```

### 2. Deploy Infrastructure
```bash
# Apply External Secrets and ConfigMap
kubectl apply -f deployment/billing/external-secret.yaml

# Verify secret sync
kubectl wait --for=condition=Ready externalsecret/scholarlink-billing-secrets -n scholarlink-prod --timeout=60s
```

### 3. Database Migration
```bash
# Run pre-deployment migration
kubectl apply -f deployment/billing/migration-job.yaml
kubectl wait --for=condition=complete job/scholarlink-billing-migrate -n scholarlink-prod --timeout=300s
```

### 4. Application Deployment
```bash
# Deploy with canary support
chmod +x deployment/billing/deploy.sh
NAMESPACE="scholarlink-prod" ENABLE_CANARY="true" ./deployment/billing/deploy.sh
```

### 5. Stripe Webhook Configuration
- [ ] Create webhook endpoint: `https://billing.scholarlink.app/webhooks/stripe`
- [ ] Configure events: `payment_intent.succeeded`, `checkout.session.completed`
- [ ] Update `STRIPE_WEBHOOK_SECRET` with signing secret

## 🔍 Verification Tests

### Health Checks
- [ ] GET `https://billing.scholarlink.app/health` returns 200
- [ ] GET `https://billing.scholarlink.app/readyz` returns 200
- [ ] Prometheus metrics available at `/metrics`

### Functional Tests
- [ ] **Credit Purchase Test ($5.00)**:
  ```bash
  # Test Stripe payment flow
  curl -X POST https://billing.scholarlink.app/api/purchases \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"packageCode":"starter"}'
  
  # Verify ledger entry created
  curl https://billing.scholarlink.app/api/ledger \
    -H "Authorization: Bearer YOUR_JWT_TOKEN"
  ```

- [ ] **Usage Reconciliation Test**:
  ```bash
  curl -X POST https://billing.scholarlink.app/api/usage/reconcile \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "test-user-id",
      "model": "gpt-4o",
      "inputTokens": 1000,
      "outputTokens": 500,
      "idempotencyKey": "test-'$(date +%s)'"
    }'
  ```

- [ ] **Idempotency Test**: Retry the same reconciliation request, verify no duplicate charges

### Security Validation
- [ ] **Rate Limiting**: Verify 100 requests/minute limit enforced
- [ ] **CORS**: Verify only allowed origins accepted
- [ ] **JWT Validation**: Verify RS256 signature validation working
- [ ] **TLS**: Verify HTTPS enforced with proper headers

## 📊 Canary Deployment Progression

### Phase 1: 1% Traffic (Initial)
- [ ] Deploy with 1% canary traffic
- [ ] Monitor for 30 minutes
- [ ] Key metrics: Error rate < 0.1%, Latency p99 < 500ms

### Phase 2: 5% Traffic
```bash
kubectl patch ingress scholarlink-billing-canary -n scholarlink-prod \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"5"}}}'
```

### Phase 3: 20% Traffic
```bash
kubectl patch ingress scholarlink-billing-canary -n scholarlink-prod \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"20"}}}'
```

### Phase 4: 50% Traffic
```bash
kubectl patch ingress scholarlink-billing-canary -n scholarlink-prod \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"50"}}}'
```

### Phase 5: 100% Traffic (Complete)
```bash
kubectl patch ingress scholarlink-billing-canary -n scholarlink-prod \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary":"false"}}}'
```

## 🔧 Configuration Verification

### Environment Variables
- [ ] All secrets loaded from AWS Secrets Manager
- [ ] ConfigMap applied with production settings
- [ ] Database connection pool configured (min=2, max=10)

### Kubernetes Resources
- [ ] HPA configured (min=2, max=10, CPU target=60%)
- [ ] NetworkPolicy restricts egress to necessary services
- [ ] Security context: non-root, read-only filesystem
- [ ] Resource limits: 500m CPU, 512Mi RAM

## 📈 Monitoring Setup

### SLO Thresholds
- [ ] **Availability**: 99.9% uptime
- [ ] **Latency**: P99 < 500ms for /api/usage/reconcile
- [ ] **Error Rate**: < 0.1% for payment processing
- [ ] **Credit Reconciliation**: 100% accuracy

### Alerting Rules
- [ ] High error rate (>1% for 5 minutes)
- [ ] High latency (P99 > 1s for 5 minutes)
- [ ] Database connection failures
- [ ] Stripe webhook failures
- [ ] Credit reconciliation errors

## 🎯 Success Criteria

- [ ] **Functional**: All API endpoints respond correctly
- [ ] **Financial**: Credit purchases and usage tracking accurate
- [ ] **Security**: All security controls active and monitored
- [ ] **Performance**: SLOs maintained under production load
- [ ] **Monitoring**: Full observability with alerting configured

## 📋 Rollback Plan

If critical issues detected:

```bash
# Emergency rollback
kubectl rollout undo deployment/scholarlink-billing -n scholarlink-prod

# Database rollback (if needed)
# Restore from pre-deployment snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier billing-prod-rollback \
  --db-snapshot-identifier billing-pre-deploy-YYYYMMDDHHMM
```

## 📞 Emergency Contacts

- **Platform Team**: platform-team@scholarlink.io
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Stripe Support**: https://support.stripe.com
- **AWS Support**: Case priority: Production system down

## 📝 Post-Deployment Actions

- [ ] Update runbooks with any deployment learnings
- [ ] Schedule load testing for peak usage scenarios
- [ ] Plan next billing feature development cycle
- [ ] Archive deployment artifacts for compliance

---

**Deployment Date**: ___________
**Deployed By**: ___________
**Sign-off**: ___________