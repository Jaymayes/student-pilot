#!/bin/bash

set -euo pipefail

# Production Validation Suite for billing.scholarlink.app
# Comprehensive testing after DNS resolution and certificate issuance

DOMAIN="billing.scholarlink.app"
NAMESPACE="scholarlink-prod"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

validate_dns() {
    log "🌐 Validating DNS resolution..."
    
    # Test multiple DNS servers
    local resolvers=("1.1.1.1" "8.8.8.8" "208.67.222.222")
    
    for resolver in "${resolvers[@]}"; do
        local result=$(dig +short "$DOMAIN" @"$resolver" | head -n1)
        if [[ -n "$result" ]]; then
            log "   ✅ DNS @$resolver: $result"
        else
            log "   ❌ DNS @$resolver: No response"
            return 1
        fi
    done
    
    log "✅ DNS resolution validated across all resolvers"
}

validate_certificate() {
    log "🔒 Validating SSL certificate..."
    
    # Check certificate status in Kubernetes
    local cert_status=$(kubectl -n "$NAMESPACE" get certificate billing-scholarlink-app-tls -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "NotFound")
    
    if [[ "$cert_status" == "True" ]]; then
        log "   ✅ Kubernetes certificate: Ready=True"
    else
        log "   ❌ Kubernetes certificate: $cert_status"
        log "   Certificate details:"
        kubectl -n "$NAMESPACE" describe certificate billing-scholarlink-app-tls
        return 1
    fi
    
    # Test SSL connection
    if curl -sSf --connect-timeout 10 "https://$DOMAIN/health" >/dev/null 2>&1; then
        log "   ✅ SSL connection successful"
    else
        log "   ❌ SSL connection failed"
        return 1
    fi
    
    log "✅ SSL certificate validation passed"
}

validate_application() {
    log "🏥 Validating application health..."
    
    # Health endpoint
    local health_status=$(curl -sf "https://$DOMAIN/health" 2>/dev/null || echo "FAILED")
    if [[ "$health_status" != "FAILED" ]]; then
        log "   ✅ Health endpoint: 200 OK"
    else
        log "   ❌ Health endpoint: Failed"
        return 1
    fi
    
    # Readiness endpoint  
    local ready_status=$(curl -sf "https://$DOMAIN/readyz" 2>/dev/null || echo "FAILED")
    if [[ "$ready_status" != "FAILED" ]]; then
        log "   ✅ Readiness endpoint: 200 OK"
    else
        log "   ❌ Readiness endpoint: Failed"
        return 1
    fi
    
    log "✅ Application health validation passed"
}

validate_security_headers() {
    log "🛡️  Validating security headers..."
    
    local headers=$(curl -sI "https://$DOMAIN" 2>/dev/null)
    
    # Check for essential security headers
    if echo "$headers" | grep -qi "strict-transport-security"; then
        log "   ✅ HSTS header present"
    else
        log "   ❌ HSTS header missing"
        return 1
    fi
    
    if echo "$headers" | grep -qi "x-frame-options"; then
        log "   ✅ X-Frame-Options header present"
    else
        log "   ❌ X-Frame-Options header missing"
        return 1
    fi
    
    if echo "$headers" | grep -qi "x-content-type-options"; then
        log "   ✅ X-Content-Type-Options header present"
    else
        log "   ❌ X-Content-Type-Options header missing"
        return 1
    fi
    
    log "✅ Security headers validation passed"
}

validate_stripe_webhook() {
    log "📡 Validating Stripe webhook accessibility..."
    
    local webhook_url="https://$DOMAIN/webhooks/stripe"
    local response=$(curl -sf -X POST "$webhook_url" -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "FAILED")
    
    # Webhook should be accessible (may return 400 due to missing signature, but not 404/500)
    if curl -sf --connect-timeout 10 "$webhook_url" >/dev/null 2>&1; then
        log "   ✅ Webhook endpoint accessible"
    else
        log "   ❌ Webhook endpoint not accessible"
        return 1
    fi
    
    log "✅ Stripe webhook validation passed"
}

validate_performance() {
    log "⚡ Validating performance metrics..."
    
    # Measure response time
    local start_time=$(date +%s.%N)
    curl -sf "https://$DOMAIN/health" >/dev/null
    local end_time=$(date +%s.%N)
    local response_time=$(echo "($end_time - $start_time) * 1000" | bc)
    local response_time_int=${response_time%.*}
    
    if [[ $response_time_int -lt 200 ]]; then
        log "   ✅ Response time: ${response_time_int}ms (< 200ms SLO)"
    else
        log "   ⚠️  Response time: ${response_time_int}ms (> 200ms SLO)"
    fi
    
    log "✅ Performance validation completed"
}

validate_kubernetes_resources() {
    log "☸️  Validating Kubernetes resources..."
    
    # Check ingress
    local ingress_status=$(kubectl -n "$NAMESPACE" get ingress billing-portal-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "NotFound")
    if [[ "$ingress_status" != "NotFound" && -n "$ingress_status" ]]; then
        log "   ✅ Ingress: $ingress_status"
    else
        log "   ❌ Ingress: Not ready or not found"
        return 1
    fi
    
    # Check certificate
    local cert_issuer=$(kubectl -n "$NAMESPACE" get certificate billing-scholarlink-app-tls -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}' 2>/dev/null || echo "NotFound")
    if [[ "$cert_issuer" == "Certificate is up to date and has not expired" ]]; then
        log "   ✅ Certificate: Up to date"
    else
        log "   ❌ Certificate: $cert_issuer"
        return 1
    fi
    
    log "✅ Kubernetes resources validation passed"
}

run_smoke_tests() {
    log "🧪 Running smoke tests..."
    
    # Test billing portal page loads
    if curl -sf "https://$DOMAIN" | grep -q "Credit Packages\|Billing" 2>/dev/null; then
        log "   ✅ Billing portal page loads with expected content"
    else
        log "   ❌ Billing portal page content check failed"
        return 1
    fi
    
    log "✅ Smoke tests passed"
}

main() {
    local test_type="${1:-all}"
    
    log "🚀 Production Validation Suite - billing.scholarlink.app"
    log "============================================="
    
    case "$test_type" in
        "dns")
            validate_dns
            ;;
        "cert"|"certificate")
            validate_certificate
            ;;
        "app"|"application")
            validate_application
            ;;
        "security")
            validate_security_headers
            ;;
        "webhook")
            validate_stripe_webhook
            ;;
        "performance")
            validate_performance
            ;;
        "k8s"|"kubernetes")
            validate_kubernetes_resources
            ;;
        "smoke")
            run_smoke_tests
            ;;
        "all"|*)
            validate_dns
            validate_certificate
            validate_application
            validate_security_headers
            validate_stripe_webhook
            validate_performance
            validate_kubernetes_resources
            run_smoke_tests
            ;;
    esac
    
    log ""
    log "🎉 Production validation completed successfully!"
    log "🎯 billing.scholarlink.app is production-ready"
}

# Check if bc is available for performance calculations
if ! command -v bc &> /dev/null; then
    log "⚠️  'bc' not available, skipping precise performance measurements"
    # Fallback for performance validation without bc
    validate_performance() {
        log "⚡ Validating performance metrics..."
        if curl -sf --max-time 2 "https://$DOMAIN/health" >/dev/null; then
            log "   ✅ Response time: < 2s (basic check)"
        else
            log "   ❌ Response time: > 2s or failed"
            return 1
        fi
        log "✅ Performance validation completed"
    }
fi

main "$@"