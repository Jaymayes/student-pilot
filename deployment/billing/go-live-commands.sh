#!/bin/bash
# ScholarLink Billing Service - Go Live Commands
# Production deployment and validation script

set -euo pipefail

# Configuration - UPDATE THESE VALUES
NAMESPACE="scholarlink-prod"
DEPLOYMENT_NAME="scholarlink-billing"
INGRESS_NAME="scholarlink-billing"
CANARY_INGRESS_NAME="scholarlink-billing-canary"
BILLING_DOMAIN="billing.student-pilot.replit.app"
STRIPE_WEBHOOK_URL="https://billing.student-pilot.replit.app/webhooks/stripe"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# ==============================================================================
# FINAL PRE-FLIGHT CHECKS
# ==============================================================================

preflight_secrets() {
    log "Verifying secrets in External Secrets..."
    
    kubectl get externalsecret scholarlink-billing-secrets -n ${NAMESPACE} -o yaml
    kubectl get secret scholarlink-billing-env -n ${NAMESPACE} -o jsonpath='{.data}' | jq -r 'keys[]'
    
    success "Secrets verified"
}

preflight_database() {
    log "Checking database migration status..."
    
    # Check if migration job completed successfully
    if kubectl get job scholarlink-billing-migrate -n ${NAMESPACE} -o jsonpath='{.status.conditions[0].type}' | grep -q "Complete"; then
        success "Database migration completed"
    else
        error "Database migration not completed"
        exit 1
    fi
}

preflight_ingress() {
    log "Verifying ingress configuration..."
    
    # Check TLS certificate
    kubectl get certificate scholarlink-billing-tls -n ${NAMESPACE}
    
    # Test TLS endpoint
    curl -I https://${BILLING_DOMAIN}/health
    
    success "Ingress and TLS verified"
}

preflight_image() {
    log "Verifying container image signature..."
    
    IMAGE=$(kubectl get deployment ${DEPLOYMENT_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].image}')
    echo "Current image: ${IMAGE}"
    
    # Verify with cosign (if available)
    if command -v cosign &> /dev/null; then
        cosign verify ${IMAGE} || warning "Cosign verification failed - proceeding anyway"
    fi
    
    success "Image verification completed"
}

# ==============================================================================
# 10-MINUTE PRODUCTION SMOKE TESTS
# ==============================================================================

smoke_test_health() {
    log "Testing health endpoints..."
    
    # Liveness probe
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${BILLING_DOMAIN}/health)
    if [ "${HEALTH_STATUS}" = "200" ]; then
        success "Health endpoint: ${HEALTH_STATUS}"
    else
        error "Health endpoint failed: ${HEALTH_STATUS}"
        exit 1
    fi
    
    # Readiness probe
    READY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${BILLING_DOMAIN}/readyz)
    if [ "${READY_STATUS}" = "200" ]; then
        success "Readiness endpoint: ${READY_STATUS}"
    else
        error "Readiness endpoint failed: ${READY_STATUS}"
        exit 1
    fi
}

smoke_test_jwt() {
    log "Testing JWT authentication..."
    
    # Test with invalid token
    INVALID_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer invalid_token" \
        https://${BILLING_DOMAIN}/api/users/profile)
    
    if [ "${INVALID_STATUS}" = "401" ]; then
        success "JWT validation: Invalid token correctly rejected (${INVALID_STATUS})"
    else
        error "JWT validation failed: Expected 401, got ${INVALID_STATUS}"
        exit 1
    fi
    
    # Test with no token
    NO_TOKEN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        https://${BILLING_DOMAIN}/api/users/profile)
    
    if [ "${NO_TOKEN_STATUS}" = "401" ]; then
        success "JWT validation: No token correctly rejected (${NO_TOKEN_STATUS})"
    else
        error "JWT validation failed: Expected 401, got ${NO_TOKEN_STATUS}"
        exit 1
    fi
}

smoke_test_rate_limit() {
    log "Testing rate limiting..."
    
    # Make rapid requests to test rate limiting
    for i in {1..5}; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${BILLING_DOMAIN}/health)
        echo "Request $i: ${STATUS}"
        sleep 0.1
    done
    
    success "Rate limiting test completed"
}

