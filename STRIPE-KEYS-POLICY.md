# Stripe Keys Policy for Replit Instances

## Overview

This document outlines the policy for managing Stripe API keys across different environments in our Replit instances to ensure security and prevent accidental charges.

## Key Types and Usage

### Test Environment (Development/Testing)
- **Required Keys:**
  - `TESTING_STRIPE_SECRET_KEY`: Must start with `sk_test_` or `rk_test_`
  - `TESTING_VITE_STRIPE_PUBLIC_KEY`: Must start with `pk_test_`
- **Control Variable:** `USE_STRIPE_TEST_KEYS=true` (default in development)

### Production Environment  
- **Required Keys:**
  - `STRIPE_SECRET_KEY`: Starts with `sk_live_` or `rk_live_`
  - `VITE_STRIPE_PUBLIC_KEY`: Starts with `pk_live_`
- **Control Variable:** `USE_STRIPE_TEST_KEYS=false` (production only)

## Environment Selection Logic

The application automatically selects appropriate keys based on:

1. **Environment Variable:** `USE_STRIPE_TEST_KEYS` 
   - `true`: Forces TEST keys usage
   - `false`: Uses LIVE keys (production only)
   - **Default:** `true` for safety

2. **Node Environment:** `NODE_ENV`
   - `development`: Always uses TEST keys regardless of `USE_STRIPE_TEST_KEYS`
   - `production`: Respects `USE_STRIPE_TEST_KEYS` setting

## Implementation

### Server-Side Configuration (`server/environment.ts`)

```typescript
export function getStripeKeys() {
  const useTestKeys = env.USE_STRIPE_TEST_KEYS === 'true' || isDevelopment;
  
  if (useTestKeys) {
    return {
      secretKey: env.TESTING_STRIPE_SECRET_KEY,
      publicKey: env.TESTING_VITE_STRIPE_PUBLIC_KEY,
      isTestMode: true
    };
  }
  
  return {
    secretKey: env.STRIPE_SECRET_KEY,
    publicKey: env.VITE_STRIPE_PUBLIC_KEY,
    isTestMode: false
  };
}
```

### Security Boundaries

1. **Secret Keys:** Server-only, never exposed to client
2. **Public Keys:** Client-exposed via Vite environment variables
3. **Validation:** Environment schema validates key prefixes
4. **Logging:** No full keys ever logged (masked in scripts)

## Replit Instance Setup

### Development Instances
1. Set `USE_STRIPE_TEST_KEYS=true` (or omit for default)
2. Add `TESTING_STRIPE_SECRET_KEY` with `sk_test_` or `rk_test_` prefix
3. Add `TESTING_VITE_STRIPE_PUBLIC_KEY` with `pk_test_` prefix
4. **Never add LIVE keys to development instances**

### Production Instances
1. Set `USE_STRIPE_TEST_KEYS=false` explicitly
2. Add `STRIPE_SECRET_KEY` with `sk_live_` or `rk_live_` prefix
3. Add `VITE_STRIPE_PUBLIC_KEY` with `pk_live_` prefix
4. Ensure TEST keys are also available for testing modes

## Security Protocols

### LIVE Key Exposure Response
If LIVE keys are accidentally added to development instances:

1. **Immediate:** Remove from Replit Secrets
2. **Within 2 hours:** Rotate keys in Stripe Dashboard
3. **Document:** Log incident and remediation steps
4. **Verify:** Confirm TEST keys are working properly

### Key Rotation Schedule
- **TEST Keys:** Rotate annually or after exposure
- **LIVE Keys:** Rotate quarterly or immediately after exposure
- **Restricted Keys:** Use `rk_test_` and `rk_live_` with minimal permissions

## Validation and Testing

### Connectivity Testing
Use the provided script to validate configuration:

```bash
# Test current environment
node scripts/stripe-test-connectivity.js

# Force test mode
USE_STRIPE_TEST_KEYS=true node scripts/stripe-test-connectivity.js
```

### Security Validation
- No secret keys in client bundles
- No keys in application logs
- Proper prefix validation in environment schema
- Automatic test mode in development

## Compliance Notes

This policy supports:
- SOC 2 security controls
- Payment industry security standards
- Development environment isolation
- Incident response procedures

Last Updated: September 15, 2025
Policy Version: 1.0