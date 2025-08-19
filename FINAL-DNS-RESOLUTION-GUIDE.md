# Final DNS Resolution Guide - ScholarLink Billing Portal

## Current Status
All Kubernetes manifests are prepared and ready for deployment. Since I cannot execute kubectl commands from this development environment, you'll need to run them on your cluster.

## Exact Execution Sequence

### 1. Apply Ingress Manifests
```bash
kubectl -n scholarlink-prod apply -f deployment/billing/billing-webhook-ingress.yaml
kubectl -n scholarlink-prod apply -f deployment/billing/billing-redirect-ingress.yaml
kubectl -n scholarlink-prod get ingress billing-webhook billing-redirect
```

### 2. Get Load Balancer Details
```bash
# Try hostname first
LB_FQDN=$(kubectl -n scholarlink-prod get ingress billing-redirect -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Hostname: $LB_FQDN"

# If empty, try IP
if [ -z "$LB_FQDN" ]; then
    LB_IP=$(kubectl -n scholarlink-prod get ingress billing-redirect -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    echo "IP: $LB_IP"
fi
```

### 3. Create DNS Record

**If you got a hostname (FQDN):**
```
Host: billing
Type: CNAME
Value: <LB_FQDN>
TTL: 300
```

**If you got an IP:**
```
Host: billing
Type: A
Value: <LB_IP>
TTL: 300
```

### 4. Monitor Activation
```bash
./deployment/billing/dns-activation-monitor.sh
```

### 5. Comprehensive Validation
```bash
./validate-activation.sh
```

## Expected "Good" Results

### DNS Resolution
```bash
$ dig +short billing.scholarlink.app @1.1.1.1
your-load-balancer-fqdn.amazonaws.com
```

### Certificate Ready
```bash
$ kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls
NAME                          READY   SECRET                         AGE
billing-scholarlink-app-tls   True    billing-scholarlink-app-tls   5m
```

### User Redirect Working
```bash
$ curl -I https://billing.scholarlink.app
HTTP/2 301
location: https://app.scholarlink.app/account/billing
```

### Webhook Preserved (No Redirect)
```bash
$ curl -I https://billing.scholarlink.app/webhooks/stripe
HTTP/2 200
# OR HTTP/2 404 (but NOT 301/302)
```

## Configuration Files Ready

All required files are created and verified:

✅ `deployment/billing/billing-webhook-ingress.yaml`  
✅ `deployment/billing/billing-redirect-ingress.yaml`  
✅ `deployment/billing/dns-activation-monitor.sh`  
✅ `validate-activation.sh`  
✅ `quick-activation.sh`  

## Architecture Achieved

```
billing.scholarlink.app/webhooks/stripe → billing-api (preserved)
billing.scholarlink.app/*              → 301 → app.scholarlink.app/account/billing
```

## Troubleshooting Commands

**If load balancer not ready:**
```bash
kubectl -n scholarlink-prod describe ingress billing-redirect
```

**If DNS not resolving:**
```bash
# Check your DNS provider's propagation
nslookup billing.scholarlink.app
# Verify record was created correctly
```

**If certificate pending:**
```bash
kubectl -n scholarlink-prod describe certificate billing-scholarlink-app-tls
kubectl -n scholarlink-prod get challenges,orders
```

**If webhook redirecting incorrectly:**
```bash
kubectl -n scholarlink-prod describe ingress billing-webhook
# Ensure /webhooks/stripe path has no redirect annotations
```

## Post-Activation Steps

1. **Update App Configuration:**
   ```bash
   VITE_BILLING_PORTAL_URL=https://app.scholarlink.app/account/billing
   ```

2. **Test Stripe Webhook:**
   - Send test event or $5 purchase
   - Verify 2xx response and ledger crediting
   - Confirm idempotency on retry

3. **Monitor Health:**
   - Watch certificate auto-renewal
   - Monitor redirect performance
   - Track webhook delivery rates

---

**Status**: All configurations ready for immediate deployment. Execute the commands above on your Kubernetes cluster and share outputs for validation.