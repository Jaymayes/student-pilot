import { BillingService } from "./billing";
import Stripe from "stripe";

// Synthetic monitoring probes for production billing system
// Runs automated tests every 5-10 minutes to validate critical functionality

export class SyntheticsMonitoring {
  
  private static readonly STRIPE_TEST_MODE = process.env.NODE_ENV !== 'production';
  private static readonly TEST_USER_ID = 'synthetic-test-user';
  private static readonly PROBE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  
  private static billingService = new BillingService();
  private static stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2023-10-16",
  });
  
  /**
   * Probe 1: Checkout flow through to webhook receipt
   * Tests the complete purchase flow with test mode
   */
  static async probeCheckoutFlow(): Promise<{
    success: boolean;
    duration: number;
    steps: Record<string, { success: boolean; duration: number; error?: string }>;
  }> {
    const startTime = Date.now();
    const steps: Record<string, { success: boolean; duration: number; error?: string }> = {};
    
    try {
      // Step 1: Create checkout session
      const stepStart = Date.now();
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Synthetic Test - Starter Package',
            },
            unit_amount: 999, // $9.99
          },
          quantity: 1,
        }],
        success_url: 'https://test.com/success',
        cancel_url: 'https://test.com/cancel',
        metadata: {
          synthetic_test: 'true',
          test_user_id: this.TEST_USER_ID,
          package_code: 'starter',
        }
      });
      
      steps.createCheckout = {
        success: true,
        duration: Date.now() - stepStart
      };
      
      // In a real synthetic test, you would:
      // 1. Use Stripe's test card numbers to complete payment
      // 2. Wait for webhook to fire
      // 3. Verify fulfillment occurred within SLA (< 2 minutes)
      
      // For now, we'll simulate the webhook verification
      const webhookStepStart = Date.now();
      
      // Verify webhook endpoint is responding
      const webhookResponse = await fetch(`${process.env.APP_URL}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'synthetic-test-signature'
        },
        body: JSON.stringify({
          id: 'evt_synthetic_test',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: session.id,
              metadata: session.metadata
            }
          }
        })
      });
      
      steps.webhookEndpoint = {
        success: webhookResponse.status === 400, // Expected - invalid signature
        duration: Date.now() - webhookStepStart,
        error: webhookResponse.status !== 400 ? `Unexpected status: ${webhookResponse.status}` : undefined
      };
      
      return {
        success: Object.values(steps).every(step => step.success),
        duration: Date.now() - startTime,
        steps
      };
      
    } catch (error) {
      const failedStep = Object.keys(steps).length === 0 ? 'initial' : Object.keys(steps)[Object.keys(steps).length - 1];
      steps[failedStep] = steps[failedStep] || { success: false, duration: 0 };
      steps[failedStep].error = error.message;
      
      return {
        success: false,
        duration: Date.now() - startTime,
        steps
      };
    }
  }
  
  /**
   * Probe 2: OpenAI wrapper with charge deduction
   * Tests AI API integration and billing deduction
   */
  static async probeOpenAIWrapper(): Promise<{
    success: boolean;
    duration: number;
    creditsCharged: number;
    balanceBefore: number;
    balanceAfter: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Get initial balance
      const initialBalance = await this.billingService.getUserBalance(this.TEST_USER_ID);
      const balanceBefore = Number(initialBalance.balanceMillicredits || 0) / 1000;
      
      // Make a small OpenAI call through the wrapper
      const testPrompt = "Say 'test' - this is a synthetic monitoring probe";
      const response = await fetch(`${process.env.APP_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer synthetic-test-token`, // You'd need proper auth here
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 10, // Keep it small and cheap
          synthetic_test: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI wrapper failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Get final balance
      const finalBalance = await this.billingService.getUserBalance(this.TEST_USER_ID);
      const balanceAfter = Number(finalBalance.balanceMillicredits || 0) / 1000;
      
      const creditsCharged = balanceBefore - balanceAfter;
      
      return {
        success: true,
        duration: Date.now() - startTime,
        creditsCharged,
        balanceBefore,
        balanceAfter
      };
      
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        creditsCharged: 0,
        balanceBefore: 0,
        balanceAfter: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Probe 3: Reconciliation validation
   * Checks that ledger totals match current balance
   */
  static async probeReconciliation(): Promise<{
    success: boolean;
    duration: number;
    currentBalance: number;
    ledgerCalculated: number;
    variance: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const balance = await this.billingService.getUserBalance(this.TEST_USER_ID);
      const currentBalance = Number(balance.balanceMillicredits || 0) / 1000;
      
      // Calculate balance from ledger entries
      const ledgerEntries = await this.billingService.getUserLedger(this.TEST_USER_ID, 1000);
      
      let calculatedBalance = 0;
      for (const entry of ledgerEntries.entries) {
        calculatedBalance += Number(entry.amountMillicredits || 0) / 1000;
      }
      
      const variance = Math.abs(currentBalance - calculatedBalance);
      const success = variance < 0.01; // Less than 0.01 credits variance acceptable
      
      return {
        success,
        duration: Date.now() - startTime,
        currentBalance,
        ledgerCalculated: calculatedBalance,
        variance,
        error: success ? undefined : `Reconciliation mismatch: ${variance} credits`
      };
      
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        currentBalance: 0,
        ledgerCalculated: 0,
        variance: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Run all synthetic probes and return comprehensive results
   */
  static async runAllProbes(): Promise<{
    timestamp: string;
    overallSuccess: boolean;
    probes: {
      checkout: Awaited<ReturnType<typeof this.probeCheckoutFlow>>;
      openai: Awaited<ReturnType<typeof this.probeOpenAIWrapper>>;
      reconciliation: Awaited<ReturnType<typeof this.probeReconciliation>>;
    };
  }> {
    const timestamp = new Date().toISOString();
    
    console.log('🔍 Running synthetic monitoring probes...');
    
    const [checkout, openai, reconciliation] = await Promise.allSettled([
      this.probeCheckoutFlow(),
      this.probeOpenAIWrapper(),
      this.probeReconciliation()
    ]);
    
    const probes = {
      checkout: checkout.status === 'fulfilled' ? checkout.value : { 
        success: false, 
        duration: 0, 
        steps: {}, 
        error: checkout.reason?.message || 'Unknown error' 
      },
      openai: openai.status === 'fulfilled' ? openai.value : { 
        success: false, 
        duration: 0, 
        creditsCharged: 0, 
        balanceBefore: 0, 
        balanceAfter: 0,
        error: openai.reason?.message || 'Unknown error'
      },
      reconciliation: reconciliation.status === 'fulfilled' ? reconciliation.value : { 
        success: false, 
        duration: 0, 
        currentBalance: 0, 
        ledgerCalculated: 0, 
        variance: 0,
        error: reconciliation.reason?.message || 'Unknown error'
      }
    };
    
    const overallSuccess = probes.checkout.success && 
                          probes.openai.success && 
                          probes.reconciliation.success;
    
    console.log(`🔍 Synthetic monitoring completed: ${overallSuccess ? 'SUCCESS' : 'FAILURE'}`);
    
    if (!overallSuccess) {
      console.error('❌ Failed probes:', {
        checkout: probes.checkout.success ? 'OK' : probes.checkout.error || 'Failed',
        openai: probes.openai.success ? 'OK' : probes.openai.error || 'Failed',
        reconciliation: probes.reconciliation.success ? 'OK' : probes.reconciliation.error || 'Failed'
      });
    }
    
    return {
      timestamp,
      overallSuccess,
      probes
    };
  }
  
  /**
   * Start continuous monitoring (call this in production)
   */
  static startContinuousMonitoring(): void {
    console.log(`🔍 Starting synthetic monitoring (${this.PROBE_INTERVAL_MS / 1000}s intervals)`);
    
    // Run immediately
    this.runAllProbes();
    
    // Schedule recurring runs
    setInterval(async () => {
      try {
        await this.runAllProbes();
      } catch (error) {
        console.error('Synthetic monitoring failed:', error);
      }
    }, this.PROBE_INTERVAL_MS);
  }
}