#!/bin/bash

# ScholarLink Progressive Canary Deployment Script
# Automates traffic splitting with health monitoring and rollback capability

set -euo pipefail

# Configuration
NAMESPACE="scholarlink-prod"
APP_NAME="scholarlink"
DEPLOYMENT_VERSION="${1:-latest}"
IMAGE_DIGEST="${2:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Monitoring thresholds
MAX_ERROR_RATE="0.005"  # 0.5%
MAX_LATENCY_MULTIPLIER="2"
MIN_SUCCESS_DURATION="300"  # 5 minutes per stage

echo "🚀 ScholarLink Progressive Canary Deployment"
echo "============================================="
echo "Version: $DEPLOYMENT_VERSION"
echo "Namespace: $NAMESPACE"
echo "Image: ${IMAGE_DIGEST:-latest}"
echo ""

# Function to send notifications
notify() {
    local message="$1"
    local level="${2:-info}"
    
    echo "[$level] $message"
    
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"ScholarLink Canary [$level]: $message\"}" \
            "$SLACK_WEBHOOK" || true
    fi
}

# Function to get baseline metrics
get_baseline_metrics() {
    echo "📊 Collecting baseline metrics..."
    
    # Get current error rate
    BASELINE_ERROR_RATE=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'rate(http_requests_total{job="scholarlink-service",status_code=~"5.."}[5m]) / rate(http_requests_total{job="scholarlink-service"}[5m])' \
        --time="$(date -Iseconds)" | grep -oP '^\d+\.\d+' || echo "0")
    
    # Get current latency (p95)
    BASELINE_LATENCY=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="scholarlink-service"}[5m]))' \
        --time="$(date -Iseconds)" | grep -oP '^\d+\.\d+' || echo "0.5")
    
    echo "Baseline error rate: ${BASELINE_ERROR_RATE:-0}"
    echo "Baseline p95 latency: ${BASELINE_LATENCY:-0.5}s"
}

