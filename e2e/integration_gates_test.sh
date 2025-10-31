#!/bin/bash
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  INTEGRATION GATES TESTING"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo

# A1 OIDC Integration
echo "Gate A1: OIDC Configuration (scholar_auth)"
echo "───────────────────────────────────────────────────────────────────────────────"
OIDC_CONFIG=$(curl -sS -m 10 "https://scholar-auth-jamarrlmayes.replit.app/.well-known/openid-configuration" 2>&1)
if echo "$OIDC_CONFIG" | jq . >/dev/null 2>&1; then
  echo "✅ OIDC configuration accessible"
  echo "$OIDC_CONFIG" | jq '{issuer, authorization_endpoint, token_endpoint, jwks_uri}' 2>/dev/null || echo "$OIDC_CONFIG" | head -c 200
else
  echo "❌ OIDC configuration not accessible or invalid JSON"
  echo "$OIDC_CONFIG" | head -c 200
fi
echo

JWKS=$(curl -sS -m 10 "https://scholar-auth-jamarrlmayes.replit.app/jwks.json" 2>&1)
if echo "$JWKS" | jq . >/dev/null 2>&1; then
  echo "✅ JWKS endpoint accessible"
else
  echo "❌ JWKS endpoint not accessible or invalid JSON"
fi
echo

# A7 SEO Gates
echo "Gate A7: SEO Foundation (auto_page_maker)"
echo "───────────────────────────────────────────────────────────────────────────────"
ROBOTS=$(curl -sS -m 10 "https://auto-page-maker-jamarrlmayes.replit.app/robots.txt" 2>&1)
if echo "$ROBOTS" | grep -qi "user-agent"; then
  echo "✅ robots.txt accessible"
  echo "$ROBOTS" | head -5
else
  echo "❌ robots.txt not found or invalid"
fi
echo

SITEMAP=$(curl -sS -m 10 "https://auto-page-maker-jamarrlmayes.replit.app/sitemap.xml" 2>&1)
if echo "$SITEMAP" | grep -qi "urlset"; then
  echo "✅ sitemap.xml accessible"
  URL_COUNT=$(echo "$SITEMAP" | grep -c "<loc>" || echo "0")
  echo "  URL count: $URL_COUNT"
else
  echo "❌ sitemap.xml not found or invalid"
fi
echo

# Sample a sitemap URL for SSR meta tags
SAMPLE_URL=$(echo "$SITEMAP" | grep -oP '(?<=<loc>)[^<]+' | head -1)
if [ -n "$SAMPLE_URL" ]; then
  echo "Sampling URL for SSR meta tags: $SAMPLE_URL"
  PAGE=$(curl -sS -m 10 "$SAMPLE_URL" 2>&1)
  if echo "$PAGE" | grep -qi "<title>"; then
    echo "✅ Server-rendered HTML with <title> tag"
  else
    echo "⚠️  No <title> tag found (may not be SSR)"
  fi
fi
echo

# Check Stripe SDK presence (read-only)
echo "Gate A5/A6: Stripe SDK Presence (read-only check)"
echo "───────────────────────────────────────────────────────────────────────────────"
STUDENT_PAGE=$(curl -sS -m 10 "https://student-pilot-jamarrlmayes.replit.app" 2>&1)
if echo "$STUDENT_PAGE" | grep -qi "stripe"; then
  echo "✅ student_pilot: Stripe reference found in HTML"
else
  echo "⚠️  student_pilot: No Stripe reference detected"
fi

PROVIDER_PAGE=$(curl -sS -m 10 "https://provider-register-jamarrlmayes.replit.app" 2>&1)
if echo "$PROVIDER_PAGE" | grep -qi "stripe"; then
  echo "✅ provider_register: Stripe reference found in HTML"
else
  echo "⚠️  provider_register: No Stripe reference detected"
fi
echo

echo "═══════════════════════════════════════════════════════════════════════════════"
