# Production DNS Setup - billing.scholarlink.app

## Required DNS Configuration

Create this exact DNS record in your `scholarlink.app` DNS zone:

```
Name/Host: billing
Type: CNAME
Value: <your-kubernetes-ingress-load-balancer-fqdn>
TTL: 300
```

## Provider-Specific Commands

### Route53 (AWS CLI)
```bash
export ZONEID=ZXXXXXXXXXXXX
export LB_FQDN=a1b2c3d4e5f6abcdef.elb.amazonaws.com

aws route53 change-resource-record-sets --hosted-zone-id $ZONEID --change-batch '{
  "Changes":[{
    "Action":"UPSERT",
    "ResourceRecordSet":{
      "Name":"billing.scholarlink.app",
      "Type":"CNAME",
      "TTL":300,
      "ResourceRecords":[{"Value":"'$LB_FQDN'"}]
    }
  }]
}'
```

### Cloudflare
```bash
# Set DNS record to "DNS only" (gray cloud) during certificate issuance
# Can enable proxy (orange cloud) after SSL certificate is issued
```

### Google Cloud DNS
```bash
gcloud dns record-sets transaction start --zone=scholarlink
gcloud dns record-sets transaction add $LB_FQDN --name=billing.scholarlink.app. --ttl=300 --type=CNAME --zone=scholarlink
gcloud dns record-sets transaction execute --zone=scholarlink
```

## Verification Commands

### 1. DNS Resolution Check
```bash
dig +short billing.scholarlink.app @1.1.1.1
# Should return: your-load-balancer-fqdn
```

### 2. Certificate Status Check  
```bash
kubectl -n scholarlink-prod get certificate,order,challenge
kubectl -n scholarlink-prod describe certificate billing-scholarlink-app-tls
# Wait for: Ready=True
```

### 3. Final Access Test
```bash
curl -sSI https://billing.scholarlink.app | head -n 5
# Should return: HTTP/2 200 with valid SSL headers
```

## Automated Wait/Check Script
```bash
bash -c 'until dig +short billing.scholarlink.app @1.1.1.1; do echo "waiting for DNS…"; sleep 10; done; kubectl -n scholarlink-prod wait --for=condition=Ready certificate/billing-scholarlink-app-tls --timeout=10m; curl -I https://billing.scholarlink.app'
```

## Post-DNS Configuration

### Update Stripe Webhook
- **Endpoint**: https://billing.scholarlink.app/webhooks/stripe  
- **Update STRIPE_WEBHOOK_SECRET** in AWS Secrets Manager
- **Test webhook delivery** with live event

### Run Production Validation
```bash
./deployment/billing/go-live-commands.sh smoke
./deployment/billing/production-validation.sh all
```

## Troubleshooting

### Still NXDOMAIN after 15 minutes?
- **Check record name**: Must be `billing` (not `billing.scholarlink`)
- **Verify zone**: Record created in `scholarlink.app` zone
- **Test different resolvers**: `@8.8.8.8`, `@1.1.1.1`

### DNS resolves but certificate not ready?
- **Cloudflare**: Ensure "DNS only" (gray cloud) during issuance
- **Ingress**: Verify host matches in Kubernetes ingress config
- **ACME challenge**: Check challenge logs for HTTP-01 access

## Expected Timeline
- **DNS Creation**: Immediate
- **Global Propagation**: 5-10 minutes
- **Certificate Issuance**: 2-5 minutes after DNS
- **Total**: 10-15 minutes

## Ready State Confirmation

When everything is working:
```bash
# DNS resolves
dig +short billing.scholarlink.app @1.1.1.1

# Certificate ready  
kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls
# Status: Ready=True

# HTTPS accessible
curl -I https://billing.scholarlink.app
# Response: 200 OK with valid certificate headers

# No browser warnings when visiting https://billing.scholarlink.app
```

**Once all checks pass, the billing portal will be fully operational with valid SSL and all features active.**