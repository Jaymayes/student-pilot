# DNS Provider Commands - ScholarLink Billing Portal

## After getting your Load Balancer FQDN, use these commands for your DNS provider:

### AWS Route53
```bash
export ZONE_ID=YOUR_HOSTED_ZONE_ID
export LB_FQDN=your-load-balancer-fqdn

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

### Cloudflare
```bash
export CF_ZONE_ID=your-cloudflare-zone-id
export CF_TOKEN=your-cloudflare-api-token
export LB_FQDN=your-load-balancer-fqdn

curl -sX POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "billing",
    "content": "'$LB_FQDN'",
    "ttl": 300,
    "proxied": false,
    "comment": "ScholarLink billing portal"
  }'
```

### Google Cloud DNS
```bash
export ZONE=scholarlink
export LB_FQDN=your-load-balancer-fqdn

gcloud dns record-sets transaction start --zone=$ZONE
gcloud dns record-sets transaction add $LB_FQDN \
  --name=billing.scholarlink.app. \
  --ttl=300 \
  --type=CNAME \
  --zone=$ZONE
gcloud dns record-sets transaction execute --zone=$ZONE
```

### DigitalOcean
```bash
export DO_TOKEN=your-digitalocean-token
export LB_FQDN=your-load-balancer-fqdn

curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DO_TOKEN" \
  -d '{
    "type": "CNAME",
    "name": "billing",
    "data": "'$LB_FQDN'",
    "ttl": 300
  }' \
  "https://api.digitalocean.com/v2/domains/scholarlink.app/records"
```

### Manual Portal Entry
```
Host/Name: billing
Type: CNAME
Value: <your-load-balancer-fqdn>
TTL: 300
```

**Important Notes:**
- For Cloudflare: Set "DNS only" (gray cloud) until certificate is issued
- For all providers: Use exactly "billing" as the host name, not "billing.scholarlink.app"
- The value should be the raw load balancer FQDN without https://