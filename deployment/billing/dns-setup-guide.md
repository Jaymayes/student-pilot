# DNS Setup Guide for billing.scholarlink.app

## Issue Diagnosis

The browser error `DNS_PROBE_FINISHED_NXDOMAIN` indicates that DNS is not returning a record for `billing.scholarlink.app`. This needs to be resolved before SSL certificates can be issued.

## DNS Configuration Required

### Step 1: Create DNS Record

In your DNS provider (where scholarlink.app is hosted), create:

```
Host/Name: billing
Type: CNAME 
Value/Target: <your-kubernetes-ingress-load-balancer-fqdn>
TTL: 300
```

**Important**: Use `billing` as the host name, NOT `billing.scholarlink` (which would create `billing.scholarlink.scholarlink.app`)

### Step 2: Common DNS Provider Examples

#### Cloudflare
- Name: `billing`
- Type: `CNAME`
- Content: `k8s-lb-abc123.us-west-2.elb.amazonaws.com`
- Proxy status: DNS only (gray cloud) during certificate issuance

#### Route53 (AWS)
- Record name: `billing`
- Record type: `CNAME` (or `A` if using ALB with alias)
- Value: `k8s-lb-abc123.us-west-2.elb.amazonaws.com`

#### Google Cloud DNS
- DNS name: `billing`
- Resource record type: `CNAME`
- Canonical name: `k8s-lb-abc123.us-west-2.elb.amazonaws.com`

### Step 3: Verify DNS Propagation

```bash
# Check DNS resolution
dig +short billing.scholarlink.app @1.1.1.1
dig +short billing.scholarlink.app @8.8.8.8

# Trace DNS resolution path
dig +trace billing.scholarlink.app

# Check nameservers for parent domain
nslookup -type=NS scholarlink.app
```

Expected result: The load balancer FQDN should be returned.

## SSL Certificate Issuance Process

Once DNS resolves correctly:

### Step 1: Verify Certificate Status
```bash
kubectl -n scholarlink-prod get certificate,order,challenge
kubectl -n scholarlink-prod describe certificate billing-scholarlink-app-tls
```

### Step 2: Monitor Certificate Issuance
```bash
# Should show Ready=True once DNS works
kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls -w

# Check ACME challenges
kubectl -n scholarlink-prod get challenges
```

### Step 3: Test Final Access
```bash
# Should return 200/301 with valid certificate
curl -I https://billing.scholarlink.app

# Verify certificate details  
openssl s_client -connect billing.scholarlink.app:443 -servername billing.scholarlink.app </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

## Troubleshooting

### DNS Issues
- **NXDOMAIN**: DNS record doesn't exist - create the CNAME record
- **Wrong target**: Verify load balancer FQDN is correct
- **Propagation delay**: Wait 5-10 minutes after creating record

### Certificate Issues
- **Pending**: Usually waiting for DNS resolution
- **Failed**: Check DNS and ACME challenge logs
- **Cloudflare**: Set to "DNS only" (gray cloud) during issuance

### Common Mistakes
- Using `billing.scholarlink` as host name instead of `billing`
- Including `https://` in the CNAME target
- Setting TTL too high during initial setup
- Cloudflare proxy enabled during certificate validation

## Production Checklist

After DNS resolution works:

- [ ] DNS record resolves correctly
- [ ] Certificate shows Ready=True  
- [ ] HTTPS access works without warnings
- [ ] Application loads properly
- [ ] Stripe webhooks accessible
- [ ] UTM tracking functional
- [ ] All billing links updated

## Next Steps After DNS Resolution

1. **Immediate**: Verify certificate issuance
2. **24h**: Optimize DNS TTL to 3600s
3. **Ongoing**: Monitor certificate auto-renewal
4. **Production**: Enable all security headers and monitoring