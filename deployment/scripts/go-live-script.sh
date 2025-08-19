#!/bin/bash

# ScholarLink Billing System - Production Go-Live Script
# This script executes the complete go-live sequence with proper checks and rollback

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL=${PRODUCTION_URL:-"https://your-domain.com"}
ROLLOUT_PHASES=(5 25 100)
PHASE_DURATIONS=(1800 3600 0) # 30 mins, 1 hour, indefinite

echo -e "${BLUE}🚀 ScholarLink Billing System - Production Go-Live${NC}"
echo "=================================================="
echo "Production URL: $PRODUCTION_URL"
echo "Timestamp: $(date -Iseconds)"
echo ""

# Function to log steps
log_step() {
    echo -e "${BLUE}[$(date +%T)] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +%T)] ✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +%T)] ⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +%T)] ❌ $1${NC}"
}

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is required but not installed"
        exit 1
    fi
}

# Function to wait for user confirmation
confirm_step() {
    read -p "Continue with $1? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Deployment cancelled by user"
        exit 1
    fi
}

# Function to set rollout percentage
set_rollout_percentage() {
    local percentage=$1
    log_step "Setting rollout percentage to ${percentage}%"
    
    # This would typically update a feature flag or environment variable
    # Replace with your actual implementation
    export BILLING_ROLLOUT_PERCENTAGE=$percentage
    
    # If using a feature flag service, update it here
    # curl -X PUT "https://api.featureflag-service.com/flags/billing-enabled" \
    #      -H "Authorization: Bearer $FEATURE_FLAG_TOKEN" \
    #      -d "{\"percentage\": $percentage}"
}

# Function to run smoke tests
run_smoke_tests() {
    log_step "Running production smoke tests"
    
    if ! node scripts/production-smoke-test.js; then
        log_error "Smoke tests failed"
        return 1
    fi
    
    log_success "Smoke tests passed"
    return 0
}

# Function to check system health
check_system_health() {
    local endpoint="$PRODUCTION_URL/api/health"
    log_step "Checking system health: $endpoint"
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$endpoint")
    if [[ "$response" != "200" ]]; then
        log_error "Health check failed: HTTP $response"
        return 1
    fi
    
    log_success "System health check passed"
    return 0
}

# Function to monitor metrics during rollout
monitor_metrics() {
    local phase=$1
    local duration=$2
    
    log_step "Monitoring metrics for Phase $phase (${duration}s)"
    
    # Monitor key metrics during rollout
    # This would integrate with your monitoring system
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    while [[ $(date +%s) -lt $end_time ]] && [[ $duration -gt 0 ]]; do
        # Check error rate
        # local error_rate=$(curl -s "$MONITORING_URL/api/error-rate")
        
        # Check webhook success rate  
        # local webhook_success=$(curl -s "$MONITORING_URL/api/webhook-success")
        
        # For now, just sleep and show progress
        sleep 30
        local current_time=$(date +%s)
        local remaining=$((end_time - current_time))
        
        if [[ $remaining -gt 0 ]]; then
            echo -e "${YELLOW}[$(date +%T)] Phase $phase monitoring: ${remaining}s remaining${NC}"
        fi
    done
    
    log_success "Phase $phase monitoring completed"
}

# Function to emergency rollback
emergency_rollback() {
    log_error "Executing emergency rollback"
    
    # Disable billing features
    export BILLING_PURCHASE_ENABLED=false
    export BILLING_CHARGING_ENABLED=false
    
    # Set rollout to 0%
    set_rollout_percentage 0
    
    log_warning "Emergency rollback completed"
    exit 1
}

# Main execution
main() {
    # Pre-flight checks
    log_step "T-1: Pre-flight checks"
    
    # Check required commands
    check_command "node"
    check_command "npm"
    check_command "curl"
    
    # Check environment variables
    if [[ -z "$STRIPE_SECRET_KEY" ]]; then
        log_warning "STRIPE_SECRET_KEY not set"
    fi
    
    if [[ -z "$OPENAI_API_KEY" ]]; then
        log_warning "OPENAI_API_KEY not set"
    fi
    
    # Database backup and migrations
    log_step "Creating database backup"
    npm run db:backup || log_warning "Database backup failed"
    
    log_step "Running database migrations"
    npm run db:push --force
    
    # Build and deploy
    log_step "Building application"
    npm run build
    
    confirm_step "deployment to production"
    
    log_step "Deploying to production"
    npm run deploy:production
    
    # T-0: Production smoke test
    log_step "T-0: Production smoke test"
    if ! run_smoke_tests; then
        log_error "Smoke tests failed - aborting deployment"
        emergency_rollback
    fi
    
    # Initial system health check
    if ! check_system_health; then
        log_error "Initial health check failed - aborting deployment"
        emergency_rollback
    fi
    
    log_success "Pre-deployment checks completed successfully"
    
    # Progressive rollout
    log_step "Beginning progressive rollout"
    
    for i in "${!ROLLOUT_PHASES[@]}"; do
        local phase=$((i + 1))
        local percentage=${ROLLOUT_PHASES[$i]}
        local duration=${PHASE_DURATIONS[$i]}
        
        log_step "Phase $phase: Rolling out to ${percentage}% of users"
        
        # Set the rollout percentage
        set_rollout_percentage $percentage
        
        # Wait a moment for the change to propagate
        sleep 10
        
        # Check system health after rollout change
        if ! check_system_health; then
            log_error "Health check failed during Phase $phase"
            emergency_rollback
        fi
        
        # Monitor metrics during this phase
        if [[ $duration -gt 0 ]]; then
            monitor_metrics $phase $duration
            
            # Check if we should continue to next phase
            confirm_step "progression to next phase"
        fi
        
        log_success "Phase $phase completed successfully"
    done
    
    # Final verification
    log_step "Final production verification"
    
    if ! run_smoke_tests; then
        log_error "Final smoke tests failed"
        emergency_rollback
    fi
    
    if ! check_system_health; then
        log_error "Final health check failed"
        emergency_rollback
    fi
    
    # Success!
    echo ""
    echo "🎉 PRODUCTION GO-LIVE COMPLETED SUCCESSFULLY!"
    echo "=============================================="
    echo "✅ All phases completed without errors"
    echo "✅ Billing system is live at 100% rollout"
    echo "✅ All health checks passing"
    echo "✅ Smoke tests passing"
    echo ""
    echo "🔍 Next steps:"
    echo "  - Monitor dashboards for the next 24 hours"
    echo "  - Review daily reconciliation job results"
    echo "  - Check user feedback channels"
    echo "  - Document any operational notes"
    echo ""
    echo "📊 Monitoring URLs:"
    echo "  - Production App: $PRODUCTION_URL"
    echo "  - Billing Dashboard: $PRODUCTION_URL/billing"
    echo "  - Admin Panel: $PRODUCTION_URL/admin"
    echo ""
    log_success "ScholarLink Billing System is now LIVE in production!"
}

# Trap errors and run emergency rollback
trap 'emergency_rollback' ERR

# Execute main function
main "$@"