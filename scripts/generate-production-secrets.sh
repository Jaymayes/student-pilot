#!/bin/bash

# Production Secrets Generation Script for ScholarLink
# Run this on a secure workstation to generate production secrets

set -euo pipefail

echo "🔐 ScholarLink Production Secrets Generator"
echo "============================================"

# Create secrets directory
mkdir -p ./secrets
cd ./secrets

echo "📝 Generating JWT RSA key pair..."
# Generate 4096-bit RSA private key
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out jwt_private.pem

# Extract public key
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem

echo "🔑 Generating secure random secrets..."

# Generate strong secrets
SESSION_SECRET=$(openssl rand -base64 48)
SHARED_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -base64 32)
WEBHOOK_SECRET=$(openssl rand -base64 32)

# Create environment template
cat > ../production-secrets.env << EOF
# =============================================================================
# GENERATED PRODUCTION SECRETS - $(date)
# =============================================================================

# Session Management
SESSION_SECRET=${SESSION_SECRET}

# Agent Bridge HMAC
SHARED_SECRET=${SHARED_SECRET}

# Data Encryption
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Webhook Validation  
WEBHOOK_SECRET=${WEBHOOK_SECRET}

# JWT Configuration
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY=./secrets/jwt_private.pem
JWT_PUBLIC_KEY=./secrets/jwt_public.pem
JWT_ISSUER=scholarlink-agent
JWT_AUDIENCE=auto-com-center

EOF

echo "✅ Secrets generated successfully!"
echo ""
echo "📁 Generated files:"
echo "   - ./secrets/jwt_private.pem (Keep secure, never commit)"
echo "   - ./secrets/jwt_public.pem (Can be shared with Command Center)"
echo "   - ./production-secrets.env (Environment variables)"
echo ""
echo "🚨 SECURITY CHECKLIST:"
echo "   ✓ Store private key in secure secret manager"
echo "   ✓ Set restrictive file permissions (chmod 600)"
echo "   ✓ Never commit secrets to version control"
echo "   ✓ Use separate keys for different environments"
echo "   ✓ Plan for quarterly key rotation"
echo ""
echo "🔄 Next steps:"
echo "   1. Upload secrets to your production secret manager"
echo "   2. Configure environment variables in deployment"
echo "   3. Test connection with: curl https://your-domain/health"
echo "   4. Register agent with: curl -H 'Authorization: Bearer <token>' https://your-domain/agent/register"

# Set secure permissions
chmod 600 jwt_private.pem jwt_public.pem
chmod 644 ../production-secrets.env

echo ""
echo "🎉 Production secrets ready for deployment!"