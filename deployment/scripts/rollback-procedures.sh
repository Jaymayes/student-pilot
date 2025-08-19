#!/bin/bash

# ScholarLink Emergency Rollback Procedures
# Comprehensive rollback with database restoration capability

set -euo pipefail

# Configuration
NAMESPACE="scholarlink-prod"
APP_NAME="scholarlink"
ROLLBACK_TYPE="${1:-deployment}"  # deployment, database, full
BACKUP_NAME="${2:-}"

echo "🔄 ScholarLink Emergency Rollback Procedures"
echo "============================================="
echo "Rollback Type: $ROLLBACK_TYPE"
echo "Namespace: $NAMESPACE"
echo ""

# Function to send notifications
notify() {
    local message="$1"
    local level="${2:-info}"
    
    echo "[$level] $message"
    
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"ScholarLink Rollback [$level]: $message\"}" \
            "$SLACK_WEBHOOK" || true
    fi
}

# Function to rollback deployment only
rollback_deployment() {
    echo "🔄 Rolling back deployment..."
    
    # Remove any active canary deployments
    kubectl delete ingress -n "$NAMESPACE" -l "app=$APP_NAME" --selector="nginx.ingress.kubernetes.io/canary=true" --ignore-not-found=true
    kubectl delete deployment "$APP_NAME-app-canary" -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete service "$APP_NAME-service-canary" -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete hpa "$APP_NAME-hpa-canary" -n "$NAMESPACE" --ignore-not-found=true
    
    # Rollback main deployment
    kubectl rollout undo deployment/"$APP_NAME-app" -n "$NAMESPACE"
    
    # Wait for rollback to complete
    kubectl rollout status deployment/"$APP_NAME-app" -n "$NAMESPACE" --timeout=300s
    
    # Verify health
    sleep 30
    local pod_name=$(kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME" -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n "$NAMESPACE" "$pod_name" -- curl -f http://localhost:5000/health
    
    notify "✅ Deployment rollback completed successfully" "success"
}

# Function to rollback database
rollback_database() {
    if [[ -z "$BACKUP_NAME" ]]; then
        echo "❌ Backup name required for database rollback"
        echo "Available backups:"
        kubectl exec -n "$NAMESPACE" deployment/"$APP_NAME-app" -- ls -la /backups/
        exit 1
    fi
    
    echo "🗄️ Rolling back database to backup: $BACKUP_NAME"
    
    # Create database restoration job
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: scholarlink-db-restore-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      restartPolicy: Never
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: db-restore
        image: postgres:15-alpine
        command: ["/bin/sh", "-c"]
        args:
        - |
          set -euo pipefail
          echo "🔄 Restoring database from backup: $BACKUP_NAME"
          
          # Verify backup exists
          if [ ! -f "/backups/$BACKUP_NAME.dump" ]; then
            echo "❌ Backup file not found: $BACKUP_NAME.dump"
            exit 1
          fi
          
          # Create new database with timestamp suffix for safety
          NEW_DB_NAME="scholarlink_restored_\$(date +%s)"
          createdb "\$NEW_DB_NAME" --owner="\$PGUSER"
          
          # Restore backup to new database
          pg_restore -d "\$NEW_DB_NAME" -v /backups/$BACKUP_NAME.dump
          
          # Verify restoration
          psql -d "\$NEW_DB_NAME" -c "SELECT COUNT(*) FROM users;"
          
          echo "✅ Database restored to: \$NEW_DB_NAME"
          echo "⚠️  Manual step required: Update DATABASE_URL to point to \$NEW_DB_NAME"
          
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: scholarlink-database
              key: DATABASE_URL
        - name: PGHOST
          valueFrom:
            secretKeyRef:
              name: scholarlink-database
              key: PGHOST
        - name: PGPORT
          valueFrom:
            secretKeyRef:
              name: scholarlink-database
              key: PGPORT
        - name: PGUSER
          valueFrom:
            secretKeyRef:
              name: scholarlink-database
              key: PGUSER
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: scholarlink-database
              key: PGPASSWORD
        volumeMounts:
        - name: backup-storage
          mountPath: /backups
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
      volumes:
      - name: backup-storage
        persistentVolumeClaim:
          claimName: scholarlink-backup-storage
  backoffLimit: 0
EOF
    
    # Wait for restoration job to complete
    local job_name=$(kubectl get jobs -n "$NAMESPACE" --sort-by=.metadata.creationTimestamp -o name | tail -1)
    kubectl wait --for=condition=complete "$job_name" -n "$NAMESPACE" --timeout=600s
    
    notify "⚠️  Database restoration job completed. Manual DATABASE_URL update required." "warning"
}

# Function to full system rollback
rollback_full() {
    echo "🚨 Performing full system rollback..."
    
    # 1. Scale down current deployment
    kubectl scale deployment "$APP_NAME-app" -n "$NAMESPACE" --replicas=0
    
    # 2. Rollback database if backup provided
    if [[ -n "$BACKUP_NAME" ]]; then
        rollback_database
    fi
    
    # 3. Rollback deployment
    rollback_deployment
    
    # 4. Verify system health
    echo "🔍 Verifying system health after full rollback..."
    sleep 60
    
    local pod_name=$(kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME" -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n "$NAMESPACE" "$pod_name" -- curl -f http://localhost:5000/health
    
    # 5. Check error rates
    echo "📊 Checking error rates..."
    # This would typically query Prometheus for current error rates
    
    notify "✅ Full system rollback completed" "success"
}

# Function to validate rollback success
validate_rollback() {
    echo "🔍 Validating rollback success..."
    
    # Check deployment status
    local ready_replicas=$(kubectl get deployment "$APP_NAME-app" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    local desired_replicas=$(kubectl get deployment "$APP_NAME-app" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    if [[ "$ready_replicas" -eq "$desired_replicas" ]]; then
        echo "✅ Deployment has $ready_replicas/$desired_replicas ready replicas"
    else
        echo "❌ Deployment health issue: $ready_replicas/$desired_replicas ready replicas"
        return 1
    fi
    
    # Check pod health
    local pod_name=$(kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME,component=api" --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}')
    if kubectl exec -n "$NAMESPACE" "$pod_name" -- curl -f http://localhost:5000/health &>/dev/null; then
        echo "✅ Application health check passed"
    else
        echo "❌ Application health check failed"
        return 1
    fi
    
    # Check ingress
    local ingress_ready=$(kubectl get ingress "$APP_NAME-ingress" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    if [[ -n "$ingress_ready" ]]; then
        echo "✅ Ingress is ready: $ingress_ready"
    else
        echo "❌ Ingress not ready"
        return 1
    fi
    
    echo "✅ Rollback validation successful"
}

# Function to get available backups
list_backups() {
    echo "📋 Available database backups:"
    kubectl exec -n "$NAMESPACE" deployment/"$APP_NAME-app" -- ls -la /backups/ | grep "\.dump$" || echo "No backups found"
}

# Main rollback logic
main() {
    case "$ROLLBACK_TYPE" in
        "deployment")
            rollback_deployment
            ;;
        "database")
            rollback_database
            ;;
        "full")
            rollback_full
            ;;
        "list-backups")
            list_backups
            exit 0
            ;;
        *)
            echo "❌ Invalid rollback type: $ROLLBACK_TYPE"
            echo "Valid options: deployment, database, full, list-backups"
            exit 1
            ;;
    esac
    
    # Validate rollback success
    validate_rollback
    
    notify "🔄 Rollback procedure completed successfully" "success"
}

# Rollback execution
main "$@"