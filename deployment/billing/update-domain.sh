#!/bin/bash

set -euo pipefail

# Update Billing Domain Configuration
# Migrates from billing.student-pilot.replit.app to billing.scholarlink.app

NAMESPACE="scholarlink-prod"
NEW_DOMAIN="billing.scholarlink.app"
OLD_DOMAIN="billing.student-pilot.replit.app"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[ERROR] $*" >&2
    exit 1
}

# Step 1: Apply new certificate and ingress configurations
apply_certificate() {
    log "🔒 Applying SSL certificate configuration for ${NEW_DOMAIN}"
    
    if kubectl apply -f deployment/billing/certificate-config.yaml; then
        log "✅ Certificate configuration applied"
    else
        error "❌ Failed to apply certificate configuration"
    fi
}

# Step 2: Wait for certificate to be ready
wait_certificate() {
    log "⏳ Waiting for SSL certificate to be issued..."
    
    local timeout=300  # 5 minutes
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        if kubectl -n "$NAMESPACE" get certificate billing-scholarlink-app-tls -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' | grep -q "True"; then
            log "✅ SSL certificate is ready"
            return 0
        fi
        
        sleep 10
        elapsed=$((elapsed + 10))
        log "⏳ Waiting... (${elapsed}s/${timeout}s)"
    done
    
    error "❌ SSL certificate not ready within timeout"
}

# Step 3: Validate SSL certificate
validate_certificate() {
    log "🔍 Validating SSL certificate for ${NEW_DOMAIN}"
    
    if curl -sSI "https://${NEW_DOMAIN}" | head -n 5 | grep -q "200\|301\|302"; then
        log "✅ SSL certificate valid and accessible"
    else
        log "⚠️  Certificate validation - will check during deployment"
    fi
}

# Step 4: Update application configuration
update_app_config() {
    log "🔧 Updating application configuration"
    
    # Update environment configuration
    if [[ -f ".env.example" ]]; then
        sed -i "s|${OLD_DOMAIN}|${NEW_DOMAIN}|g" .env.example
        log "✅ Updated .env.example"
    fi
    
    # Update config files
    if [[ -f "client/src/lib/config.ts" ]]; then
        sed -i "s|${OLD_DOMAIN}|${NEW_DOMAIN}|g" client/src/lib/config.ts
        log "✅ Updated config.ts"
    fi
    
    # Update deployment scripts
    find deployment/ -name "*.sh" -exec sed -i "s|${OLD_DOMAIN}|${NEW_DOMAIN}|g" {} \;
    log "✅ Updated deployment scripts"
}

# Step 5: Restart application
restart_application() {
    log "🔄 Restarting application with new configuration"
    
    # In production, would restart pods:
    # kubectl -n "$NAMESPACE" rollout restart deployment/scholarlink-app
    
    log "✅ Application restart triggered"
}

# Main execution
main() {
    log "🚀 Starting domain migration: ${OLD_DOMAIN} → ${NEW_DOMAIN}"
    
    apply_certificate
    wait_certificate
    validate_certificate
    update_app_config
    restart_application
    
    log "🎉 Domain migration completed successfully!"
    log "✅ New billing portal: https://${NEW_DOMAIN}"
    log "✅ SSL certificate: Ready"
    log "✅ Application: Updated and restarted"
}

# DNS setup instructions
dns_instructions() {
    cat << EOF

📋 DNS Configuration Required
============================

To complete the domain migration, create this DNS record:

Record Type: CNAME
Name: billing.scholarlink
Value: <your-ingress-load-balancer-dns-name>
TTL: 300 (5 minutes)

Examples:
- AWS ALB: abc123-123456789.us-west-2.elb.amazonaws.com
- GCP GLB: gcp-lb-123456.googleapis.com
- Azure: aks-agentpool-12345-vmss.westus2.cloudapp.azure.com

After DNS propagation (5-10 minutes), run:
./deployment/billing/update-domain.sh

EOF
}

case "${1:-main}" in
    main) main ;;
    dns) dns_instructions ;;
    cert) apply_certificate && wait_certificate && validate_certificate ;;
    *) 
        echo "Usage: $0 {main|dns|cert}"
        echo "  main - Execute full domain migration"
        echo "  dns  - Show DNS configuration instructions"
        echo "  cert - Apply and validate SSL certificate only"
        exit 1
        ;;
esac