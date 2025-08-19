#!/bin/bash

# Apply Option 1: 301 Redirect Setup for ScholarLink Billing Portal
# This script applies the webhook preservation + redirect configuration

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ScholarLink Billing Portal Setup${NC}"
echo -e "${BLUE}  Option 1: 301 Redirect Configuration${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Check kubectl access
if ! kubectl cluster-info >/dev/null 2>&1; then
    echo -e "${RED}✗ kubectl cannot access the cluster${NC}"
    echo "Please ensure you have valid kubectl configuration."
    exit 1
fi

# Check namespace exists
if ! kubectl get namespace scholarlink-prod >/dev/null 2>&1; then
    echo -e "${YELLOW}Creating namespace scholarlink-prod...${NC}"
    kubectl create namespace scholarlink-prod
fi

echo -e "${YELLOW}Step 1: Applying webhook ingress (preserves Stripe webhooks)...${NC}"
kubectl apply -f ./deployment/billing/billing-webhook-ingress.yaml
echo -e "${GREEN}✓ Webhook ingress applied${NC}"

echo -e "${YELLOW}Step 2: Applying redirect ingress (301 to in-app billing)...${NC}"
kubectl apply -f ./deployment/billing/billing-redirect-ingress.yaml
echo -e "${GREEN}✓ Redirect ingress applied${NC}"

echo
echo -e "${YELLOW}Verifying ingress configuration...${NC}"
kubectl -n scholarlink-prod get ingress

echo
echo -e "${YELLOW}Configuration Summary:${NC}"
echo -e "${GREEN}✓ Stripe Webhook Path:${NC} /webhooks/stripe → billing-api service"
echo -e "${GREEN}✓ All Other Paths:${NC} 301 redirect → https://app.scholarlink.app/account/billing"
echo -e "${GREEN}✓ SSL Certificate:${NC} Let's Encrypt automatic issuance"

echo
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Create DNS record: billing.scholarlink.app → <ingress-lb-fqdn>"
echo "2. Wait for certificate issuance (2-5 minutes)"
echo "3. Verify webhook delivery: curl -I https://billing.scholarlink.app/webhooks/stripe"
echo "4. Verify redirect: curl -I https://billing.scholarlink.app"
echo "5. Update app config: VITE_BILLING_PORTAL_URL=https://app.scholarlink.app/account/billing"

echo
echo -e "${BLUE}Monitoring Commands:${NC}"
echo "• Certificate status: kubectl -n scholarlink-prod get certificate billing-scholarlink-app-tls -w"
echo "• Ingress status: kubectl -n scholarlink-prod get ingress"
echo "• Real-time monitoring: ./deployment/billing/dns-activation-monitor.sh"

echo
echo -e "${GREEN}Setup complete! Ready for DNS activation.${NC}"