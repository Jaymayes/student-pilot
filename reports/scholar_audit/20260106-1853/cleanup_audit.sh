#!/bin/bash
# cleanup_audit.sh - Idempotent removal of namespace=simulated_audit data
# Scholar Ecosystem Audit Cleanup Script
# Date: 2026-01-06
# 
# This script removes all test data created during the audit process.
# All data was tagged with namespace=simulated_audit for easy cleanup.
#
# Usage: ./cleanup_audit.sh [--dry-run]
#
# HUMAN_APPROVAL_REQUIRED before running in production

set -euo pipefail

# Configuration
NAMESPACE="simulated_audit"
DRY_RUN="${1:-}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/tmp/cleanup_audit_${TIMESTAMP}.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

execute_or_dry_run() {
    local description="$1"
    local command="$2"
    
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        log "[DRY-RUN] Would execute: $description"
        log "  Command: $command"
    else
        log "Executing: $description"
        eval "$command" || warn "Command failed: $description"
    fi
}

echo "========================================"
echo "Scholar Ecosystem Audit Cleanup Script"
echo "========================================"
echo "Namespace: $NAMESPACE"
echo "Timestamp: $TIMESTAMP"
echo "Log file: $LOG_FILE"
if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "Mode: DRY RUN (no changes will be made)"
else
    echo "Mode: LIVE (changes will be applied)"
    warn "HUMAN_APPROVAL_REQUIRED - Press Ctrl+C within 5 seconds to abort"
    sleep 5
fi
echo "========================================"

# 1. Clean A8 Command Center audit events
log "Step 1: Cleaning A8 audit events (namespace=$NAMESPACE)"
execute_or_dry_run "Delete A8 events with namespace=simulated_audit" \
    "curl -s -X DELETE 'https://auto-com-center-jamarrlmayes.replit.app/api/events?namespace=$NAMESPACE' -H 'Content-Type: application/json' || echo 'A8 cleanup skipped (endpoint may not exist)'"

# 2. Clean local audit artifacts (optional - keep for reference)
log "Step 2: Local audit artifacts"
warn "Audit reports in reports/scholar_audit/ are preserved for reference"
warn "To remove: rm -rf reports/scholar_audit/"

# 3. Clean any test users created in staging
log "Step 3: Test user cleanup"
execute_or_dry_run "Remove test users with namespace tag" \
    "echo 'No test users created - skipped'"

# 4. Clean any test scholarships created
log "Step 4: Test scholarship cleanup"
execute_or_dry_run "Remove test scholarships with namespace tag" \
    "echo 'No test scholarships created - skipped'"

# 5. Clean any test providers created in A6 (if A6 was operational)
log "Step 5: Test provider cleanup"
execute_or_dry_run "Remove test providers with namespace tag" \
    "echo 'A6 was down - no test providers created'"

# 6. Verify cleanup
log "Step 6: Verification"
if [[ "$DRY_RUN" != "--dry-run" ]]; then
    log "Checking A8 for remaining audit events..."
    REMAINING=$(curl -s "https://auto-com-center-jamarrlmayes.replit.app/api/events?namespace=$NAMESPACE" 2>/dev/null | grep -c "simulated_audit" || echo "0")
    if [[ "$REMAINING" == "0" ]]; then
        log "✅ No remaining audit events found"
    else
        warn "⚠️  $REMAINING audit events may still exist"
    fi
fi

# Summary
echo ""
echo "========================================"
echo "Cleanup Complete"
echo "========================================"
log "Log saved to: $LOG_FILE"

if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo ""
    echo "This was a DRY RUN. No changes were made."
    echo "To execute cleanup, run: ./cleanup_audit.sh"
fi

echo ""
echo "Note: Audit report artifacts are preserved in reports/scholar_audit/"
echo "========================================"
