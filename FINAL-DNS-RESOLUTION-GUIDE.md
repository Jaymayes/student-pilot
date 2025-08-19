# Final DNS Resolution Guide - billing.scholarlink.app

## Issue Confirmed: DNS Record Missing

The `DNS_PROBE_FINISHED_NXDOMAIN` error confirms that no DNS record exists for `billing.scholarlink.app`. This must be resolved before SSL certificates can be issued.

## Required DNS Configuration

### Create This Exact DNS Record

In your DNS provider where `scholarlink.app` is managed:

```
Host/Name: billing
Type: CNAME
Value: <your-kubernetes-ingress-load-balancer-fqdn>
TTL: 300
```

### Critical Details

**Host Name**: Use `billing` (NOT `billing.scholarlink`)
- ✅ Correct: `billing` → creates `billing.scholarlink.app`
- ❌ Wrong: `billing.scholarlink` → creates `billing.scholarlink.scholarlink.app`

**Target Value**: Your Kubernetes load balancer FQDN (without https://)
- Format: `k8s-lb-abc123.us-west-2.elb.amazonaws.com`
- Examples:
  - AWS ALB: `abc123-123456789.us-west-2.elb.amazonaws.com`
  - GCP GLB: `gcp-lb-123456.googleapis.com`
  - Azure: `aks-agentpool-12345-vmss.westus2.cloudapp.azure.com`

## Verification Commands

After creating the DNS record, verify resolution:

```bash
# Test DNS resolution (should return your load balancer FQDN)
dig +short billing.scholarlink.app @1.1.1.1
dig +short billing.scholarlink.app @8.8.8.8

# Verify DNS propagation
dig +trace billing.scholarlink.app

# Check parent domain nameservers
nslookup -type=NS scholarlink.app
```

## Certificate Issuance Process

Once DNS resolves, cert-manager will automatically:

1. **Detect DNS resolution** for billing.scholarlink.app
2. **Create ACME order** with Let's Encrypt
3. **Perform HTTP-01 challenge** at `/.well-known/acme-challenge/`
4. **Issue certificate** and store in `billing-scholarlink-app-tls` secret
5. **Enable HTTPS** with valid certificate

Monitor progress:
```bash
kubectl -n scholarlink-prod get certificate,order,challenge
kubectl -n scholarlink-prod describe certificate billing-scholarlink-app-tls
```

## Final Access Test

Once certificate is ready (`Ready=True`):

```bash
# Should return 200 with valid certificate
curl -I https://billing.scholarlink.app

# Verify certificate details
openssl s_client -connect billing.scholarlink.app:443 -servername billing.scholarlink.app </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

## Special Considerations

### Cloudflare Users
If using Cloudflare, set DNS record to "DNS only" (gray cloud) during certificate issuance. Proxy can be enabled after certificate is issued.

### Route53 Users
Can use ALIAS record pointing to ALB/NLB instead of CNAME for better performance.

## Expected Timeline

1. **DNS Record Creation**: Immediate
2. **DNS Propagation**: 5-10 minutes globally
3. **Certificate Issuance**: 2-5 minutes after DNS resolves
4. **Full Functionality**: ~15 minutes total

## Troubleshooting

### Still Getting NXDOMAIN?
- Verify DNS record was created in correct zone
- Check Host/Name field uses `billing` not `billing.scholarlink`
- Wait additional time for DNS propagation
- Test with different DNS servers (1.1.1.1, 8.8.8.8)

### Certificate Not Issuing?
- Confirm DNS resolution works first
- Check ACME challenge logs: `kubectl -n scholarlink-prod describe challenges`
- Verify ingress annotations are correct
- Ensure no firewall blocking HTTP challenge

## Post-Resolution Checklist

After DNS resolves and certificate is issued:

- [ ] https://billing.scholarlink.app loads without warnings
- [ ] Certificate shows valid Let's Encrypt issuer
- [ ] All billing portal features functional
- [ ] Stripe webhooks accessible
- [ ] UTM tracking working
- [ ] Performance within SLA (<200ms response time)

---

**Once DNS resolution is confirmed, the billing portal will be fully operational with valid SSL certificates and all security features active.**