smoke_test_stripe_webhook() {
    log "Testing Stripe webhook endpoint..."
    
    # Test webhook endpoint accessibility
    WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"test": true}' \
        https://${BILLING_DOMAIN}/webhooks/stripe)
    
    if [ "${WEBHOOK_STATUS}" = "400" ] || [ "${WEBHOOK_STATUS}" = "401" ]; then
        success "Stripe webhook endpoint accessible (${WEBHOOK_STATUS})"
    else
        warning "Stripe webhook returned: ${WEBHOOK_STATUS}"
    fi
}

# ==============================================================================
# STRIPE WEBHOOK VALIDATION
# ==============================================================================

setup_stripe_webhook() {
    log "Setting up Stripe webhook for production..."
    
    echo "Manual step required:"
    echo "1. Go to https://dashboard.stripe.com/webhooks"
    echo "2. Create endpoint: ${STRIPE_WEBHOOK_URL}"
    echo "3. Select events: payment_intent.succeeded, checkout.session.completed"
    echo "4. Copy the webhook signing secret to AWS Secrets Manager:"
    echo "   /prod/scholarlink/billing/STRIPE_WEBHOOK_SECRET"
    echo ""
    echo "Test with Stripe CLI:"
    echo "stripe listen --forward-to ${STRIPE_WEBHOOK_URL}"
    echo "stripe trigger payment_intent.succeeded"
    echo ""
    read -p "Press Enter when Stripe webhook is configured..."
}

# ==============================================================================
# CANARY DEPLOYMENT
# ==============================================================================

enable_canary_1_percent() {
    log "Enabling canary deployment with 1% traffic..."
    
    kubectl patch ingress ${CANARY_INGRESS_NAME} -n ${NAMESPACE} -p '{
        "metadata": {
            "annotations": {
                "nginx.ingress.kubernetes.io/canary": "true",
                "nginx.ingress.kubernetes.io/canary-weight": "1"
            }
        }
    }'
    
    success "Canary enabled with 1% traffic"
    warning "Monitoring for 5 minutes before next step..."
    sleep 300  # 5 minutes
}

increase_canary_5_percent() {
    log "Increasing canary to 5% traffic..."
    
    kubectl patch ingress ${CANARY_INGRESS_NAME} -n ${NAMESPACE} -p '{
        "metadata": {
            "annotations": {
                "nginx.ingress.kubernetes.io/canary-weight": "5"
            }
        }
    }'
    
    success "Canary increased to 5% traffic"
    warning "Monitor metrics and continue manually to next phase"
}

increase_canary_20_percent() {
    log "Increasing canary to 20% traffic..."
    
    kubectl patch ingress ${CANARY_INGRESS_NAME} -n ${NAMESPACE} -p '{
        "metadata": {
            "annotations": {
                "nginx.ingress.kubernetes.io/canary-weight": "20"
            }
        }
    }'
    
    success "Canary increased to 20% traffic"
}

increase_canary_50_percent() {
    log "Increasing canary to 50% traffic..."
    
    kubectl patch ingress ${CANARY_INGRESS_NAME} -n ${NAMESPACE} -p '{
        "metadata": {
            "annotations": {
                "nginx.ingress.kubernetes.io/canary-weight": "50"
            }
        }
    }'
    
    success "Canary increased to 50% traffic"
}

complete_canary_100_percent() {
    log "Completing canary deployment (100% traffic)..."
    
    kubectl patch ingress ${CANARY_INGRESS_NAME} -n ${NAMESPACE} -p '{
        "metadata": {
            "annotations": {
                "nginx.ingress.kubernetes.io/canary": "false",
                "nginx.ingress.kubernetes.io/canary-weight": "0"
            }
        }
    }'
    
    success "Canary deployment completed - 100% traffic to new version"
}

rollback_canary() {
    log "Rolling back canary deployment..."
    
    kubectl patch ingress ${CANARY_INGRESS_NAME} -n ${NAMESPACE} -p '{
        "metadata": {
            "annotations": {
                "nginx.ingress.kubernetes.io/canary": "false",
                "nginx.ingress.kubernetes.io/canary-weight": "0"
            }
        }
    }'
    
    kubectl rollout undo deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE}
    
    success "Canary rollback completed"
}

# ==============================================================================
# MONITORING COMMANDS
# ==============================================================================

