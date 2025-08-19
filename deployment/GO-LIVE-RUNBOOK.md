# ScholarLink Production Go-Live Runbook

**Deployment Target**: Kubernetes with External Secrets Operator  
**JWT Algorithm**: RS256 (4096-bit RSA keys)  
**Secret Manager**: AWS Secrets Manager  
**Domain**: scholarlink.app (with subdomains)  
**TLS**: Let's Encrypt via cert-manager  

## Pre-Deployment Checklist

### Infrastructure Requirements
- [ ] Kubernetes cluster running (EKS/GKE/AKS recommended)
- [ ] NGINX Ingress Controller installed
- [ ] cert-manager installed and configured
- [ ] External Secrets Operator deployed
- [ ] AWS IAM roles configured for External Secrets access
- [ ] Domain DNS pointing to ingress load balancer

### Secret Generation and Storage
- [ ] Run `./scripts/generate-production-secrets.sh` to create JWT keys
- [ ] Run `./deployment/scripts/setup-aws-secrets.sh` to populate AWS Secrets Manager
- [ ] Verify all secrets created in AWS console
- [ ] Test External Secrets Operator can read secrets

## Deployment Steps

### Step 1: Namespace and RBAC Setup
```bash
# Create namespace with security labels
kubectl apply -f deployment/kubernetes/external-secrets.yaml

# Verify namespace created
kubectl get namespace scholarlink-prod
```

### Step 2: TLS Certificate Setup
```bash
# Apply certificate configuration
kubectl apply -f deployment/kubernetes/certificates.yaml

# Wait for certificate to be issued (may take 2-5 minutes)
kubectl wait --for=condition=Ready certificate/scholarlink-tls -n scholarlink-prod --timeout=300s

# Verify certificate
kubectl describe certificate scholarlink-tls -n scholarlink-prod
```

### Step 3: External Secrets Deployment
```bash
# Deploy external secrets configuration
kubectl apply -f deployment/kubernetes/external-secrets.yaml

# Wait for secrets to sync (30-60 seconds)
sleep 60

# Verify all secrets are created and populated
kubectl get secrets -n scholarlink-prod
kubectl describe secret scholarlink-database -n scholarlink-prod
kubectl describe secret scholarlink-app-secrets -n scholarlink-prod
kubectl describe secret scholarlink-jwt-keys -n scholarlink-prod
kubectl describe secret scholarlink-external -n scholarlink-prod
```

### Step 4: Application Deployment
```bash
# Deploy main application
kubectl apply -f deployment/kubernetes/production-deployment.yaml

# Wait for deployment to be ready
kubectl wait --for=condition=Available deployment/scholarlink-app -n scholarlink-prod --timeout=300s

# Verify pods are running
kubectl get pods -n scholarlink-prod
kubectl describe deployment scholarlink-app -n scholarlink-prod
```

### Step 5: Ingress and Network Setup
```bash
# Deploy ingress configuration
kubectl apply -f deployment/kubernetes/ingress.yaml

# Wait for ingress to get external IP
kubectl wait --for=jsonpath='{.status.loadBalancer.ingress}' ingress/scholarlink-ingress -n scholarlink-prod --timeout=300s

# Get ingress IP
kubectl get ingress scholarlink-ingress -n scholarlink-prod
```

## Post-Deployment Verification

### Health Checks
```bash
# Test health endpoint
curl -f https://scholarlink.app/health

# Expected response:
# {
#   "status": "ok", 
#   "database": "connected",
#   "agent_id": "student-pilot",
#   "version": "1.0.0",
#   "capabilities": [...]
# }
```

### Security Verification
```bash
# Test security headers
curl -I https://scholarlink.app/health

# Verify headers present:
# - Strict-Transport-Security
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Content-Security-Policy

# Test rate limiting
for i in {1..10}; do curl -s -o /dev/null -w "%{http_code}\n" https://scholarlink.app/api/auth/user; done

# Should see 429 (Too Many Requests) after several requests
```

### Authentication Flow Test
```bash
# Test authentication redirect
curl -L https://scholarlink.app/api/login

# Should redirect to Replit OAuth
```

### Agent Bridge Verification
```bash
# Test agent capabilities (should require auth)
curl -v https://agent.scholarlink.app/agent/capabilities

# Expected: 401 Unauthorized (correct - requires Bearer token)
```

### Database Connectivity
```bash
# Check database migrations applied
kubectl logs -l app=scholarlink -n scholarlink-prod | grep -i migration

# Test database operations via health endpoint
curl https://scholarlink.app/health | jq .database

# Expected: "connected"
```

## Monitoring Setup

