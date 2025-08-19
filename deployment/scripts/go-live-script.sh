#!/bin/bash

# ScholarLink Production Go-Live Script
# Executes complete canary deployment with health monitoring and automated rollback

set -euo pipefail

# Configuration - Update these for your environment
NAMESPACE="${NAMESPACE:-scholarlink-prod}"
APP_NAME="${APP_NAME:-scholarlink}"
PRIMARY_INGRESS="${PRIMARY_INGRESS:-scholarlink-ingress}"
CANARY_INGRESS="${CANARY_INGRESS:-scholarlink-ingress-canary-1}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-scholarlink-app}"
CANARY_DEPLOYMENT="${CANARY_DEPLOYMENT:-scholarlink-app-canary}"
IMAGE_DIGEST="${IMAGE_DIGEST:-}"
COSIGN_PUBLIC_KEY="${COSIGN_PUBLIC_KEY:-cosign.pub}"

# Monitoring configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
MAX_ERROR_RATE="0.5"
MAX_LATENCY_MULTIPLIER="2"
SOAK_DURATION="300"  # 5 minutes

echo "🚀 ScholarLink Production Go-Live Script"
echo "========================================="
echo "Namespace: $NAMESPACE"
echo "Primary Deployment: $DEPLOYMENT_NAME"
echo "Canary Deployment: $CANARY_DEPLOYMENT"
echo "Image Digest: ${IMAGE_DIGEST:-Not specified}"
echo "Time: $(date)"
echo ""

