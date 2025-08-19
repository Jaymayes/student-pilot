#!/bin/bash

# AWS Secrets Manager Setup Script for ScholarLink Production
# Creates all required secrets in AWS Secrets Manager for External Secrets Operator

set -euo pipefail

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
SECRET_PREFIX="scholarlink/prod"

echo "🔐 Setting up AWS Secrets Manager for ScholarLink Production"
echo "=========================================================="
echo "Region: $AWS_REGION"
echo "Secret Prefix: $SECRET_PREFIX"
echo ""

# Check AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install and configure AWS CLI first."
    exit 1
fi

# Check if we can access AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured or no valid credentials. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured and accessible"
echo ""

# Function to create or update secret
create_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="$3"
    
    echo "Creating secret: $secret_name"
    
    if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$AWS_REGION" &> /dev/null; then
        echo "  Secret exists, updating..."
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" > /dev/null
    else
        echo "  Creating new secret..."
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "$description" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" > /dev/null
    fi
    echo "  ✅ Done"
}

# Generate secrets if they don't exist
if [ ! -f "./secrets/jwt_private.pem" ]; then
    echo "🔑 Generating JWT keys..."
    ./scripts/generate-production-secrets.sh > /dev/null
    echo "✅ JWT keys generated"
fi

# Read generated secrets
JWT_PRIVATE_KEY=$(cat ./secrets/jwt_private.pem)
JWT_PUBLIC_KEY=$(cat ./secrets/jwt_public.pem)

# Read from production-secrets.env
if [ ! -f "./production-secrets.env" ]; then
    echo "❌ production-secrets.env not found. Please run generate-production-secrets.sh first."
    exit 1
fi

source ./production-secrets.env

echo "📝 Creating secrets in AWS Secrets Manager..."
echo ""

# Database secrets
read -p "Enter DATABASE_URL: " DATABASE_URL
read -p "Enter PGHOST: " PGHOST
read -p "Enter PGPORT (default 5432): " PGPORT
PGPORT=${PGPORT:-5432}
read -p "Enter PGUSER: " PGUSER
read -s -p "Enter PGPASSWORD: " PGPASSWORD
echo ""
read -p "Enter PGDATABASE: " PGDATABASE

DATABASE_JSON=$(cat <<EOF
{
  "DATABASE_URL": "$DATABASE_URL",
  "PGHOST": "$PGHOST", 
  "PGPORT": "$PGPORT",
  "PGUSER": "$PGUSER",
  "PGPASSWORD": "$PGPASSWORD",
  "PGDATABASE": "$PGDATABASE"
}
EOF
)

create_secret "$SECRET_PREFIX/database" "$DATABASE_JSON" "ScholarLink production database credentials"

# Application secrets
APP_JSON=$(cat <<EOF
{
  "SESSION_SECRET": "$SESSION_SECRET",
  "SHARED_SECRET": "$SHARED_SECRET", 
  "ENCRYPTION_KEY": "$ENCRYPTION_KEY",
  "WEBHOOK_SECRET": "$WEBHOOK_SECRET"
}
EOF
)

create_secret "$SECRET_PREFIX/app" "$APP_JSON" "ScholarLink production application secrets"

# JWT keys
JWT_JSON=$(cat <<EOF
{
  "private_key": "$JWT_PRIVATE_KEY",
  "public_key": "$JWT_PUBLIC_KEY"
}
EOF
)

create_secret "$SECRET_PREFIX/jwt" "$JWT_JSON" "ScholarLink production JWT signing keys"

# External service secrets
read -p "Enter OPENAI_API_KEY: " OPENAI_API_KEY
read -p "Enter SENTRY_DSN (optional): " SENTRY_DSN
read -p "Enter SMTP_USER (optional): " SMTP_USER
read -s -p "Enter SMTP_PASS (optional): " SMTP_PASS
echo ""

EXTERNAL_JSON=$(cat <<EOF
{
  "OPENAI_API_KEY": "$OPENAI_API_KEY",
  "SENTRY_DSN": "$SENTRY_DSN",
  "SMTP_USER": "$SMTP_USER", 
  "SMTP_PASS": "$SMTP_PASS"
}
EOF
)

create_secret "$SECRET_PREFIX/external" "$EXTERNAL_JSON" "ScholarLink production external service credentials"

echo ""
echo "🎉 All secrets created successfully in AWS Secrets Manager!"
echo ""
echo "📋 Created secrets:"
echo "  • $SECRET_PREFIX/database - Database connection credentials"
echo "  • $SECRET_PREFIX/app - Application secrets (session, encryption, etc.)"
echo "  • $SECRET_PREFIX/jwt - JWT signing keys"
echo "  • $SECRET_PREFIX/external - External service API keys"
echo ""
echo "🔄 Next steps:"
echo "  1. Deploy External Secrets Operator to your cluster"
echo "  2. Apply external-secrets.yaml: kubectl apply -f deployment/kubernetes/external-secrets.yaml"
echo "  3. Verify secrets are synced: kubectl get secrets -n scholarlink-prod"
echo "  4. Deploy the application: kubectl apply -f deployment/kubernetes/"
echo ""
echo "🔐 Secret rotation:"
echo "  • JWT keys: Rotate quarterly, update secret in AWS"
echo "  • Database password: Rotate monthly, coordinate with RDS"
echo "  • API keys: Rotate as needed, update in AWS Secrets Manager"