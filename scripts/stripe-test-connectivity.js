#!/usr/bin/env node
/**
 * Stripe Test Connectivity Validator
 * 
 * This script performs non-mutating API calls to verify Stripe TEST key connectivity
 * and validates that the environment is properly configured for safe testing.
 */

import Stripe from 'stripe';

// Simple environment helper for script
function getStripeKeys() {
  const useTestKeys = process.env.USE_STRIPE_TEST_KEYS === 'true' || process.env.NODE_ENV === 'development';
  
  return {
    secretKey: useTestKeys ? process.env.TESTING_STRIPE_SECRET_KEY : process.env.STRIPE_SECRET_KEY,
    publicKey: useTestKeys ? process.env.TESTING_VITE_STRIPE_PUBLIC_KEY : process.env.VITE_STRIPE_PUBLIC_KEY,
    isTestMode: useTestKeys
  };
}

async function validateStripeConnectivity() {
  console.log('🔍 Stripe Test Connectivity Validation');
  console.log('=====================================\n');

  try {
    // Get environment-appropriate keys
    const stripeConfig = getStripeKeys();
    
    if (!stripeConfig.secretKey) {
      throw new Error('No Stripe secret key available for current environment');
    }

    console.log(`✅ Using ${stripeConfig.isTestMode ? 'TEST' : 'LIVE'} keys`);
    console.log(`📋 Secret key: ${stripeConfig.secretKey.substring(0, 12)}...`);
    console.log(`📋 Public key: ${stripeConfig.publicKey?.substring(0, 12)}...`);
    
    if (!stripeConfig.isTestMode) {
      console.log('⚠️  WARNING: Using LIVE keys - stopping validation for safety');
      return;
    }

    // Initialize Stripe client
    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2024-06-20',
    });

    console.log('\n🔐 Performing non-mutating API tests...\n');

    // Test 1: Retrieve account information
    try {
      const account = await stripe.accounts.retrieve();
      console.log('✅ Account retrieve: SUCCESS');
      console.log(`   Account ID: ${account.id}`);
      console.log(`   Test mode: ${account.livemode ? 'NO (LIVE)' : 'YES (TEST)'}`);
      console.log(`   Charges enabled: ${account.charges_enabled}`);
    } catch (error) {
      console.log('❌ Account retrieve: FAILED');
      console.log(`   Error: ${error.message}`);
      if (error.code === 'account_invalid') {
        console.log('   Note: This may be expected for restricted keys');
      }
    }

    // Test 2: Retrieve balance
    try {
      const balance = await stripe.balance.retrieve();
      console.log('✅ Balance retrieve: SUCCESS');
      console.log(`   Available: ${balance.available?.[0]?.amount || 0} ${balance.available?.[0]?.currency || 'usd'}`);
      console.log(`   Pending: ${balance.pending?.[0]?.amount || 0} ${balance.pending?.[0]?.currency || 'usd'}`);
    } catch (error) {
      console.log('❌ Balance retrieve: FAILED');
      console.log(`   Error: ${error.message}`);
      if (error.code === 'account_invalid' || error.type === 'invalid_request_error') {
        console.log('   Note: This may be expected for restricted keys');
      }
    }

    // Test 3: List payment intents (limit 1, non-mutating)
    try {
      const paymentIntents = await stripe.paymentIntents.list({ limit: 1 });
      console.log('✅ Payment intents list: SUCCESS');
      console.log(`   Found ${paymentIntents.data.length} payment intent(s)`);
    } catch (error) {
      console.log('❌ Payment intents list: FAILED');
      console.log(`   Error: ${error.message}`);
    }

    // Test 4: List customers (limit 1, non-mutating)
    try {
      const customers = await stripe.customers.list({ limit: 1 });
      console.log('✅ Customers list: SUCCESS');
      console.log(`   Found ${customers.data.length} customer(s)`);
    } catch (error) {
      console.log('❌ Customers list: FAILED');
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n🎉 Stripe connectivity validation completed!');
    
  } catch (error) {
    console.error('💥 Fatal error during validation:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateStripeConnectivity()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

export { validateStripeConnectivity };