# Production Deployment Guide - ScholarLink Billing Portal

## Current Status

**Infrastructure**: ✅ Complete and ready  
**Application**: ✅ Configured for billing.scholarlink.app  
**SSL Configuration**: ✅ cert-manager ready for automatic issuance  
**Required**: DNS record creation in scholarlink.app zone  

## Critical Next Step: DNS Configuration

### Create DNS Record

In your DNS provider where `scholarlink.app` is hosted, create:

```
Name/Host: billing
Type: CNAME  
Value: <your-kubernetes-ingress-load-balancer-fqdn>
TTL: 300
```

### Provider Examples

**AWS Route53:**
```bash
aws route53 change-resource-record-sets --hosted-zone-id ZXXXXXXXXXXXX --change-batch '{
  "Changes":[{
    "Action":"UPSERT",
    "ResourceRecordSet":{
      "Name":"billing.scholarlink.app",
      "Type":"CNAME", 
      "TTL":300,
      "ResourceRecords":[{"Value":"your-lb-fqdn.elb.amazonaws.com"}]
    }
  }]
}'
```

**Cloudflare:**
- Set to "DNS only" (gray cloud) during certificate issuance
- Can enable proxy after SSL certificate is active

**Google Cloud DNS:**
```bash
gcloud dns record-sets transaction start --zone=scholarlink
gcloud dns record-sets transaction add your-lb-fqdn --name=billing.scholarlink.app. --ttl=300 --type=CNAME --zone=scholarlink
gcloud dns record-sets transaction execute --zone=scholarlink
```

## Verification Process

### 1. DNS Resolution Check
```bash
dig +short billing.scholarlink.app @1.1.1.1
# Expected: your-load-balancer-fqdn
```

### 2. Certificate Issuance Monitor
```bash
kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls -w
# Wait for: Ready=True
```

### 3. Full Validation Suite
```bash
./deployment/billing/production-validation.sh all
```

## Post-DNS Timeline

- **DNS Propagation**: 5-10 minutes globally
- **Certificate Issuance**: 2-5 minutes after DNS resolves  
- **Full Functionality**: 10-15 minutes total

## Production Features Ready

### Billing System
- **Credit Packages**: 5 tiers ($5-$100) with progressive bonuses
- **Stripe Integration**: Live payment processing with webhooks
- **JWT Authentication**: RS256 with timing-safe operations
- **Audit Trail**: Complete transaction history and ledger

### Security
- **SSL/TLS**: Automatic Let's Encrypt certificates with auto-renewal
- **HSTS**: Strict transport security headers
- **CSP**: Content security policy protection
- **CORS**: Secure cross-origin resource sharing

### UI Integration  
- **Header Navigation**: "Billing & Credits" link
- **User Menu**: Integrated billing access
- **Mobile Responsive**: Full mobile optimization
- **Help Documentation**: Comprehensive FAQ at /help

### Monitoring
- **Health Checks**: /health and /readyz endpoints
- **Performance SLOs**: <200ms response time, <0.5% error rate
- **Certificate Monitoring**: 14-day expiry warnings
- **Webhook Monitoring**: Stripe delivery success tracking

## Post-Production Checklist

After DNS resolution and certificate issuance:

### Immediate (Day 0)
- [ ] Verify https://billing.scholarlink.app loads without warnings
- [ ] Test credit package purchase flow  
- [ ] Confirm Stripe webhooks receiving events
- [ ] Validate UTM tracking parameters

### Day 1 Operations
- [ ] Run financial reconciliation report
- [ ] Monitor performance metrics vs SLOs
- [ ] Review SSL certificate auto-renewal setup
- [ ] Collect user feedback on improved security

### Ongoing
- [ ] Monthly performance baseline reviews
- [ ] Quarterly security audits  
- [ ] SSL certificate renewal monitoring (60 days advance)
- [ ] Feature enhancement planning based on usage analytics

## Troubleshooting

### DNS Issues
- **NXDOMAIN**: DNS record not created or incorrect name
- **Wrong Target**: Verify load balancer FQDN is correct
- **Propagation**: Wait additional time or check different resolvers

### Certificate Issues
- **Pending**: Usually waiting for DNS resolution
- **Failed**: Check ACME challenge accessibility
- **Cloudflare**: Ensure "DNS only" during issuance

### Application Issues
- **503 Service Unavailable**: Check Kubernetes pod status
- **CORS Errors**: Verify allowlist includes billing.scholarlink.app
- **CSP Violations**: Check console for blocked resources

## Success Metrics

### Technical KPIs
- **Uptime**: >99.9%
- **Response Time**: <200ms p95
- **Error Rate**: <0.5%
- **Certificate Grade**: A+ SSL rating

### Business KPIs
- **Conversion Rate**: Visits to purchases
- **User Satisfaction**: Reduced security warnings
- **Payment Success**: >98% completion rate
- **Support Tickets**: Reduced SSL-related issues

---

**The ScholarLink billing system is production-ready. Once DNS resolves, all features will be immediately operational with enterprise-grade security and comprehensive monitoring.**