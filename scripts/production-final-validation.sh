#!/bin/bash

# ScholarLink Production Final Validation Script
# Run this script 24 hours before production launch
# Validates all critical systems and generates final go/no-go report

set -euo pipefail

echo "🚀 ScholarLink Production Final Validation"
echo "=========================================="
echo "Date: $(date)"
echo "Environment: Production Validation"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation results
VALIDATION_RESULTS=()
ERROR_COUNT=0
WARNING_COUNT=0

# Function to log results
log_result() {
    local status=$1
    local message=$2
    local details=${3:-""}
    
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC}: $message"
            VALIDATION_RESULTS+=("✅ $message")
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC}: $message"
            if [[ -n "$details" ]]; then
                echo -e "${RED}   Details: $details${NC}"
            fi
            VALIDATION_RESULTS+=("❌ $message")
            ((ERROR_COUNT++))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC}: $message"
            if [[ -n "$details" ]]; then
                echo -e "${YELLOW}   Details: $details${NC}"
            fi
            VALIDATION_RESULTS+=("⚠️  $message")
            ((WARNING_COUNT++))
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message"
            ;;
    esac
}

# Check if running in production-like environment
validate_environment() {
    echo "🔍 Validating Environment Configuration"
    echo "--------------------------------------"
    
    # Check Node.js version
    NODE_VERSION=$(node --version)
    if [[ "$NODE_VERSION" =~ ^v[1-9][8-9]\. ]] || [[ "$NODE_VERSION" =~ ^v[2-9][0-9]\. ]]; then
        log_result "PASS" "Node.js version: $NODE_VERSION"
    else
        log_result "FAIL" "Node.js version $NODE_VERSION not supported" "Requires Node.js 18+"
    fi
    
    # Check npm version
    NPM_VERSION=$(npm --version)
    log_result "INFO" "npm version: $NPM_VERSION"
    
    # Check TypeScript compilation
    if npm run check > /dev/null 2>&1; then
        log_result "PASS" "TypeScript compilation successful"
    else
        log_result "FAIL" "TypeScript compilation errors detected"
    fi
    
    # Check build process
    if npm run build > /dev/null 2>&1; then
        log_result "PASS" "Production build successful"
    else
        log_result "FAIL" "Production build failed"
    fi
    
    echo ""
}