# Function to check canary health
check_canary_health() {
    local stage="$1"
    local duration="$2"
    
    echo "🔍 Monitoring canary health for stage $stage (${duration}s)..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        # Check error rate
        local current_error_rate=$(kubectl exec -n monitoring deployment/prometheus -- \
            promtool query instant 'rate(http_requests_total{job="scholarlink-service-canary",status_code=~"5.."}[2m]) / rate(http_requests_total{job="scholarlink-service-canary"}[2m])' \
            --time="$(date -Iseconds)" | grep -oP '^\d+\.\d+' || echo "0")
        
        # Check latency
        local current_latency=$(kubectl exec -n monitoring deployment/prometheus -- \
            promtool query instant 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="scholarlink-service-canary"}[2m]))' \
            --time="$(date -Iseconds)" | grep -oP '^\d+\.\d+' || echo "0.5")
        
        # Check pod health
        local healthy_pods=$(kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME,deployment=canary" --field-selector=status.phase=Running -o name | wc -l)
        local total_pods=$(kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME,deployment=canary" -o name | wc -l)
        
        echo "  Error rate: ${current_error_rate:-0} (max: $MAX_ERROR_RATE)"
        echo "  P95 latency: ${current_latency:-0.5}s (max: $(echo "$BASELINE_LATENCY * $MAX_LATENCY_MULTIPLIER" | bc)s)"
        echo "  Healthy pods: $healthy_pods/$total_pods"
        
        # Check thresholds
        if (( $(echo "${current_error_rate:-0} > $MAX_ERROR_RATE" | bc -l) )); then
            notify "❌ Canary stage $stage FAILED: Error rate ${current_error_rate:-0} exceeds threshold $MAX_ERROR_RATE" "error"
            return 1
        fi
        
        local max_latency=$(echo "$BASELINE_LATENCY * $MAX_LATENCY_MULTIPLIER" | bc)
        if (( $(echo "${current_latency:-0.5} > $max_latency" | bc -l) )); then
            notify "❌ Canary stage $stage FAILED: Latency ${current_latency:-0.5}s exceeds threshold ${max_latency}s" "error"
            return 1
        fi
        
        if [[ $healthy_pods -eq 0 ]]; then
            notify "❌ Canary stage $stage FAILED: No healthy pods" "error"
            return 1
        fi
        
        sleep 30
    done
    
    notify "✅ Canary stage $stage PASSED: All health checks successful" "success"
    return 0
}

# Function to apply canary stage
apply_canary_stage() {
    local stage="$1"
    
    echo "🔄 Applying canary stage: $stage% traffic..."
    
    # Remove previous canary ingresses
    kubectl delete ingress -n "$NAMESPACE" -l "app=$APP_NAME,canary-stage" --ignore-not-found=true
    
    # Apply new canary stage
    envsubst < "deployment/canary/canary-ingress.yaml" | \
        grep -A 50 "canary-stage: \"$stage\"" | \
        kubectl apply -f -
    
    # Wait for ingress to be ready
    sleep 30
    
    echo "✅ Canary stage $stage% applied"
}

# Function to rollback canary
rollback_canary() {
    echo "🔄 Rolling back canary deployment..."
    
    # Remove all canary ingresses
    kubectl delete ingress -n "$NAMESPACE" -l "app=$APP_NAME" --selector="nginx.ingress.kubernetes.io/canary=true" --ignore-not-found=true
    
    # Scale down canary deployment
    kubectl scale deployment "$APP_NAME-canary" -n "$NAMESPACE" --replicas=0
    
    # Delete canary deployment
    kubectl delete deployment "$APP_NAME-canary" -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete service "$APP_NAME-service-canary" -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete hpa "$APP_NAME-hpa-canary" -n "$NAMESPACE" --ignore-not-found=true
    
    notify "🔄 Canary deployment rolled back successfully" "warning"
}

# Function to promote canary to stable
promote_canary() {
    echo "🎉 Promoting canary to stable..."
    
    # Remove canary ingresses
    kubectl delete ingress -n "$NAMESPACE" -l "app=$APP_NAME" --selector="nginx.ingress.kubernetes.io/canary=true" --ignore-not-found=true
    
    # Update stable deployment with canary image
    kubectl set image deployment/"$APP_NAME-app" -n "$NAMESPACE" \
        "$APP_NAME=scholarlink@${IMAGE_DIGEST}"
    
    # Wait for rollout to complete
    kubectl rollout status deployment/"$APP_NAME-app" -n "$NAMESPACE" --timeout=600s
    
    # Clean up canary resources
    kubectl delete deployment "$APP_NAME-app-canary" -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete service "$APP_NAME-service-canary" -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete hpa "$APP_NAME-hpa-canary" -n "$NAMESPACE" --ignore-not-found=true
    
    notify "🎉 Canary promoted to stable successfully!" "success"
}

# Main deployment flow
main() {
    # Pre-checks
    if [[ -z "$IMAGE_DIGEST" ]]; then
        echo "❌ IMAGE_DIGEST required for canary deployment"
        exit 1
    fi
    
    # Get baseline metrics
    get_baseline_metrics
    
    # Deploy canary
    echo "🚀 Deploying canary version $DEPLOYMENT_VERSION..."
    export DEPLOYMENT_VERSION IMAGE_DIGEST
    envsubst < "deployment/canary/canary-deployment.yaml" | kubectl apply -f -
    
    # Wait for canary to be ready
    kubectl rollout status deployment/"$APP_NAME-app-canary" -n "$NAMESPACE" --timeout=300s
    
    notify "🚀 Canary deployment $DEPLOYMENT_VERSION started" "info"
    
    # Stage 1: 1% traffic
    apply_canary_stage "1"
    if ! check_canary_health "1" "$MIN_SUCCESS_DURATION"; then
        rollback_canary
        exit 1
    fi
    
    # Stage 2: 5% traffic  
    apply_canary_stage "5"
    if ! check_canary_health "5" "$MIN_SUCCESS_DURATION"; then
        rollback_canary
        exit 1
    fi
    
    # Stage 3: 20% traffic
    apply_canary_stage "20"
    if ! check_canary_health "20" "$MIN_SUCCESS_DURATION"; then
        rollback_canary
        exit 1
    fi
    
    # Stage 4: 50% traffic
    apply_canary_stage "50"
    if ! check_canary_health "50" "$MIN_SUCCESS_DURATION"; then
        rollback_canary
        exit 1
    fi
    
    # All stages passed - promote to stable
    promote_canary
    
    notify "🎉 Canary deployment $DEPLOYMENT_VERSION completed successfully!" "success"
}

# Trap for cleanup on exit
trap 'if [[ $? -ne 0 ]]; then rollback_canary; fi' EXIT

# Run main deployment
main "$@"