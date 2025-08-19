#!/bin/bash

# Quick Activation Script for ScholarLink Billing Portal
# This script helps create the DNS record and monitor activation

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ScholarLink Billing Portal Activation${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Step 1: Get Load Balancer FQDN
echo -e "${YELLOW}Step 1: Getting Kubernetes Load Balancer FQDN...${NC}"
if command -v kubectl >/dev/null 2>&1; then
    LB_FQDN=$(kubectl -n scholarlink-prod get ingress billing-scholarlink-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    
    if [[ -n "$LB_FQDN" ]]; then
        echo -e "${GREEN}✓ Load Balancer FQDN: $LB_FQDN${NC}"
        export LB_FQDN
    else
        echo -e "${RED}✗ Could not retrieve Load Balancer FQDN${NC}"
        echo "Please run manually:"
        echo "kubectl -n scholarlink-prod get ingress billing-scholarlink-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'"
        exit 1
    fi
else
    echo -e "${RED}✗ kubectl not found${NC}"
    echo "Please install kubectl and configure access to your cluster"
    exit 1
fi

echo

# Step 2: Choose DNS Provider
echo -e "${YELLOW}Step 2: Choose your DNS provider:${NC}"
echo "1) AWS Route53"
echo "2) Cloudflare"
echo "3) Google Cloud DNS"
echo "4) DigitalOcean"
echo "5) Manual (Portal instructions)"
echo "6) Custom command"
echo

read -p "Enter choice (1-6): " provider_choice

case $provider_choice in
    1)
        echo -e "${BLUE}AWS Route53 Selected${NC}"
        read -p "Enter your Route53 Hosted Zone ID: " ZONE_ID
        echo
        echo -e "${YELLOW}Run this command:${NC}"
        echo "export ZONE_ID=$ZONE_ID"
        echo "export LB_FQDN=$LB_FQDN"
        echo
        echo "aws route53 change-resource-record-sets --hosted-zone-id \$ZONE_ID --change-batch '{"
        echo '  "Comment": "Create billing CNAME for ScholarLink",'
        echo '  "Changes": [{'
        echo '    "Action": "UPSERT",'
        echo '    "ResourceRecordSet": {'
        echo '      "Name": "billing.scholarlink.app",'
        echo '      "Type": "CNAME",'
        echo '      "TTL": 300,'
        echo "      \"ResourceRecords\": [{\"Value\": \"'\$LB_FQDN'\"}]"
        echo '    }'
        echo '  }]'
        echo "}'"
        ;;
    2)
        echo -e "${BLUE}Cloudflare Selected${NC}"
        read -p "Enter your Cloudflare Zone ID: " CF_ZONE_ID
        read -p "Enter your Cloudflare API Token: " CF_TOKEN
        echo
        echo -e "${YELLOW}Run this command:${NC}"
        echo "export CF_ZONE_ID=$CF_ZONE_ID"
        echo "export CF_TOKEN=$CF_TOKEN"
        echo "export LB_FQDN=$LB_FQDN"
        echo
        echo 'curl -sX POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records" \'
        echo '  -H "Authorization: Bearer $CF_TOKEN" \'
        echo '  -H "Content-Type: application/json" \'
        echo '  --data '"'"'{'
        echo '    "type": "CNAME",'
        echo '    "name": "billing.scholarlink.app",'
        echo '    "content": "'"'"'$LB_FQDN'"'"'",'
        echo '    "ttl": 300,'
        echo '    "proxied": false,'
        echo '    "comment": "ScholarLink billing portal"'
        echo '  }'"'"
        echo
        echo -e "${YELLOW}Important: Set to DNS only (gray cloud) initially!${NC}"
        ;;
    3)
        echo -e "${BLUE}Google Cloud DNS Selected${NC}"
        read -p "Enter your managed zone name: " ZONE
        echo
        echo -e "${YELLOW}Run these commands:${NC}"
        echo "export ZONE=$ZONE"
        echo "export LB_FQDN=$LB_FQDN"
        echo
        echo "gcloud dns record-sets transaction start --zone=\$ZONE"
        echo "gcloud dns record-sets transaction add \$LB_FQDN --name=billing.scholarlink.app. --ttl=300 --type=CNAME --zone=\$ZONE"
        echo "gcloud dns record-sets transaction execute --zone=\$ZONE"
        ;;
    4)
        echo -e "${BLUE}DigitalOcean Selected${NC}"
        read -p "Enter your DigitalOcean API Token: " DO_TOKEN
        echo
        echo -e "${YELLOW}Run this command:${NC}"
        echo "export DO_TOKEN=$DO_TOKEN"
        echo "export LB_FQDN=$LB_FQDN"
        echo
        echo 'curl -X POST "https://api.digitalocean.com/v2/domains/scholarlink.app/records" \'
        echo '  -H "Content-Type: application/json" \'
        echo '  -H "Authorization: Bearer $DO_TOKEN" \'
        echo '  -d '"'"'{'
        echo '    "type": "CNAME",'
        echo '    "name": "billing",'
        echo '    "data": "'"'"'$LB_FQDN'"'"'",'
        echo '    "ttl": 300'
        echo '  }'"'"
        ;;
    5)
        echo -e "${BLUE}Manual Portal Instructions${NC}"
        echo
        echo "1. Log into your DNS provider's portal"
        echo "2. Navigate to scholarlink.app domain management"
        echo "3. Add a new DNS record with these values:"
        echo
        echo -e "${YELLOW}   Type: CNAME${NC}"
        echo -e "${YELLOW}   Host/Name: billing${NC}"
        echo -e "${YELLOW}   Target/Value: $LB_FQDN${NC}"
        echo -e "${YELLOW}   TTL: 300 (5 minutes)${NC}"
        echo
        echo -e "${RED}Important: Use 'billing' NOT 'billing.scholarlink'${NC}"
        ;;
    6)
        echo -e "${BLUE}Custom Command${NC}"
        echo "Load Balancer FQDN: $LB_FQDN"
        echo "Create a CNAME record: billing.scholarlink.app → $LB_FQDN"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo
echo -e "${YELLOW}Step 3: After creating the DNS record, run:${NC}"
echo "./deployment/billing/dns-activation-monitor.sh"
echo
echo -e "${YELLOW}This will monitor:${NC}"
echo "• DNS propagation (5-10 minutes)"
echo "• Let's Encrypt certificate issuance (2-5 minutes)"
echo "• HTTPS access validation"
echo "• Complete production verification"
echo
echo -e "${GREEN}The billing portal will be live at https://billing.scholarlink.app${NC}"
echo -e "${GREEN}Expected total time: 10-15 minutes${NC}"
echo
echo -e "${BLUE}========================================${NC}"