#!/bin/bash

# DNS Activation Monitor for ScholarLink Billing Portal
# This script monitors DNS propagation and certificate issuance in real-time

set -e

# Configuration
HOST="billing.scholarlink.app"
NAMESPACE="scholarlink-prod"
CERTIFICATE_NAME="billing-scholarlink-app-tls"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $1"
}

# Function to check DNS resolution
check_dns() {
    local servers=("1.1.1.1" "8.8.8.8" "1.0.0.1" "8.8.4.4")
    local resolved_count=0
    local results=()
    
    for server in "${servers[@]}"; do
        local result=$(dig +short "$HOST" @"$server" 2>/dev/null | head -n1)
        if [[ -n "$result" && "$result" != ";;" ]]; then
            results+=("$server: $result")
            ((resolved_count++))
        else
            results+=("$server: NXDOMAIN")
        fi
    done
    
    if [[ $resolved_count -ge 2 ]]; then
        success "DNS resolving on $resolved_count/4 servers"
        for result in "${results[@]}"; do
            echo "    $result"
        done
        return 0
    else
        warning "DNS not fully propagated ($resolved_count/4 servers)"
        for result in "${results[@]}"; do
            echo "    $result"
        done
        return 1
    fi
}

# Function to check certificate status
check_certificate() {
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        error "Namespace $NAMESPACE not found"
        return 1
    fi
    
    local cert_status=$(kubectl -n "$NAMESPACE" get certificate "$CERTIFICATE_NAME" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "NotFound")
    
    case "$cert_status" in
        "True")
            success "Certificate Ready"
            local expiry=$(kubectl -n "$NAMESPACE" get certificate "$CERTIFICATE_NAME" -o jsonpath='{.status.notAfter}' 2>/dev/null)
            echo "    Expires: $expiry"
            return 0
            ;;
        "False")
            warning "Certificate not ready yet"
            local reason=$(kubectl -n "$NAMESPACE" get certificate "$CERTIFICATE_NAME" -o jsonpath='{.status.conditions[?(@.type=="Ready")].reason}' 2>/dev/null)
            local message=$(kubectl -n "$NAMESPACE" get certificate "$CERTIFICATE_NAME" -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}' 2>/dev/null)
            echo "    Reason: $reason"
            echo "    Message: $message"
            return 1
            ;;
        "NotFound")
            error "Certificate $CERTIFICATE_NAME not found"
            return 1
            ;;
        *)
            warning "Certificate status unknown: $cert_status"
            return 1
            ;;
    esac
}

# Function to check HTTPS access
check_https() {
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$HOST" 2>/dev/null || echo "000")
    
    if [[ "$http_status" == "200" ]]; then
        success "HTTPS access working (Status: $http_status)"
        
        # Check SSL certificate details
        local ssl_info=$(echo | openssl s_client -servername "$HOST" -connect "$HOST":443 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null || echo "SSL check failed")
        if [[ "$ssl_info" != "SSL check failed" ]]; then
            echo "    SSL Certificate Details:"
            echo "$ssl_info" | sed 's/^/      /'
        fi
        return 0
    else
        warning "HTTPS not accessible (Status: $http_status)"
        return 1
    fi
}

# Function to run production validation
run_validation() {
    if [[ -f "./deployment/billing/production-validation.sh" ]]; then
        log "Running production validation suite..."
        if bash ./deployment/billing/production-validation.sh all >/dev/null 2>&1; then
            success "Production validation passed"
            return 0
        else
            warning "Production validation has issues"
            return 1
        fi
    else
        warning "Production validation script not found"
        return 1
    fi
}

# Main monitoring function
monitor_activation() {
    local max_attempts=60  # 30 minutes maximum
    local attempt=1
    local dns_ready=false
    local cert_ready=false
    local https_ready=false
    
    log "Starting DNS activation monitoring for $HOST"
    log "Press Ctrl+C to stop monitoring"
    echo
    
    while [[ $attempt -le $max_attempts ]]; do
        echo -e "${BLUE}=== Attempt $attempt/$max_attempts ===${NC}"
        
        # Check DNS resolution
        if [[ "$dns_ready" == false ]]; then
            if check_dns; then
                dns_ready=true
            fi
        else
            success "DNS resolution confirmed"
        fi
        
        # Check certificate (only if DNS is ready)
        if [[ "$dns_ready" == true && "$cert_ready" == false ]]; then
            if check_certificate; then
                cert_ready=true
            fi
        elif [[ "$dns_ready" == true ]]; then
            success "Certificate ready"
        fi
        
        # Check HTTPS access (only if certificate is ready)
        if [[ "$cert_ready" == true && "$https_ready" == false ]]; then
            if check_https; then
                https_ready=true
            fi
        elif [[ "$cert_ready" == true ]]; then
            success "HTTPS access confirmed"
        fi
        
        # If everything is ready, run final validation
        if [[ "$dns_ready" == true && "$cert_ready" == true && "$https_ready" == true ]]; then
            echo
            success "🎉 ScholarLink Billing Portal is LIVE at https://$HOST"
            
            # Run final validation
            run_validation
            
            echo
            log "Next steps:"
            echo "  1. Test credit package purchases"
            echo "  2. Verify Stripe webhook delivery"
            echo "  3. Monitor performance metrics"
            echo "  4. Update DNS provider proxy settings if needed"
            
            break
        fi
        
        echo
        if [[ $attempt -lt $max_attempts ]]; then
            log "Waiting 30 seconds before next check..."
            sleep 30
        fi
        
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "Activation monitoring timed out after 30 minutes"
        echo
        log "Current status:"
        echo "  DNS Ready: $dns_ready"
        echo "  Certificate Ready: $cert_ready"
        echo "  HTTPS Ready: $https_ready"
        echo
        log "Manual troubleshooting commands:"
        echo "  kubectl -n $NAMESPACE describe certificate $CERTIFICATE_NAME"
        echo "  kubectl -n $NAMESPACE get challenges"
        echo "  dig +short $HOST @1.1.1.1"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    local missing_tools=()
    
    for tool in kubectl dig curl openssl; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi
    
    # Check kubectl access
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "kubectl cannot access the cluster"
        echo "Please ensure you have valid kubectl configuration."
        exit 1
    fi
}

# Main execution
main() {
    case "${1:-monitor}" in
        "monitor")
            check_prerequisites
            monitor_activation
            ;;
        "dns")
            check_dns
            ;;
        "cert")
            check_certificate
            ;;
        "https")
            check_https
            ;;
        "validate")
            run_validation
            ;;
        "help")
            echo "Usage: $0 [command]"
            echo "Commands:"
            echo "  monitor  - Full activation monitoring (default)"
            echo "  dns      - Check DNS resolution only"
            echo "  cert     - Check certificate status only"
            echo "  https    - Check HTTPS access only"
            echo "  validate - Run production validation only"
            echo "  help     - Show this help"
            ;;
        *)
            error "Unknown command: $1"
            echo "Run '$0 help' for usage information."
            exit 1
            ;;
    esac
}

main "$@"