#!/bin/bash
# Quick script to test authentication setup

echo "🔐 Testing OAuth Authentication Setup..."
echo "========================================"
echo ""

# Check if OAuth secrets are configured
echo "Checking OAuth configuration..."
if [ -z "$FEATURE_AUTH_PROVIDER" ]; then
  echo "❌ FEATURE_AUTH_PROVIDER not set"
  exit 1
else
  echo "✅ FEATURE_AUTH_PROVIDER: $FEATURE_AUTH_PROVIDER"
fi

if [ -z "$AUTH_CLIENT_ID" ]; then
  echo "❌ AUTH_CLIENT_ID not set"
  exit 1
else
  echo "✅ AUTH_CLIENT_ID: $AUTH_CLIENT_ID"
fi

if [ -z "$AUTH_ISSUER_URL" ]; then
  echo "❌ AUTH_ISSUER_URL not set"
  exit 1
else
  echo "✅ AUTH_ISSUER_URL: $AUTH_ISSUER_URL"
fi

if [ -z "$AUTH_CLIENT_SECRET" ]; then
  echo "❌ AUTH_CLIENT_SECRET not set"
  exit 1
else
  echo "✅ AUTH_CLIENT_SECRET: configured (hidden for security)"
fi

echo ""
echo "✅ All OAuth secrets are configured correctly!"
echo ""
echo "Next steps:"
echo "1. Create test user at: https://scholar-auth-jamarrlmayes.replit.app"
echo "2. Test login at: https://student-pilot-jamarrlmayes.replit.app"
echo "3. Or run E2E tests with your test credentials"
echo ""
