# Billing Portal Domain Migration Guide

## Issue Resolution

The SSL certificate error `NET::ERR_CERT_COMMON_NAME_INVALID` occurred because we cannot issue SSL certificates for `billing.student-pilot.replit.app` (replit.app is not our domain).

**Solution**: Migrate to `billing.scholarlink.app` domain with proper SSL certificate management.

## Migration Steps

### 1. DNS Configuration (Required First)

Create the following DNS record in your domain provider:

```
Record Type: CNAME
Name: billing.scholarlink
Value: <your-kubernetes-ingress-load-balancer-dns>
TTL: 300 (5 minutes)
```

**Examples of Load Balancer DNS:**
- AWS ALB: `abc123-123456789.us-west-2.elb.amazonaws.com`
- GCP GLB: `gcp-lb-123456.googleapis.com` 
- Azure: `aks-agentpool-12345-vmss.westus2.cloudapp.azure.com`

### 2. SSL Certificate & Ingress Setup

Apply the Kubernetes configuration:

```bash
kubectl apply -f deployment/billing/certificate-config.yaml
```

This creates:
- SSL Certificate via Let's Encrypt
- Primary Ingress for production traffic
- Canary Ingress for gradual rollouts

### 3. Wait for Certificate Provisioning

Monitor certificate status:

```bash
# Check certificate status
kubectl -n scholarlink-prod get certificate,order,challenge | grep billing

# Verify certificate is ready
kubectl -n scholarlink-prod describe certificate billing-scholarlink-app-tls

# Wait for Ready=True status
```

### 4. Execute Domain Migration

Run the automated migration script:

```bash
./deployment/billing/update-domain.sh
```

This script:
- ✅ Applies SSL certificate configuration
- ✅ Waits for certificate to be ready
- ✅ Updates all application configuration files
- ✅ Validates SSL certificate accessibility
- ✅ Restarts application with new domain

### 5. Validation

Verify the migration:

```bash
# Test SSL certificate
curl -sSI https://billing.scholarlink.app | head -n 5

# Health checks
curl -sf https://billing.scholarlink.app/health
curl -sf https://billing.scholarlink.app/readyz

# Run validation suite
node final-billing-validation.js
```

## Updated Configuration

### Environment Variables
```bash
VITE_BILLING_PORTAL_URL=https://billing.scholarlink.app
VITE_BILLING_LINK_ENABLED=true
```

### Application Configuration
- All UI links now point to `https://billing.scholarlink.app`
- UTM tracking parameters preserved
- Security attributes maintained (`target="_blank"`, `rel="noopener noreferrer"`)
- Feature flag control operational

## Post-Migration Checklist

- [ ] DNS record created and propagated (5-10 minutes)
- [ ] SSL certificate issued and ready (`Ready=True`)
- [ ] Application configuration updated
- [ ] All UI links functional in browser
- [ ] No SSL certificate warnings
- [ ] UTM tracking parameters working
- [ ] Feature flag toggle operational
- [ ] Help documentation accessible

## Troubleshooting

### Certificate Issues
```bash
# Check ACME challenge status
kubectl -n scholarlink-prod get challenges

# Review certificate events
kubectl -n scholarlink-prod describe certificate billing-scholarlink-app-tls

# Check ingress annotations
kubectl -n scholarlink-prod describe ingress billing-portal-ingress
```

### DNS Issues
```bash
# Verify DNS propagation
nslookup billing.scholarlink.app
dig billing.scholarlink.app CNAME

# Test connectivity
curl -I https://billing.scholarlink.app
```

## Go-Live Sequence

After successful domain migration:

```bash
# Run full deployment sequence
./deployment/billing/go-live-commands.sh full

# Monitor canary rollout: 1% → 5% → 20% → 50% → 100%
```

## Rollback Plan

If issues occur during migration:

```bash
# Rollback application configuration
git checkout HEAD~1 -- client/src/lib/config.ts .env.example

# Disable billing links temporarily
export VITE_BILLING_LINK_ENABLED=false

# Restart application
kubectl -n scholarlink-prod rollout restart deployment/scholarlink-app
```

## Security Notes

- ✅ New domain uses valid SSL certificate (Let's Encrypt)
- ✅ All security headers maintained
- ✅ No credentials exposed in URLs
- ✅ UTM tracking preserved for analytics
- ✅ Feature flag control for safe rollouts