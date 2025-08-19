# Ready to Execute - ScholarLink Billing Portal Option 1

## 🚀 All Configuration Files Ready

The Option 1 (301 redirect) setup is prepared and ready for execution on your Kubernetes cluster.

## Step 1: Apply Kubernetes Configuration

Run these commands on your cluster:

```bash
# Apply webhook ingress (preserves Stripe webhooks)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: billing-webhook
  namespace: scholarlink-prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
  labels:
    app: scholarlink-billing
    component: webhook
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - billing.scholarlink.app
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
EOF

# Apply redirect ingress (301 redirects user traffic)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: billing-redirect
  namespace: scholarlink-prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/permanent-redirect: https://app.scholarlink.app/account/billing\$request_uri
    nginx.ingress.kubernetes.io/permanent-redirect-code: "301"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
  labels:
    app: scholarlink-billing
    component: redirect
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - billing.scholarlink.app
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
EOF
```

## Step 2: Verify Ingress Creation

```bash
kubectl -n scholarlink-prod get ingress billing-webhook billing-redirect
```

## Step 3: Get Load Balancer FQDN

```bash
export LB_FQDN=$(kubectl -n scholarlink-prod get ingress billing-redirect -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Load Balancer FQDN: $LB_FQDN"
```

## Step 4: Create DNS Record

### AWS Route53
```bash
export ZONE_ID=YOUR_HOSTED_ZONE_ID

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
export ZONE=scholarlink

gcloud dns record-sets transaction start --zone=$ZONE
gcloud dns record-sets transaction add $LB_FQDN \
  --name=billing.scholarlink.app. \
  --ttl=300 \
  --type=CNAME \
  --zone=$ZONE
gcloud dns record-sets transaction execute --zone=$ZONE
```

### Manual Portal
```
Host/Name: billing
Type: CNAME
Value: <LB_FQDN from step 3>
TTL: 300
```

## Step 5: Monitor Activation

```bash
# DNS propagation check
dig +short billing.scholarlink.app @1.1.1.1

# Certificate status (wait for Ready=True)
kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls -w

# Test HTTPS access
curl -I https://billing.scholarlink.app
```

## Step 6: Validate Behavior

### Webhook Preserved (should NOT redirect)
```bash
curl -I https://billing.scholarlink.app/webhooks/stripe
# Expected: HTTP/2 200 (from billing-api service)
```

### User Traffic Redirected (should redirect)
```bash
curl -I https://billing.scholarlink.app
# Expected: HTTP/2 301 
# Location: https://app.scholarlink.app/account/billing

curl -I https://billing.scholarlink.app/some/path?foo=bar
# Expected: HTTP/2 301
# Location: https://app.scholarlink.app/account/billing/some/path?foo=bar
```

## Step 7: Update App Configuration

```bash
# Update environment variable
VITE_BILLING_PORTAL_URL=https://app.scholarlink.app/account/billing
```

## Expected Timeline

- **Ingress Creation**: Immediate
- **Load Balancer Ready**: 2-3 minutes
- **DNS Propagation**: 5-10 minutes
- **Certificate Issuance**: 2-5 minutes after DNS
- **Full Operation**: 10-15 minutes total

## Success Indicators

✅ **Ingress Status**: Both ingresses show ADDRESS populated  
✅ **DNS Resolution**: `dig` returns load balancer FQDN  
✅ **Certificate Ready**: `kubectl get certificate` shows Ready=True  
✅ **Webhook Works**: `/webhooks/stripe` returns 200, no redirect  
✅ **Redirect Works**: Root path returns 301 to app.scholarlink.app  

## Architecture Achieved

```
billing.scholarlink.app/webhooks/stripe → billing-api (preserved)
billing.scholarlink.app/*              → 301 → app.scholarlink.app/account/billing
```

**Benefits**:
- Stripe webhooks secure and unchanged
- Users get seamless in-app billing experience  
- Professional domain maintained with 301 redirects
- Single SSL certificate, simplified infrastructure

## Troubleshooting

**Webhook redirecting**: Check billing-webhook ingress applied first  
**No redirect**: Verify billing-redirect annotations  
**Certificate pending**: Ensure DNS resolves before Let's Encrypt validation  
**Wrong redirect URL**: Check permanent-redirect annotation syntax

---

**The ScholarLink billing portal Option 1 configuration is ready for execution. Run the kubectl commands above to deploy, then create the DNS record to activate!**