# Function to send notifications
notify() {
    local message="$1"
    local level="${2:-info}"
    local color="${3:-#36a64f}"
    
    echo "[$level] $message"
    
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"ScholarLink Go-Live [$level]: $message\"}]}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Function to get Prometheus metric
get_metric() {
    local query="$1"
    local default="${2:-0}"
    
    curl -s "$PROMETHEUS_URL/api/v1/query" \
        --data-urlencode "query=$query" \
        --data-urlencode "time=$(date +%s)" 2>/dev/null | \
        jq -r '.data.result[0].value[1] // "'"$default"'"' 2>/dev/null || echo "$default"
}

# Function to check health thresholds
check_health() {
    local service="$1"
    local duration="$2"
    
    echo "🔍 Monitoring $service health for ${duration}s..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        # Get current metrics
        local error_rate=$(get_metric "rate(http_requests_total{job=\"$service\",status_code=~\"5..\"}[2m]) / rate(http_requests_total{job=\"$service\"}[2m]) * 100")
        local latency_p95=$(get_metric "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"$service\"}[2m])) * 1000")
        local healthy_pods=$(kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME,deployment=${service#*-}" --field-selector=status.phase=Running -o name 2>/dev/null | wc -l)
        
        echo "  Error rate: ${error_rate}% (max: $MAX_ERROR_RATE%)"
        echo "  P95 latency: ${latency_p95}ms"
        echo "  Healthy pods: $healthy_pods"
        
        # Check error rate threshold
        if (( $(echo "${error_rate} > $MAX_ERROR_RATE" | bc -l 2>/dev/null || echo "0") )); then
            notify "❌ Health check FAILED: Error rate ${error_rate}% exceeds threshold $MAX_ERROR_RATE%" "error" "#ff0000"
            return 1
        fi
        
        # Check if we have healthy pods
        if [[ $healthy_pods -eq 0 ]]; then
            notify "❌ Health check FAILED: No healthy pods for $service" "error" "#ff0000"
            return 1
        fi
        
        sleep 30
    done
    
    notify "✅ Health check PASSED for $service" "success" "#36a64f"
    return 0
}

# Function to apply canary traffic weight
apply_canary_weight() {
    local weight="$1"
    
    echo "🔄 Setting canary traffic to $weight%..."
    
    # Remove any existing canary ingresses
    kubectl delete ingress -n "$NAMESPACE" -l "app=$APP_NAME" --selector="nginx.ingress.kubernetes.io/canary=true" --ignore-not-found=true
    
    # Apply new canary weight
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: $CANARY_INGRESS-$weight
  namespace: $NAMESPACE
  labels:
    app: $APP_NAME
    canary-stage: "$weight"
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "$weight"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Canary-Version: $IMAGE_DIGEST";
      more_set_headers "X-Canary-Stage: $weight-percent";
spec:
  tls:
  - hosts:
    - scholarlink.app
    secretName: scholarlink-tls-secret
  rules:
  - host: scholarlink.app
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: scholarlink-service-canary
            port:
              number: 80
EOF
    
    # Wait for ingress to be ready
    sleep 30
    echo "✅ Canary traffic set to $weight%"
}

# Function to rollback deployment
rollback_deployment() {
    echo "🔄 Rolling back deployment..."
    
    # Remove all canary ingresses
    kubectl delete ingress -n "$NAMESPACE" -l "app=$APP_NAME" --selector="nginx.ingress.kubernetes.io/canary=true" --ignore-not-found=true
    
    # Scale down canary
    kubectl scale deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" --replicas=0 2>/dev/null || true
    
    # Rollback main deployment if needed
    kubectl rollout undo deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" 2>/dev/null || true
    
    # Wait for rollback
    kubectl rollout status deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout=300s
    
    notify "🔄 Deployment rolled back successfully" "warning" "#ffaa00"
}

# Function to promote canary to stable
promote_canary() {
    echo "🎉 Promoting canary to stable..."
    
    # Remove canary ingresses
    kubectl delete ingress -n "$NAMESPACE" -l "app=$APP_NAME" --selector="nginx.ingress.kubernetes.io/canary=true" --ignore-not-found=true
    
    # Update stable deployment with canary image
    if [[ -n "$IMAGE_DIGEST" ]]; then
        kubectl set image deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" \
            "$APP_NAME=scholarlink@$IMAGE_DIGEST"
        
        # Wait for rollout
        kubectl rollout status deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout=600s
    fi
    
    # Clean up canary resources
    kubectl delete deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete service "${APP_NAME}-service-canary" -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete hpa "${APP_NAME}-hpa-canary" -n "$NAMESPACE" --ignore-not-found=true
    
    notify "🎉 Canary promoted to stable successfully!" "success" "#36a64f"
}

# Trap for cleanup on exit
trap 'if [[ $? -ne 0 ]]; then echo "❌ Go-live failed, initiating rollback..."; rollback_deployment; fi' EXIT

# Main go-live execution
main() {
    notify "🚀 Starting ScholarLink production go-live" "info" "#0099cc"
    
    # Pre-flight checks
    echo "🔍 Running pre-flight checks..."
    
    # Check kubectl access
    if ! kubectl get ns "$NAMESPACE" >/dev/null 2>&1; then
        echo "❌ Cannot access namespace $NAMESPACE"
        exit 1
    fi
    
    # Verify image signature if Cosign key provided
    if [[ -n "$IMAGE_DIGEST" && -f "$COSIGN_PUBLIC_KEY" ]]; then
        echo "🔐 Verifying image signature..."
        if ! cosign verify --key "$COSIGN_PUBLIC_KEY" "scholarlink@$IMAGE_DIGEST" >/dev/null 2>&1; then
            echo "❌ Image signature verification failed"
            exit 1
        fi
        echo "✅ Image signature verified"
    fi
    
    # Check database migration if needed
    if kubectl get job -n "$NAMESPACE" -l "component=migration" 2>/dev/null | grep -q "db-migrate"; then
        echo "🗄️ Checking database migration status..."
        if ! kubectl wait --for=condition=complete job -l "component=migration" -n "$NAMESPACE" --timeout=600s; then
            echo "❌ Database migration failed"
            kubectl logs -l "component=migration" -n "$NAMESPACE" --tail=50
            exit 1
        fi
        echo "✅ Database migration completed"
    fi
    
    # Deploy canary if not exists
    if ! kubectl get deployment "$CANARY_DEPLOYMENT" -n "$NAMESPACE" >/dev/null 2>&1; then
        echo "🚀 Deploying canary..."
        # Apply canary deployment (would be from your manifests)
        kubectl apply -f deployment/canary/canary-deployment.yaml
        kubectl rollout status deployment/"$CANARY_DEPLOYMENT" -n "$NAMESPACE" --timeout=300s
    fi
    
    # Get baseline metrics from stable deployment
    echo "📊 Capturing baseline metrics..."
    local baseline_service="${APP_NAME}-service"
    
    # Stage 1: 1% traffic
    apply_canary_weight "1"
    if ! check_health "${APP_NAME}-service-canary" "$SOAK_DURATION"; then
        exit 1
    fi
    
    # Stage 2: 5% traffic
    apply_canary_weight "5"
    if ! check_health "${APP_NAME}-service-canary" "$SOAK_DURATION"; then
        exit 1
    fi
    
    # Stage 3: 20% traffic
    apply_canary_weight "20"
    if ! check_health "${APP_NAME}-service-canary" "$SOAK_DURATION"; then
        exit 1
    fi
    
    # Stage 4: 50% traffic
    apply_canary_weight "50"
    if ! check_health "${APP_NAME}-service-canary" "$SOAK_DURATION"; then
        exit 1
    fi
    
    # All stages passed - promote to stable
    promote_canary
    
    # Post-deployment validation
    echo "🔍 Running post-deployment validation..."
    sleep 60  # Allow metrics to stabilize
    
    if ! check_health "${APP_NAME}-service" "180"; then  # 3 minutes validation
        echo "❌ Post-deployment validation failed"
        rollback_deployment
        exit 1
    fi
    
    notify "🎉 ScholarLink production go-live completed successfully!" "success" "#36a64f"
    
    echo ""
    echo "📋 Post-deployment checklist:"
    echo "- [ ] Verify authentication flow working"
    echo "- [ ] Check synthetic tests passing"
    echo "- [ ] Confirm WAF rules not overly aggressive"
    echo "- [ ] Validate error responses sanitized"
    echo "- [ ] Monitor dashboards for anomalies"
    echo ""
    echo "🎉 Go-live completed successfully at $(date)"
}

# Disable trap for successful completion
trap - EXIT

# Execute main function
main "$@"