### Application Metrics
```bash
# Verify Prometheus scraping (if configured)
curl https://scholarlink.app/metrics

# Check key metrics:
# - http_requests_total
# - http_request_duration_seconds  
# - process_memory_usage
# - database_connections_active
```

### Pod Health Monitoring
```bash
# Check all pods are healthy
kubectl get pods -n scholarlink-prod -o wide

# Check HPA is working
kubectl get hpa -n scholarlink-prod

# Check resource usage
kubectl top pods -n scholarlink-prod
```

## Rollback Procedures

### Emergency Rollback
```bash
# Quick rollback to previous version
kubectl rollout undo deployment/scholarlink-app -n scholarlink-prod

# Check rollback status
kubectl rollout status deployment/scholarlink-app -n scholarlink-prod
```

### Complete Environment Reset
```bash
# Remove all resources (DANGEROUS - production data loss!)
kubectl delete namespace scholarlink-prod

# Redeploy from clean state
kubectl apply -f deployment/kubernetes/
```

## Key Rotation Plan

### JWT Key Rotation (Quarterly)
```bash
# 1. Generate new keys
./scripts/generate-production-secrets.sh

# 2. Update AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id scholarlink/prod/jwt \
  --secret-string "$(cat new-jwt-keys.json)"

# 3. Wait for External Secrets to sync (15-60 minutes)
kubectl get externalsecrets -n scholarlink-prod

# 4. Rolling restart deployment
kubectl rollout restart deployment/scholarlink-app -n scholarlink-prod
```

### Database Password Rotation
```bash
# 1. Update database password in RDS/managed database
# 2. Update AWS Secrets Manager
# 3. Restart pods to pick up new credentials
kubectl rollout restart deployment/scholarlink-app -n scholarlink-prod
```

## Troubleshooting Guide

### Common Issues

**Pods CrashLooping**
```bash
# Check logs
kubectl logs -l app=scholarlink -n scholarlink-prod --tail=100

# Check resource constraints
kubectl describe pods -l app=scholarlink -n scholarlink-prod

# Common causes:
# - Database connection failure
# - Missing secrets
# - OOM (increase memory limits)
```

**Certificate Issues**
```bash
# Check certificate status
kubectl describe certificate scholarlink-tls -n scholarlink-prod

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Common causes:
# - DNS not pointing to cluster
# - Rate limiting from Let's Encrypt
# - Firewall blocking port 80 for HTTP01 challenge
```

**External Secrets Not Syncing**
```bash
# Check External Secrets status
kubectl describe externalsecret -n scholarlink-prod

# Check operator logs
kubectl logs -n external-secrets-system deployment/external-secrets

# Common causes:
# - IAM permissions incorrect
# - AWS credentials expired
# - Secret names don't match
```

**Database Connection Failures**
```bash
# Test database connectivity from pod
kubectl exec -it deployment/scholarlink-app -n scholarlink-prod -- sh
# Inside pod: pg_isready -h $PGHOST -p $PGPORT -U $PGUSER

# Check database secrets
kubectl get secret scholarlink-database -n scholarlink-prod -o yaml

# Common causes:
# - Incorrect DATABASE_URL format
# - Network policy blocking egress
# - Database server not accepting connections
```

## Performance Tuning

### Horizontal Pod Autoscaler
```bash
# Monitor HPA decisions
kubectl describe hpa scholarlink-hpa -n scholarlink-prod

# Adjust thresholds if needed:
# - CPU target: 70% (increase for cost optimization)
# - Memory target: 80% (decrease for stability)
# - Min replicas: 3 (for high availability)
# - Max replicas: 20 (for burst capacity)
```

### Resource Optimization
```bash
# Monitor actual resource usage
kubectl top pods -n scholarlink-prod

# Adjust requests/limits based on usage:
# - Requests: Set to 80% of normal usage
# - Limits: Set to 150% of peak usage
```

## Success Criteria

### Go-Live Approval Checklist
- [ ] All health checks passing for 30+ minutes
- [ ] TLS certificate valid and auto-renewing
- [ ] Security headers present and correct
- [ ] Rate limiting functioning properly
- [ ] Authentication flow working end-to-end
- [ ] Database connectivity stable
- [ ] Agent Bridge endpoints secured
- [ ] Monitoring and alerting operational
- [ ] Backup and disaster recovery tested
- [ ] Load testing completed successfully

### Performance Targets
- [ ] Response time p95 < 500ms
- [ ] Error rate < 0.1%
- [ ] Uptime > 99.9%
- [ ] Database connection pool utilization < 80%
- [ ] Memory usage < 70% of limits
- [ ] CPU usage < 60% of limits

---

**Production deployment ready when all checkboxes are completed and verified.**