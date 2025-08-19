#!/bin/bash

# Quick Activation Script for ScholarLink Billing Portal Option 1
# Run this script on your Kubernetes cluster

set -e

echo "========================================="
echo "ScholarLink Billing Portal - Option 1"
echo "Quick Activation Sequence"
echo "========================================="

echo
echo "Step 1: Applying ingress manifests..."
kubectl -n scholarlink-prod apply -f deployment/billing/billing-webhook-ingress.yaml
kubectl -n scholarlink-prod apply -f deployment/billing/billing-redirect-ingress.yaml

echo
echo "Step 2: Checking ingress status..."
kubectl -n scholarlink-prod get ingress billing-webhook billing-redirect

echo
echo "Step 3: Getting load balancer FQDN..."
echo "Waiting for load balancer to provision..."
sleep 10

LB_FQDN=$(kubectl -n scholarlink-prod get ingress billing-redirect -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

if [ -z "$LB_FQDN" ]; then
    echo "Load balancer not ready yet. Waiting 30 seconds..."
    sleep 30
    LB_FQDN=$(kubectl -n scholarlink-prod get ingress billing-redirect -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
fi

if [ -z "$LB_FQDN" ]; then
    echo "ERROR: Load balancer FQDN not available yet. Run this manually:"
    echo "LB_FQDN=\$(kubectl -n scholarlink-prod get ingress billing-redirect -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
    echo "echo \$LB_FQDN"
    exit 1
fi

echo "Load Balancer FQDN: $LB_FQDN"

echo
echo "========================================="
echo "NEXT STEP: Create DNS Record"
echo "========================================="
echo "Host/Name: billing"
echo "Type: CNAME"
echo "Value: $LB_FQDN"
echo "TTL: 300"
echo
echo "If using Cloudflare: Set DNS-only (gray cloud) until cert is ready"
echo
echo "After creating DNS record, run:"
echo "./deployment/billing/dns-activation-monitor.sh"
echo
echo "========================================="