#!/bin/bash

# DNS Activation Monitor for ScholarLink Billing Portal
# Monitors DNS propagation, certificate issuance, and redirect functionality

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="billing.scholarlink.app"
NAMESPACE="scholarlink-prod"
CERT_NAME="billing-scholarlink-app-tls"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ScholarLink Billing Portal Monitor${NC}"
echo -e "${BLUE}  Domain: $DOMAIN${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Function to check DNS resolution
check_dns() {
    local result=$(dig +short $DOMAIN @1.1.1.1 2>/dev/null || echo "")
    if [ -n "$result" ]; then
        echo -e "${GREEN}✓ DNS Resolution:${NC} $result"
        return 0
    else
        echo -e "${YELLOW}⏳ DNS Resolution:${NC} Not yet propagated"
        return 1
    fi
}

# Function to check certificate status
check_certificate() {
    local ready=$(kubectl -n $NAMESPACE get certificate $CERT_NAME -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "")
    if [ "$ready" = "True" ]; then
        echo -e "${GREEN}✓ SSL Certificate:${NC} Ready"
        return 0
    else
        echo -e "${YELLOW}⏳ SSL Certificate:${NC} Pending issuance"
        return 1
    fi
}

# Function to check HTTPS redirect
check_redirect() {
    local response=$(curl -I -s -o /dev/null -w "%{http_code}|%{redirect_url}" https://$DOMAIN 2>/dev/null || echo "000|")
    local status=$(echo $response | cut -d'|' -f1)
    local location=$(echo $response | cut -d'|' -f2)
    
    if [ "$status" = "301" ] && [[ "$location" == *"app.scholarlink.app/account/billing"* ]]; then
        echo -e "${GREEN}✓ User Redirect:${NC} 301 → $location"
        return 0
    elif [ "$status" = "000" ]; then
        echo -e "${YELLOW}⏳ User Redirect:${NC} HTTPS not yet accessible"
        return 1
    else
        echo -e "${RED}✗ User Redirect:${NC} Status $status, Location: $location"
        return 1
    fi
}

# Function to check webhook preservation
check_webhook() {
    local response=$(curl -I -s -o /dev/null -w "%{http_code}|%{redirect_url}" https://$DOMAIN/webhooks/stripe 2>/dev/null || echo "000|")
    local status=$(echo $response | cut -d'|' -f1)
    local location=$(echo $response | cut -d'|' -f2)
    
    if [ -z "$location" ] && [ "$status" != "301" ] && [ "$status" != "302" ]; then
        echo -e "${GREEN}✓ Webhook Preserved:${NC} Status $status (no redirect)"
        return 0
    elif [ "$status" = "000" ]; then
        echo -e "${YELLOW}⏳ Webhook Check:${NC} HTTPS not yet accessible"
        return 1
    else
        echo -e "${RED}✗ Webhook Redirecting:${NC} Status $status, Location: $location"
        return 1
    fi
}

# Main monitoring loop
echo "Starting monitoring (press Ctrl+C to stop)..."
echo "Expected timeline: DNS 5-10 min → Certificate 2-5 min → Total 10-15 min"
echo

start_time=$(date +%s)
dns_ready=false
cert_ready=false
redirect_ready=false
webhook_ready=false

while true; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    echo -e "${BLUE}[$(date '+%H:%M:%S')] Check ${elapsed}s elapsed${NC}"
    
    # Check DNS first
    if ! $dns_ready; then
        if check_dns; then
            dns_ready=true
        fi
    else
        echo -e "${GREEN}✓ DNS Resolution:${NC} Confirmed"
    fi
    
    # Check certificate if DNS is ready
    if $dns_ready && ! $cert_ready; then
        if check_certificate; then
            cert_ready=true
        fi
    elif $cert_ready; then
        echo -e "${GREEN}✓ SSL Certificate:${NC} Ready"
    fi
    
    # Check HTTPS functionality if certificate is ready
    if $cert_ready; then
        if ! $redirect_ready; then
            if check_redirect; then
                redirect_ready=true
            fi
        else
            echo -e "${GREEN}✓ User Redirect:${NC} Working"
        fi
        
        if ! $webhook_ready; then
            if check_webhook; then
                webhook_ready=true
            fi
        else
            echo -e "${GREEN}✓ Webhook Preserved:${NC} Working"
        fi
    fi
    
    echo
    
    # Check if everything is ready
    if $dns_ready && $cert_ready && $redirect_ready && $webhook_ready; then
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  🎉 ACTIVATION COMPLETE! 🎉${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo
        echo -e "${GREEN}✓ DNS Resolution:${NC} billing.scholarlink.app is live"
        echo -e "${GREEN}✓ SSL Certificate:${NC} Let's Encrypt issued and ready"
        echo -e "${GREEN}✓ User Redirect:${NC} 301 to app.scholarlink.app/account/billing"
        echo -e "${GREEN}✓ Webhook Preserved:${NC} /webhooks/stripe accessible (no redirect)"
        echo
        echo -e "${YELLOW}Next Steps:${NC}"
        echo "1. Update app config: VITE_BILLING_PORTAL_URL=https://app.scholarlink.app/account/billing"
        echo "2. Test Stripe webhook: Send test event or $5 purchase"
        echo "3. Verify ledger crediting and idempotency"
        echo
        echo -e "${BLUE}Total activation time: ${elapsed}s${NC}"
        break
    fi
    
    # Wait before next check
    sleep 30
done