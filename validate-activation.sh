#!/bin/bash

# Comprehensive validation script for ScholarLink billing portal activation
# Run this script on your Kubernetes cluster

set -e

echo "========================================="
echo "ScholarLink Billing Portal Validation"
echo "Post-Activation Comprehensive Check"
echo "========================================="

echo
echo "--- Ingresses ---"
kubectl -n scholarlink-prod get ingress billing-webhook billing-redirect -o wide || true

echo
echo "--- Load Balancer Details ---"
echo -n "Hostname: "
kubectl -n scholarlink-prod get ingress billing-redirect -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' || echo "N/A"
echo
echo -n "IP: "
kubectl -n scholarlink-prod get ingress billing-redirect -o jsonpath='{.status.loadBalancer.ingress[0].ip}' || echo "N/A"
echo

echo
echo "--- DNS Resolution ---"
echo "dig @1.1.1.1:"
dig +short billing.scholarlink.app @1.1.1.1 || echo "DNS not resolved"

echo "dig @8.8.8.8:"
dig +short billing.scholarlink.app @8.8.8.8 || echo "DNS not resolved"

echo
echo "--- Certificate Status ---"
kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls || echo "Certificate not found"

echo
echo "--- HTTPS Tests ---"
echo "Testing user redirect (should be 301):"
curl -I -s --connect-timeout 10 https://billing.scholarlink.app | head -5 || echo "HTTPS not accessible"

echo
echo "Testing webhook preservation (should NOT redirect):"
curl -I -s --connect-timeout 10 https://billing.scholarlink.app/webhooks/stripe | head -5 || echo "HTTPS not accessible"

echo
echo "--- Ingress Controller Status ---"
kubectl -n ingress-nginx get pods -o wide || echo "Ingress controller pods not accessible"

echo
echo "========================================="
echo "Validation Complete"
echo "========================================="