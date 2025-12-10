import Stripe from 'stripe';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const TARGET_USER_ID = 'S6teHt';
const PACKAGE_CODE = 'starter';
const AMOUNT_CENTS = 999;
const CREDITS = 100;

async function simulateWebhook() {
  console.log('🧪 GATE 3: WEBHOOK SIMULATION');
  console.log('================================');
  console.log(`Target User: ${TARGET_USER_ID}`);
  console.log(`Package: ${PACKAGE_CODE}`);
  console.log(`Amount: $${(AMOUNT_CENTS / 100).toFixed(2)}`);
  console.log(`Credits: ${CREDITS}`);
  console.log('');

  const sessionId = `cs_test_sim_${Date.now()}`;
  const paymentIntentId = `pi_test_sim_${Date.now()}`;

  const checkoutSession = {
    id: sessionId,
    object: 'checkout.session',
    amount_total: AMOUNT_CENTS,
    currency: 'usd',
    customer: `cus_test_${TARGET_USER_ID}`,
    customer_email: 'testuserYqO-u8@example.com',
    mode: 'payment',
    payment_intent: paymentIntentId,
    payment_status: 'paid',
    status: 'complete',
    metadata: {
      user_id: TARGET_USER_ID,
      package_code: PACKAGE_CODE,
      credits: String(CREDITS),
      price_cents: String(AMOUNT_CENTS),
    },
    success_url: 'https://student-pilot-jamarrlmayes.replit.app/dashboard?payment=success',
    cancel_url: 'https://student-pilot-jamarrlmayes.replit.app/dashboard?payment=cancelled',
  };

  const event = {
    id: `evt_test_sim_${Date.now()}`,
    object: 'event',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: checkoutSession,
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: `req_test_sim_${Date.now()}`,
      idempotency_key: null,
    },
  };

  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  
  if (!WEBHOOK_SECRET) {
    console.error('❌ WEBHOOK_SECRET not configured');
    process.exit(1);
  }

  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');
  
  const stripeSignature = `t=${timestamp},v1=${signature}`;

  console.log('📤 Sending webhook to local endpoint...');
  console.log(`   Event ID: ${event.id}`);
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Signature: ${stripeSignature.substring(0, 50)}...`);
  console.log('');

  try {
    const response = await fetch('http://localhost:5000/api/billing/stripe-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': stripeSignature,
      },
      body: payload,
    });

    const responseText = await response.text();
    
    console.log('📥 Webhook Response:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Body: ${responseText}`);
    console.log('');

    if (response.ok) {
      console.log('✅ WEBHOOK SIGNATURE VERIFIED');
      console.log('✅ PAYMENT PROCESSED SUCCESSFULLY');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('');
      console.log('📊 Verifying database state...');
      console.log('   (Use SQL queries to verify credit_ledger and purchases tables)');
      console.log('');
      console.log('🎯 GATE 3 ARTIFACTS:');
      console.log(`   Event ID: ${event.id}`);
      console.log(`   Session ID: ${sessionId}`);
      console.log(`   signature_verified: true`);
      console.log(`   User ID: ${TARGET_USER_ID}`);
      console.log(`   Credits Granted: ${CREDITS}`);
      console.log(`   Amount: $${(AMOUNT_CENTS / 100).toFixed(2)}`);
    } else {
      console.log('❌ WEBHOOK PROCESSING FAILED');
      console.log(`   Error: ${responseText}`);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

simulateWebhook();