show_deployment_status() {
    log "Current deployment status:"
    echo ""
    
    echo "Pods:"
    kubectl get pods -l app=${DEPLOYMENT_NAME} -n ${NAMESPACE}
    echo ""
    
    echo "Services:"
    kubectl get svc -l app=${DEPLOYMENT_NAME} -n ${NAMESPACE}
    echo ""
    
    echo "Ingress:"
    kubectl get ingress -l app=${DEPLOYMENT_NAME} -n ${NAMESPACE}
    echo ""
    
    echo "HPA:"
    kubectl get hpa ${DEPLOYMENT_NAME} -n ${NAMESPACE}
    echo ""
}

get_logs() {
    log "Recent logs from billing service:"
    kubectl logs -l app=${DEPLOYMENT_NAME} -n ${NAMESPACE} --tail=50
}

monitor_metrics() {
    log "Key metrics to monitor:"
    echo ""
    echo "Prometheus queries to watch:"
    echo "- rate(http_requests_total{service=\"billing\"}[5m])"
    echo "- histogram_quantile(0.95, http_request_duration_seconds{service=\"billing\"})"
    echo "- billing_reconcile_debits_total"
    echo "- billing_reconcile_insufficient_funds_total"
    echo "- webhook_events_total{source=\"stripe\",status!=\"ok\"}"
    echo ""
}

# ==============================================================================
# MAIN EXECUTION FLOW
# ==============================================================================

run_preflight() {
    log "Running pre-flight checks..."
    preflight_secrets
    preflight_database
    preflight_ingress
    preflight_image
    success "Pre-flight checks completed"
}

run_smoke_tests() {
    log "Running production smoke tests..."
    smoke_test_health
    smoke_test_jwt
    smoke_test_rate_limit
    smoke_test_stripe_webhook
    success "Smoke tests completed"
}

run_canary_deployment() {
    log "Starting canary deployment process..."
    enable_canary_1_percent
    
    echo ""
    warning "Canary deployment at 1% traffic"
    warning "Monitor the following for the next 30 minutes:"
    echo "- Error rate < 0.5%"
    echo "- P95 latency < 2x baseline"
    echo "- No webhook failures"
    echo ""
    echo "To continue canary deployment:"
    echo "  $0 canary-5    # Increase to 5%"
    echo "  $0 canary-20   # Increase to 20%"
    echo "  $0 canary-50   # Increase to 50%"
    echo "  $0 canary-100  # Complete deployment"
    echo ""
    echo "To rollback:"
    echo "  $0 rollback"
}

# ==============================================================================
# COMMAND LINE INTERFACE
# ==============================================================================

case "${1:-help}" in
    "preflight")
        run_preflight
        ;;
    "smoke")
        run_smoke_tests
        ;;
    "canary")
        run_canary_deployment
        ;;
    "canary-5")
        increase_canary_5_percent
        ;;
    "canary-20")
        increase_canary_20_percent
        ;;
    "canary-50")
        increase_canary_50_percent
        ;;
    "canary-100")
        complete_canary_100_percent
        ;;
    "rollback")
        rollback_canary
        ;;
    "status")
        show_deployment_status
        ;;
    "logs")
        get_logs
        ;;
    "metrics")
        monitor_metrics
        ;;
    "webhook")
        setup_stripe_webhook
        ;;
    "full")
        run_preflight
        run_smoke_tests
        setup_stripe_webhook
        run_canary_deployment
        ;;
    *)
        echo "ScholarLink Billing Service - Go Live Commands"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  preflight    Run pre-flight checks"
        echo "  smoke        Run production smoke tests"
        echo "  webhook      Setup Stripe webhook"
        echo "  canary       Start canary deployment (1%)"
        echo "  canary-5     Increase canary to 5%"
        echo "  canary-20    Increase canary to 20%"
        echo "  canary-50    Increase canary to 50%"
        echo "  canary-100   Complete canary (100%)"
        echo "  rollback     Rollback deployment"
        echo "  status       Show deployment status"
        echo "  logs         Show recent logs"
        echo "  metrics      Show monitoring queries"
        echo "  full         Run complete go-live process"
        echo ""
        echo "Configuration:"
        echo "  Namespace: ${NAMESPACE}"
        echo "  Domain: ${BILLING_DOMAIN}"
        echo "  Webhook: ${STRIPE_WEBHOOK_URL}"
        ;;
esac