#!/bin/bash
# E2E Authentication Test Runner
# Validates centralized auth and SSO across Student and Provider apps

set -e

echo "🔐 Running E2E Authentication Tests..."
echo "================================================"

# Check if required environment variables are set
if [ -z "$AUTH_URL" ] || [ -z "$STUDENT_URL" ] || [ -z "$PROVIDER_URL" ]; then
  echo "❌ Missing required environment variables!"
  echo ""
  echo "Please set the following environment variables:"
  echo "  AUTH_URL=https://scholar-auth-jamarrlmayes.replit.app"
  echo "  STUDENT_URL=https://student-pilot-jamarrlmayes.replit.app"
  echo "  PROVIDER_URL=https://provider-register-jamarrlmayes.replit.app"
  echo "  TEST_EMAIL_STUDENT=your-email@example.com"
  echo "  TEST_PASSWORD_STUDENT=your-password"
  echo ""
  echo "Or source a .env.test file:"
  echo "  source .env.test"
  echo "  ./run-auth-e2e.sh"
  exit 1
fi

if [ -z "$TEST_EMAIL_STUDENT" ] || [ -z "$TEST_PASSWORD_STUDENT" ]; then
  echo "❌ Missing test credentials!"
  echo ""
  echo "Please set:"
  echo "  TEST_EMAIL_STUDENT=your-email@example.com"
  echo "  TEST_PASSWORD_STUDENT=your-password"
  exit 1
fi

echo "✅ Environment configured:"
echo "  Auth:     $AUTH_URL"
echo "  Student:  $STUDENT_URL"
echo "  Provider: $PROVIDER_URL"
echo "  Email:    $TEST_EMAIL_STUDENT"
echo ""

# Install browsers if needed
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo "📦 Installing Playwright browsers..."
  npx playwright install chromium
  echo ""
fi

# Create results directory
mkdir -p e2e-results

# Run tests
echo "🧪 Running authentication tests..."
echo ""

npx playwright test e2e/auth.e2e.spec.ts --project=chromium-e2e

echo ""
echo "================================================"
echo "✅ E2E Authentication Tests Complete!"
echo ""
echo "📊 View results:"
echo "  - Screenshots: e2e-results/*.png"
echo "  - Full report: npx playwright show-report"
echo ""
