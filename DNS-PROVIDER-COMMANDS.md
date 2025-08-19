# DNS Provider Commands - ScholarLink Billing Portal Activation

## Prerequisites

First, get your Kubernetes Load Balancer FQDN:
```bash
export LB_FQDN=$(kubectl -n scholarlink-prod get ingress billing-scholarlink-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Load Balancer FQDN: $LB_FQDN"
```

## Provider-Specific Commands

### AWS Route53
```bash
# Set your Route53 hosted zone ID
export ZONE_ID=ZXXXXXXXXXXXX  # Replace with your scholarlink.app zone ID
export LB_FQDN=your-load-balancer-fqdn.elb.amazonaws.com

# Create the CNAME record
aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch '{
  "Comment": "Create billing CNAME for ScholarLink",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "billing.scholarlink.app",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "'$LB_FQDN'"}]
    }
  }]
}'
```

### Cloudflare API
```bash
# Set your Cloudflare credentials
export CF_ZONE_ID=your-cloudflare-zone-id
export CF_TOKEN=your-cloudflare-api-token
export LB_FQDN=your-load-balancer-fqdn

# Create CNAME record (DNS only - gray cloud)
curl -sX POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "billing.scholarlink.app",
    "content": "'$LB_FQDN'",
    "ttl": 300,
    "proxied": false,
    "comment": "ScholarLink billing portal"
  }'
```

### Google Cloud DNS
```bash
# Set your Cloud DNS zone name
export ZONE=scholarlink  # Your managed zone name
export LB_FQDN=your-load-balancer-fqdn

# Create the CNAME record
gcloud dns record-sets transaction start --zone=$ZONE
gcloud dns record-sets transaction add $LB_FQDN \
  --name=billing.scholarlink.app. \
  --ttl=300 \
  --type=CNAME \
  --zone=$ZONE
gcloud dns record-sets transaction execute --zone=$ZONE
```

### DigitalOcean DNS
```bash
# Set your DigitalOcean API token
export DO_TOKEN=your-digitalocean-token
export LB_FQDN=your-load-balancer-fqdn

# Create CNAME record
curl -X POST "https://api.digitalocean.com/v2/domains/scholarlink.app/records" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DO_TOKEN" \
  -d '{
    "type": "CNAME",
    "name": "billing",
    "data": "'$LB_FQDN'",
    "ttl": 300
  }'
```

### Namecheap DNS (Manual Portal)
1. Log into Namecheap Dashboard
2. Go to Domain List → scholarlink.app → Manage
3. Navigate to Advanced DNS tab
4. Add new record:
   - **Type**: CNAME Record
   - **Host**: billing
   - **Value**: your-load-balancer-fqdn
   - **TTL**: 5 min (300 seconds)

### GoDaddy DNS (Manual Portal)
1. Log into GoDaddy DNS Management
2. Select scholarlink.app domain
3. Add record:
   - **Type**: CNAME
   - **Name**: billing
   - **Value**: your-load-balancer-fqdn
   - **TTL**: 5 minutes

### Generic DNS Portal Instructions
For any DNS provider portal:
```
Record Type: CNAME
Host/Name: billing
Target/Value: your-load-balancer-fqdn
TTL: 300 (5 minutes)
```

**Important**: Use `billing` as the host name, NOT `billing.scholarlink`

## Verification Commands

### 1. DNS Propagation Check
```bash
# Check multiple DNS servers
dig +short billing.scholarlink.app @1.1.1.1
dig +short billing.scholarlink.app @8.8.8.8
dig +short billing.scholarlink.app @1.0.0.1

# Should return your load balancer FQDN
```

### 2. Real-Time Monitoring
```bash
# Start automated monitoring
./deployment/billing/dns-activation-monitor.sh

# This will track:
# - DNS propagation across multiple servers
# - Let's Encrypt certificate issuance
# - HTTPS accessibility
# - Full production validation
```

### 3. Manual Certificate Check
```bash
# Watch certificate status
kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls -w

# Check certificate details
kubectl -n scholarlink-prod describe certificate billing-scholarlink-app-tls
```

### 4. HTTPS Access Test
```bash
# Test secure access
curl -I https://billing.scholarlink.app

# Expected: HTTP/2 200 with security headers
```

## Provider-Specific Notes

### Cloudflare
- **Critical**: Set record to "DNS only" (gray cloud) initially
- Can enable proxy after certificate is issued
- Avoid "orange cloud" during Let's Encrypt validation

### AWS Route53
- Ensure IAM permissions for route53:ChangeResourceRecordSets
- Use hosted zone ID, not domain name
- Propagation typically fastest (2-5 minutes)

### Google Cloud DNS
- Requires gcloud CLI authentication
- Use managed zone name, not domain
- Add trailing dot to FQDN in commands

### DigitalOcean
- API token needs write access to DNS
- Records appear immediately in API
- Propagation usually 5-10 minutes

## Troubleshooting

### Common Issues
- **Wrong host name**: Use `billing` not `billing.scholarlink`
- **Cloudflare proxy**: Disable orange cloud during cert issuance
- **CAA records**: Ensure scholarlink.app allows letsencrypt.org
- **TTL too high**: Use 300 seconds for faster propagation

### Emergency Rollback
```bash
# Remove CNAME record to stop traffic
# Use provider-specific delete commands or portal
```

---

**Next Steps After DNS Creation:**
1. Run `./deployment/billing/dns-activation-monitor.sh`
2. Wait for certificate Ready=True (2-5 minutes)
3. Test https://billing.scholarlink.app access
4. Validate Stripe webhook delivery
5. Perform test credit purchase

**The ScholarLink billing portal will be live within 10-15 minutes of DNS record creation!**