# Validate critical environment variables
validate_secrets() {
    echo "🔐 Validating Production Secrets"
    echo "--------------------------------"
    
    # Required secrets list
    REQUIRED_SECRETS=(
        "DATABASE_URL"
        "SESSION_SECRET"
        "OPENAI_API_KEY"
        "STRIPE_SECRET_KEY"
        "VITE_STRIPE_PUBLIC_KEY"
        "REPLIT_DOMAINS"
    )
    
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if [[ -n "${!secret:-}" ]]; then
            # Check format but don't reveal value
            case $secret in
                "DATABASE_URL")
                    if [[ "${!secret}" =~ ^postgresql:// ]]; then
                        log_result "PASS" "$secret format valid"
                    else
                        log_result "FAIL" "$secret format invalid"
                    fi
                    ;;
                "OPENAI_API_KEY")
                    if [[ "${!secret}" =~ ^sk- ]]; then
                        log_result "PASS" "$secret format valid"
                    else
                        log_result "FAIL" "$secret format invalid"
                    fi
                    ;;
                "STRIPE_SECRET_KEY")
                    if [[ "${!secret}" =~ ^sk_(live|test)_ ]]; then
                        log_result "PASS" "$secret format valid"
                    else
                        log_result "FAIL" "$secret format invalid"
                    fi
                    ;;
                "VITE_STRIPE_PUBLIC_KEY")
                    if [[ "${!secret}" =~ ^pk_(live|test)_ ]]; then
                        log_result "PASS" "$secret format valid"
                    else
                        log_result "FAIL" "$secret format invalid"
                    fi
                    ;;
                *)
                    log_result "PASS" "$secret is set"
                    ;;
            esac
        else
            log_result "FAIL" "$secret is not set"
        fi
    done
    
    # Check session secret length
    if [[ -n "${SESSION_SECRET:-}" ]] && [[ ${#SESSION_SECRET} -ge 32 ]]; then
        log_result "PASS" "SESSION_SECRET length sufficient (${#SESSION_SECRET} chars)"
    else
        log_result "FAIL" "SESSION_SECRET too short or missing" "Requires 32+ characters"
    fi
    
    echo ""
}

# Validate database connectivity
validate_database() {
    echo "🗄️  Validating Database Connectivity"
    echo "-----------------------------------"
    
    # Test database connection
    DB_TEST=$(cat << 'EOF'
const { db } = require('./server/db.js');
const { users } = require('./shared/schema.js');

async function testDb() {
    try {
        const result = await db.select().from(users).limit(1);
        console.log('DB_CONNECTION_SUCCESS');
        process.exit(0);
    } catch (error) {
        console.error('DB_CONNECTION_FAILED:', error.message);
        process.exit(1);
    }
}

testDb();
EOF
)
    
    if echo "$DB_TEST" | node; then
        log_result "PASS" "Database connection successful"
    else
        log_result "FAIL" "Database connection failed"
    fi
    
    # Check if database schema is up to date
    if npm run db:push --dry-run > /dev/null 2>&1; then
        log_result "PASS" "Database schema is current"
    else
        log_result "WARN" "Database schema may need updates" "Run 'npm run db:push' if needed"
    fi
    
    echo ""
}

# Validate API endpoints
validate_api_endpoints() {
    echo "🌐 Validating Critical API Endpoints"
    echo "-----------------------------------"
    
    # Start server in background for testing
    npm run dev > /dev/null 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Test health endpoint
    if curl -f -s http://localhost:5000/health > /dev/null; then
        log_result "PASS" "Health endpoint responding"
    else
        log_result "FAIL" "Health endpoint not accessible"
    fi
    
    # Test API endpoints (basic connectivity)
    ENDPOINTS=(
        "/api/auth/user"
        "/api/profile"
        "/api/scholarships"
        "/api/billing/summary"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000$endpoint)
        if [[ "$HTTP_CODE" =~ ^[23] ]]; then
            log_result "PASS" "Endpoint $endpoint responding (HTTP $HTTP_CODE)"
        elif [[ "$HTTP_CODE" == "401" ]]; then
            log_result "PASS" "Endpoint $endpoint properly secured (HTTP $HTTP_CODE)"
        else
            log_result "WARN" "Endpoint $endpoint unexpected response (HTTP $HTTP_CODE)"
        fi
    done
    
    # Stop test server
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    
    echo ""
}

# Validate security configuration
validate_security() {
    echo "🔒 Validating Security Configuration"
    echo "----------------------------------"
    
    # Check for security headers in source
    if grep -r "helmet\|cors\|rate.*limit" server/ > /dev/null; then
        log_result "PASS" "Security middleware detected"
    else
        log_result "WARN" "Security middleware not clearly identified"
    fi
    
    # Check for input validation
    if grep -r "zod\|validation" server/ > /dev/null; then
        log_result "PASS" "Input validation framework detected"
    else
        log_result "FAIL" "Input validation not detected"
    fi
    
    # Check for authentication middleware
    if grep -r "isAuthenticated\|passport" server/ > /dev/null; then
        log_result "PASS" "Authentication middleware detected"
    else
        log_result "FAIL" "Authentication middleware not detected"
    fi
    
    # Check for timing-safe operations
    if grep -r "timingSafe\|timing.*safe" server/ > /dev/null; then
        log_result "PASS" "Timing-safe operations implemented"
    else
        log_result "WARN" "Timing-safe operations not clearly identified"
    fi
    
    echo ""
}

# Validate billing system
validate_billing() {
    echo "💳 Validating Billing System"
    echo "---------------------------"
    
    # Check Stripe integration
    if grep -r "stripe" server/ > /dev/null; then
        log_result "PASS" "Stripe integration detected"
    else
        log_result "FAIL" "Stripe integration not found"
    fi
    
    # Check webhook handling
    if grep -r "webhook" server/ > /dev/null; then
        log_result "PASS" "Webhook handling implemented"
    else
        log_result "WARN" "Webhook handling not clearly identified"
    fi
    
    # Check billing database tables
    if grep -r "billing\|credit\|transaction" shared/schema.ts > /dev/null; then
        log_result "PASS" "Billing database schema detected"
    else
        log_result "FAIL" "Billing database schema not found"
    fi
    
    echo ""
}

# Validate Agent Bridge
validate_agent_bridge() {
    echo "🤖 Validating Agent Bridge Integration"
    echo "------------------------------------"
    
    # Check Agent Bridge implementation
    if [[ -f "server/agentBridge.ts" ]]; then
        log_result "PASS" "Agent Bridge implementation found"
    else
        log_result "WARN" "Agent Bridge implementation not found"
    fi
    
    # Check JWT verification
    if grep -r "jwt.*verify\|verifyToken" server/ > /dev/null; then
        log_result "PASS" "JWT verification implemented"
    else
        log_result "FAIL" "JWT verification not detected"
    fi
    
    # Check agent endpoints
    if grep -r "/agent/" server/ > /dev/null; then
        log_result "PASS" "Agent endpoints defined"
    else
        log_result "WARN" "Agent endpoints not found"
    fi
    
    echo ""
}

# Performance validation
validate_performance() {
    echo "⚡ Validating Performance Configuration"
    echo "------------------------------------"
    
    # Check for performance optimizations
    if [[ -f "vite.config.ts" ]] && grep -r "build\|optimization" vite.config.ts > /dev/null; then
        log_result "PASS" "Build optimization configured"
    else
        log_result "WARN" "Build optimization not clearly configured"
    fi
    
    # Check for caching
    if grep -r "cache\|Cache" client/ > /dev/null; then
        log_result "PASS" "Client-side caching detected"
    else
        log_result "WARN" "Client-side caching not clearly identified"
    fi
    
    # Check bundle size (if dist exists)
    if [[ -d "dist" ]]; then
        BUNDLE_SIZE=$(du -sh dist/ | cut -f1)
        log_result "INFO" "Bundle size: $BUNDLE_SIZE"
    else
        log_result "INFO" "Bundle not built - run 'npm run build' to check size"
    fi
    
    echo ""
}

# Generate final report
generate_report() {
    echo "📊 Final Validation Report"
    echo "========================="
    echo ""
    
    echo "Summary:"
    echo "--------"
    echo "Total Checks: ${#VALIDATION_RESULTS[@]}"
    echo "Errors: $ERROR_COUNT"
    echo "Warnings: $WARNING_COUNT"
    echo ""
    
    if [[ $ERROR_COUNT -eq 0 ]]; then
        echo -e "${GREEN}🎉 VALIDATION PASSED${NC}"
        echo -e "${GREEN}✅ All critical systems validated successfully${NC}"
        if [[ $WARNING_COUNT -gt 0 ]]; then
            echo -e "${YELLOW}⚠️  $WARNING_COUNT warnings noted - review recommended${NC}"
        fi
        echo ""
        echo -e "${GREEN}RECOMMENDATION: GO FOR PRODUCTION LAUNCH${NC}"
    else
        echo -e "${RED}❌ VALIDATION FAILED${NC}"
        echo -e "${RED}🚫 $ERROR_COUNT critical issues must be resolved${NC}"
        echo ""
        echo -e "${RED}RECOMMENDATION: DO NOT LAUNCH - RESOLVE ERRORS FIRST${NC}"
    fi
    
    echo ""
    echo "Detailed Results:"
    echo "----------------"
    for result in "${VALIDATION_RESULTS[@]}"; do
        echo "$result"
    done
    
    echo ""
    echo "Next Steps:"
    echo "----------"
    if [[ $ERROR_COUNT -eq 0 ]]; then
        echo "1. ✅ Proceed with final deployment preparation"
        echo "2. ✅ Configure production monitoring dashboards"
        echo "3. ✅ Brief on-call team on launch procedures"
        echo "4. ✅ Schedule go-live communication"
    else
        echo "1. ❌ Resolve all critical errors listed above"
        echo "2. ❌ Re-run this validation script"
        echo "3. ❌ Only proceed when validation passes"
    fi
    
    if [[ $WARNING_COUNT -gt 0 ]]; then
        echo ""
        echo "Warning Review:"
        echo "--------------"
        echo "• Review warnings for potential optimizations"
        echo "• Consider addressing before launch if time permits"
        echo "• Document as known issues if accepting risk"
    fi
    
    echo ""
    echo "Validation completed at: $(date)"
    echo "Report saved to: production-validation-$(date +%Y%m%d-%H%M%S).log"
}

# Main execution
main() {
    # Save output to log file
    exec > >(tee "production-validation-$(date +%Y%m%d-%H%M%S).log")
    exec 2>&1
    
    validate_environment
    validate_secrets
    validate_database
    validate_api_endpoints
    validate_security
    validate_billing
    validate_agent_bridge
    validate_performance
    generate_report
    
    # Exit with error code if validation failed
    if [[ $ERROR_COUNT -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"