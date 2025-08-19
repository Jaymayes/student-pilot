# Final DNS Configuration Commands

## DNS Record Required

Create this exact record in your `scholarlink.app` DNS zone:

```
Name/Host: billing
Type: CNAME
Value: <your-kubernetes-ingress-load-balancer-fqdn>
TTL: 300
```

## Provider-Specific Commands

### AWS Route53
```bash
export ZONEID=ZXXXXXXXXXXXX
export LB_FQDN=your-load-balancer-fqdn.elb.amazonaws.com

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

### Google Cloud DNS
```bash
export LB_FQDN=your-load-balancer-fqdn
gcloud dns record-sets transaction start --zone=scholarlink
gcloud dns record-sets transaction add $LB_FQDN --name=billing.scholarlink.app. --ttl=300 --type=CNAME --zone=scholarlink
gcloud dns record-sets transaction execute --zone=scholarlink
```

### Cloudflare
Set record to "DNS only" (gray cloud) during certificate issuance. Can enable proxy after certificate is ready.

## Verification Script (Copy/Paste Ready)

```bash
export HOST=billing.scholarlink.app
export NAMESPACE=scholarlink-prod

bash -c '
  until dig +short $HOST @1.1.1.1; do 
    echo "Waiting for DNS…"; 
    sleep 10; 
  done
  
  kubectl -n $NAMESPACE wait --for=condition=Ready certificate/billing-scholarlink-app-tls --timeout=10m
  
  curl -sSI https://$HOST | head -n 5 && echo "✅ Production ready!"
'
```

## Manual Verification Steps

### 1. DNS Resolution
```bash
dig +short billing.scholarlink.app @1.1.1.1
dig +short billing.scholarlink.app @8.8.8.8
# Should return: your-load-balancer-fqdn
```

### 2. Certificate Status
```bash
kubectl -n scholarlink-prod get certificate,order,challenge
kubectl -n scholarlink-prod describe certificate billing-scholarlink-app-tls
# Wait for: Ready=True
```

### 3. Final Access Test
```bash
curl -I https://billing.scholarlink.app
# Should return: HTTP/2 200 with valid SSL headers
```

### 4. Full Production Validation
```bash
./deployment/billing/production-validation.sh all
```

## Expected Timeline
- DNS propagation: 5-10 minutes
- Certificate issuance: 2-5 minutes after DNS resolves
- Full functionality: 10-15 minutes total

## Success Indicators
- DNS queries return load balancer FQDN
- Certificate status shows Ready=True
- HTTPS access works without browser warnings
- All validation tests pass
- Billing portal fully operational at https://billing.scholarlink.app