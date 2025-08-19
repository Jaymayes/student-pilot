# Option 1: 301 Redirect Setup - ScholarLink Billing Portal

## Overview

This configuration implements a smart 301 redirect approach that:
- **Preserves Stripe webhooks** on billing.scholarlink.app/webhooks/stripe
- **Redirects user traffic** to the in-app billing route at app.scholarlink.app/account/billing
- **Maintains SSL certificates** and enterprise security

## Architecture

```
billing.scholarlink.app/webhooks/stripe → billing-api service (no redirect)
billing.scholarlink.app/*              → 301 redirect to app.scholarlink.app/account/billing
```

## Implementation

### 1. Apply Kubernetes Configuration
```bash
# Apply both ingress configurations
./deployment/billing/apply-redirect-setup.sh
```

This creates two ingress objects:
- **billing-webhook**: Handles `/webhooks/stripe` without redirect
- **billing-redirect**: 301 redirects all other paths

### 2. DNS Configuration
Create the DNS record as planned:
```
Host: billing
Type: CNAME
Value: <your-kubernetes-ingress-lb-fqdn>
TTL: 300
```

### 3. Application Configuration Updates
Update your environment variables:
```bash
# Frontend configuration
VITE_BILLING_PORTAL_URL=https://app.scholarlink.app/account/billing

# Stripe webhook remains unchanged
STRIPE_WEBHOOK_ENDPOINT=https://billing.scholarlink.app/webhooks/stripe
```

## Verification Commands

### Test Webhook Preservation
```bash
# Should return 200 from billing-api service (no redirect)
curl -I https://billing.scholarlink.app/webhooks/stripe

# Expected response:
# HTTP/2 200
# (normal API response, no Location header)
```

### Test User Redirect
```bash
# Should return 301 redirect
curl -I https://billing.scholarlink.app

# Expected response:
# HTTP/2 301
# Location: https://app.scholarlink.app/account/billing

# Test with additional path
curl -I https://billing.scholarlink.app/some/path

# Expected response:
# HTTP/2 301
# Location: https://app.scholarlink.app/account/billing/some/path
```

### Test SSL Certificate
```bash
# Verify certificate issuance
kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls

# Should show Ready=True
```

## Benefits of This Approach

### ✅ Webhook Security
- Stripe webhooks remain on secure billing.scholarlink.app domain
- No changes needed to Stripe configuration
- Maintains webhook signature validation
- Preserves audit trail and compliance

### ✅ User Experience
- Users get redirected to integrated in-app billing
- Seamless single sign-on experience
- No separate billing portal to maintain
- Consistent UI/UX with main application

### ✅ SEO & Professional Image
- billing.scholarlink.app domain remains valid
- 301 redirects preserve SEO value
- Professional domain structure maintained
- No broken links or 404 errors

### ✅ Infrastructure Simplification
- Single SSL certificate for billing.scholarlink.app
- Reduced infrastructure complexity
- Leverages existing app.scholarlink.app infrastructure
- Easier monitoring and maintenance

## Configuration Files

### Webhook Ingress (billing-webhook-ingress.yaml)
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: billing-webhook
  namespace: scholarlink-prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts: [billing.scholarlink.app]
    secretName: billing-scholarlink-app-tls
  rules:
  - host: billing.scholarlink.app
    http:
      paths:
      - path: /webhooks/stripe
        pathType: Prefix
        backend:
          service:
            name: billing-api
            port:
              number: 80
```

### Redirect Ingress (billing-redirect-ingress.yaml)
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: billing-redirect
  namespace: scholarlink-prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/permanent-redirect: https://app.scholarlink.app/account/billing$request_uri
    nginx.ingress.kubernetes.io/permanent-redirect-code: "301"
spec:
  ingressClassName: nginx
  tls:
  - hosts: [billing.scholarlink.app]
    secretName: billing-scholarlink-app-tls
  rules:
  - host: billing.scholarlink.app
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: billing-api
            port:
              number: 80
```

## Monitoring & Maintenance

### Health Checks
```bash
# Monitor certificate status
kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls -w

# Check ingress status
kubectl -n scholarlink-prod get ingress

# Verify both configurations
kubectl -n scholarlink-prod describe ingress billing-webhook
kubectl -n scholarlink-prod describe ingress billing-redirect
```

### Automated Monitoring
```bash
# Use the existing monitoring script
./deployment/billing/dns-activation-monitor.sh

# This will verify:
# - DNS resolution
# - SSL certificate issuance
# - Redirect functionality
# - Webhook accessibility
```

## Troubleshooting

### Common Issues

**Webhook not accessible:**
- Check billing-webhook ingress is applied first
- Verify service name and port match your billing-api service
- Ensure longest path match (/webhooks/stripe) takes precedence

**Redirect not working:**
- Verify billing-redirect ingress has correct destination URL
- Check nginx ingress controller is processing annotations
- Confirm permanent-redirect-code is set to "301"

**Certificate issues:**
- Ensure both ingresses reference same TLS secret
- Check cert-manager cluster issuer is configured
- Verify DNS is resolving before certificate issuance

### Rollback Plan
If issues occur, remove ingresses and revert to original:
```bash
kubectl -n scholarlink-prod delete ingress billing-webhook billing-redirect
# Then re-apply original billing portal ingress
```

## Success Criteria

### Immediate (Post-DNS)
- [ ] billing.scholarlink.app resolves to load balancer
- [ ] SSL certificate shows Ready=True
- [ ] `/webhooks/stripe` returns 200 (no redirect)
- [ ] Root path returns 301 with correct Location header

### Business Operations
- [ ] Stripe webhook delivery remains at 100%
- [ ] User billing access seamless via app.scholarlink.app
- [ ] No 404 errors or broken links
- [ ] Monitoring and alerting functional

---

**This configuration provides the optimal balance of webhook security, user experience, and infrastructure simplicity. The 301 redirect approach maintains all benefits while reducing complexity and improving the integrated user experience.**