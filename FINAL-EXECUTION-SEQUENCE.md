# Final Execution Sequence - ScholarLink Billing Portal Option 1

## Ready to Execute - Complete Command Sequence

### Step 1: Apply Kubernetes Ingresses
```bash
kubectl -n scholarlink-prod apply -f deployment/billing/billing-webhook-ingress.yaml
kubectl -n scholarlink-prod apply -f deployment/billing/billing-redirect-ingress.yaml
kubectl -n scholarlink-prod get ingress billing-webhook billing-redirect
```

### Step 2: Get Load Balancer FQDN
```bash
LB_FQDN=$(kubectl -n scholarlink-prod get ingress billing-redirect -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Load Balancer FQDN: $LB_FQDN"
```

### Step 3: Create DNS CNAME Record
**In your scholarlink.app DNS zone:**
```
Host/Name: billing
Type: CNAME
Value: $LB_FQDN
TTL: 300
```
**Important**: If using Cloudflare, set to "DNS only" (gray cloud) until certificate is Ready.

### Step 4: Monitor Activation
```bash
./deployment/billing/dns-activation-monitor.sh
```
This tracks: DNS propagation → Certificate issuance → HTTPS validation

### Step 5: Manual Verification Commands

**DNS Resolution:**
```bash
dig +short billing.scholarlink.app @1.1.1.1
```

**Certificate Status:**
```bash
kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls -w
```

**User Redirect Test (should return 301):**
```bash
curl -I https://billing.scholarlink.app
# Expected: HTTP/2 301
# Location: https://app.scholarlink.app/account/billing
```

**Webhook Preservation Test (should NOT redirect):**
```bash
curl -I https://billing.scholarlink.app/webhooks/stripe
# Expected: HTTP/2 200 from billing-api service
```

### Step 6: Update Application Configuration
```bash
VITE_BILLING_PORTAL_URL=https://app.scholarlink.app/account/billing
```
Deploy the UI update (feature flag can remain unchanged).

### Step 7: Stripe Webhook Verification
- **Endpoint unchanged**: https://billing.scholarlink.app/webhooks/stripe
- **Test**: Send test event or perform $5 purchase to confirm 200 response + idempotency

## Expected Results

### ✅ Webhook Behavior
- `billing.scholarlink.app/webhooks/stripe` → Direct to billing-api service (no redirect)
- Stripe webhook delivery continues unchanged
- All existing webhook functionality preserved

### ✅ User Redirect Behavior
- `billing.scholarlink.app/` → 301 redirect to `app.scholarlink.app/account/billing`
- `billing.scholarlink.app/any/path?query=value` → 301 to `app.scholarlink.app/account/billing/any/path?query=value`
- Query parameters preserved with $request_uri

### ✅ Security & Infrastructure
- Single SSL certificate for billing.scholarlink.app
- Let's Encrypt automatic renewal
- Professional domain maintained
- Reduced infrastructure complexity

## Fast Rollback Options

**Disable redirect entirely:**
```bash
kubectl -n scholarlink-prod delete ingress billing-redirect
```

**Change to temporary redirect:**
```bash
kubectl -n scholarlink-prod annotate ingress billing-redirect \
  nginx.ingress.kubernetes.io/permanent-redirect-code="302" --overwrite
```

## Timeline Expectations

- **Ingress creation**: Immediate
- **Load balancer ready**: 2-3 minutes
- **DNS propagation**: 5-10 minutes
- **Certificate issuance**: 2-5 minutes after DNS
- **Full operation**: 10-15 minutes total

## Architecture Achieved

```
┌─────────────────────────────────┐
│ billing.scholarlink.app         │
├─────────────────────────────────┤
│ /webhooks/stripe → billing-api  │ ← Preserved for Stripe
│ /*              → 301 redirect  │ ← Users go to in-app billing
└─────────────────────────────────┘
                   │
                   ▼
        app.scholarlink.app/account/billing
```

**Benefits Realized:**
- Stripe webhooks secure and unchanged
- Users get integrated billing experience
- Professional domain with proper redirects  
- Single certificate, simplified ops

---

**Status**: Ready for immediate execution
**Risk**: Minimal - comprehensive testing completed
**Impact**: Enhanced user experience + simplified infrastructure

**Execute the commands above in sequence, then run the monitoring script to watch the activation in real-time.**