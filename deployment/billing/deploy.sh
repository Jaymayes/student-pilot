#!/bin/bash
# Production deployment script for ScholarLink Billing Service

set -euo pipefail

# Configuration
NAMESPACE="scholarlink-prod"
APP_NAME="scholarlink-billing"
IMAGE_REGISTRY="scholarlink"
IMAGE_NAME="billing"
KUSTOMIZE_DIR="./deployment/billing"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
  log "Checking prerequisites..."
  
  if ! command -v kubectl &> /dev/null; then
    error "kubectl not found. Please install kubectl."
    exit 1
  fi
  
  if ! command -v cosign &> /dev/null; then
    error "cosign not found. Please install cosign for image verification."
    exit 1
  fi
  
  if ! kubectl cluster-info &> /dev/null; then
    error "Cannot connect to Kubernetes cluster."
    exit 1
  fi
  
  success "Prerequisites check passed"
}

# Create namespace if it doesn't exist
ensure_namespace() {
  log "Ensuring namespace ${NAMESPACE} exists..."
  
  if ! kubectl get namespace ${NAMESPACE} &> /dev/null; then
    kubectl create namespace ${NAMESPACE}
    kubectl label namespace ${NAMESPACE} name=${NAMESPACE}
    success "Created namespace ${NAMESPACE}"
  else
    success "Namespace ${NAMESPACE} already exists"
  fi
}

# Apply AWS Secrets Manager integration (if using External Secrets)
apply_secrets() {
  log "Applying External Secrets configuration..."
  
  if kubectl get crd externalsecrets.external-secrets.io &> /dev/null; then
    kubectl apply -f ${KUSTOMIZE_DIR}/external-secret.yaml
    success "External Secrets applied"
    
    # Wait for secrets to be synced
    log "Waiting for secrets to sync..."
    kubectl wait --for=condition=Ready externalsecret/scholarlink-billing-secrets -n ${NAMESPACE} --timeout=60s
    success "Secrets synced successfully"
  else
    warning "External Secrets Operator not found. Please ensure secrets are manually created."
  fi
}

# Run database migrations
run_migrations() {
  log "Running database migrations..."
  
  # Check if there's an existing migration job and clean it up
  if kubectl get job scholarlink-billing-migrate -n ${NAMESPACE} &> /dev/null; then
    kubectl delete job scholarlink-billing-migrate -n ${NAMESPACE}
  fi
  
  # Apply migration job
  kubectl apply -f ${KUSTOMIZE_DIR}/migration-job.yaml
  
  # Wait for migration to complete
  log "Waiting for migration job to complete..."
  kubectl wait --for=condition=complete job/scholarlink-billing-migrate -n ${NAMESPACE} --timeout=300s
  
  # Check migration job status
  if kubectl get job scholarlink-billing-migrate -n ${NAMESPACE} -o jsonpath='{.status.conditions[0].type}' | grep -q "Complete"; then
    success "Database migration completed successfully"
  else
    error "Database migration failed"
    kubectl logs job/scholarlink-billing-migrate -n ${NAMESPACE}
    exit 1
  fi
}

# Deploy application
deploy_app() {
  log "Deploying ScholarLink Billing Service..."
  
  # Apply all manifests
  kubectl apply -f ${KUSTOMIZE_DIR}/deployment.yaml
  kubectl apply -f ${KUSTOMIZE_DIR}/ingress.yaml
  kubectl apply -f ${KUSTOMIZE_DIR}/network-policy.yaml
  
  # Wait for deployment to be ready
  log "Waiting for deployment to be ready..."
  kubectl rollout status deployment/${APP_NAME} -n ${NAMESPACE} --timeout=600s
  
  # Wait for pods to be ready
  kubectl wait --for=condition=ready pod -l app=${APP_NAME} -n ${NAMESPACE} --timeout=300s
  
  success "Deployment completed successfully"
}

# Verify deployment
verify_deployment() {
  log "Verifying deployment..."
  
  # Check pod status
  POD_COUNT=$(kubectl get pods -l app=${APP_NAME} -n ${NAMESPACE} --field-selector=status.phase=Running -o name | wc -l)
  if [ "${POD_COUNT}" -ge 2 ]; then
    success "${POD_COUNT} pods are running"
  else
    warning "Only ${POD_COUNT} pods are running (expected at least 2)"
  fi
  
  # Check service endpoints
  ENDPOINTS=$(kubectl get endpoints ${APP_NAME} -n ${NAMESPACE} -o jsonpath='{.subsets[0].addresses}' | wc -w)
  if [ "${ENDPOINTS}" -ge 2 ]; then
    success "${ENDPOINTS} service endpoints are ready"
  else
    warning "Only ${ENDPOINTS} service endpoints are ready"
  fi
  
  # Test health endpoint
  log "Testing health endpoint..."
  if kubectl exec -n ${NAMESPACE} deployment/${APP_NAME} -- wget -q --spider http://localhost:3000/health; then
    success "Health endpoint is responsive"
  else
    error "Health endpoint is not responsive"
    exit 1
  fi
  
  # Test readiness endpoint
  log "Testing readiness endpoint..."
  if kubectl exec -n ${NAMESPACE} deployment/${APP_NAME} -- wget -q --spider http://localhost:3000/readyz; then
    success "Readiness endpoint is responsive"
  else
    error "Readiness endpoint is not responsive"
    exit 1
  fi
}

# Enable canary deployment (optional)
enable_canary() {
  if [ "${ENABLE_CANARY:-false}" = "true" ]; then
    log "Enabling canary deployment with 1% traffic..."
    
    # Update canary ingress
    kubectl patch ingress scholarlink-billing-canary -n ${NAMESPACE} -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary":"true","nginx.ingress.kubernetes.io/canary-weight":"1"}}}'
    
    success "Canary deployment enabled with 1% traffic"
    warning "Monitor metrics and gradually increase canary weight: 1% → 5% → 20% → 50% → 100%"
  fi
}

# Show deployment summary
show_summary() {
  log "Deployment Summary:"
  echo
  echo "Namespace: ${NAMESPACE}"
  echo "Application: ${APP_NAME}"
  echo
  echo "Services:"
  kubectl get svc -l app=${APP_NAME} -n ${NAMESPACE}
  echo
  echo "Pods:"
  kubectl get pods -l app=${APP_NAME} -n ${NAMESPACE}
  echo
  echo "Ingress:"
  kubectl get ingress -l app=${APP_NAME} -n ${NAMESPACE}
  echo
  
  BILLING_URL=$(kubectl get ingress ${APP_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.rules[0].host}')
  if [ -n "${BILLING_URL}" ]; then
    success "Billing service is available at: https://${BILLING_URL}"
  fi
}

# Main deployment flow
main() {
  log "Starting deployment of ScholarLink Billing Service"
  
  check_prerequisites
  ensure_namespace
  apply_secrets
  run_migrations
  deploy_app
  verify_deployment
  enable_canary
  show_summary
  
  success "Deployment completed successfully!"
  
  echo
  warning "Next steps:"
  echo "1. Configure Stripe webhook: https://${BILLING_URL}/webhooks/stripe"
  echo "2. Perform \$5 purchase test to verify credit ledger"
  echo "3. Test usage reconciliation with sample token usage"
  echo "4. Monitor SLOs and gradual canary rollout if enabled"
}

# Run main function
main "$@"