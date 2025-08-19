# ScholarLink Billing Portal Execution Plan - Option 1

## Step-by-Step Execution Status

### ✓ Step 1: Apply Kubernetes Configuration
```bash
./deployment/billing/apply-redirect-setup.sh
```
**Status**: Applied
- billing-webhook ingress: Preserves /webhooks/stripe
- billing-redirect ingress: 301 redirects all other paths

### ⏳ Step 2: Get Load Balancer FQDN
```bash
kubectl -n scholarlink-prod get ingress billing-redirect -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```
**Status**: Waiting for load balancer provisioning

### ⏳ Step 3: Create DNS Record
**Format**:
```
Host/Name: billing
Type: CNAME
Value: <load-balancer-fqdn>
TTL: 300
```
**Status**: Waiting for load balancer FQDN

### ⏳ Step 4: Monitor DNS & Certificate
```bash
./deployment/billing/dns-activation-monitor.sh
```
**Status**: Ready to run after DNS creation

### ⏳ Step 5: Validate Behavior
**Expected Results**:
- `curl -I https://billing.scholarlink.app/webhooks/stripe` → 200 (no redirect)
- `curl -I https://billing.scholarlink.app` → 301 → app.scholarlink.app/account/billing

### ⏳ Step 6: Update App Configuration
```bash
VITE_BILLING_PORTAL_URL=https://app.scholarlink.app/account/billing
```

### ⏳ Step 7: Stripe Verification
- Webhook URL unchanged: https://billing.scholarlink.app/webhooks/stripe
- Test delivery should work normally

## Configuration Applied

### Webhook Ingress (Preserves Stripe)
- Path: `/webhooks/stripe`
- Backend: billing-api service
- No redirect applied

### Redirect Ingress (User Traffic)
- Path: `/` (catch-all)
- Action: 301 redirect to https://app.scholarlink.app/account/billing
- Query strings preserved with $request_uri

## Next Action Required

1. **Get Load Balancer FQDN** (once available)
2. **Create DNS CNAME record** with your provider
3. **Run monitoring script** to watch activation

## Verification Commands Ready

```bash
# DNS propagation
dig +short billing.scholarlink.app @1.1.1.1

# Certificate status  
kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls -w

# Webhook test (should NOT redirect)
curl -I https://billing.scholarlink.app/webhooks/stripe

# User redirect test (should redirect)
curl -I https://billing.scholarlink.app

# Full monitoring
./deployment/billing/dns-activation-monitor.sh
```

**The infrastructure is configured and ready for DNS activation!**