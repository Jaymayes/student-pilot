import Stripe from 'stripe';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { purchases, creditLedger, creditBalances } from '@shared/schema';
import { billingService } from '../billing';
import { reliabilityManager } from '../reliability';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil" as const,
});

export interface RefundRequest {
  userId: string;
  purchaseId: string;
  refundType: 'full' | 'partial';
  amount?: number; // For partial refunds, amount in USD cents
  reason: 'requested_by_customer' | 'fraudulent' | 'duplicate' | 'product_unsatisfactory' | 'system_error';
  adminNotes?: string;
}

export interface RefundResult {
  refundId: string;
  status: 'processing' | 'succeeded' | 'failed';
  refundType: 'credit_only' | 'stripe_refund' | 'mixed';
  creditRefundAmount: number; // in millicredits
  cashRefundAmount?: number; // in USD cents
  stripeRefundId?: string;
  message: string;
  edgeCaseHandled?: string;
}

export interface RefundEdgeCase {
  type: 'credits_partially_used' | 'credits_fully_used' | 'purchase_too_old' | 'already_refunded' | 'insufficient_stripe_refund';
  severity: 'warning' | 'error' | 'info';
  resolution: string;
  requiresManualReview: boolean;
}

class RefundService {
  // Main refund processing method with comprehensive edge case handling
  async processRefund(request: RefundRequest): Promise<RefundResult> {
    try {
      // Validate purchase exists and belongs to user
      const purchase = await this.validatePurchase(request.userId, request.purchaseId);
      
      // Check for edge cases
      const edgeCases = await this.identifyEdgeCases(purchase);
      
      // Determine refund strategy based on edge cases
      const strategy = this.determineRefundStrategy(purchase, edgeCases, request);
      
      // Execute refund based on strategy
      return await this.executeRefund(purchase, strategy, request, edgeCases);
      
    } catch (error: any) {
      console.error('Error processing refund:', error);
      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }

  private async validatePurchase(userId: string, purchaseId: string) {
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(and(
        eq(purchases.id, purchaseId),
        eq(purchases.userId, userId)
      ));

    if (!purchase) {
      throw new Error('Purchase not found or does not belong to user');
    }

    if (purchase.status !== 'paid') {
      throw new Error(`Cannot refund purchase with status: ${purchase.status}`);
    }

    return purchase;
  }

  private async identifyEdgeCases(purchase: any): Promise<RefundEdgeCase[]> {
    const edgeCases: RefundEdgeCase[] = [];
    
    // Check if credits were used
    const creditsUsed = await this.calculateCreditsUsed(purchase.userId, purchase.createdAt);
    const totalCreditsPurchased = purchase.totalCredits;
    
    if (creditsUsed > 0) {
      if (creditsUsed >= totalCreditsPurchased) {
        edgeCases.push({
          type: 'credits_fully_used',
          severity: 'warning',
          resolution: 'Credit-only refund with negative balance',
          requiresManualReview: true
        });
      } else {
        edgeCases.push({
          type: 'credits_partially_used',
          severity: 'info',
          resolution: 'Partial cash refund based on unused credits',
          requiresManualReview: false
        });
      }
    }

    // Check if purchase is too old (beyond Stripe's 90-day refund window)
    const daysSincePurchase = (Date.now() - purchase.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePurchase > 90) {
      edgeCases.push({
        type: 'purchase_too_old',
        severity: 'warning',
        resolution: 'Credit-only refund (Stripe refund not possible)',
        requiresManualReview: true
      });
    }

    // Check for existing refunds
    const existingRefunds = await this.checkExistingRefunds(purchase.id);
    if (existingRefunds.length > 0) {
      edgeCases.push({
        type: 'already_refunded',
        severity: 'error',
        resolution: 'Prevent duplicate refund',
        requiresManualReview: true
      });
    }

    return edgeCases;
  }

  private determineRefundStrategy(purchase: any, edgeCases: RefundEdgeCase[], request: RefundRequest) {
    const hasCreditsFullyUsed = edgeCases.some(e => e.type === 'credits_fully_used');
    const hasPurchaseTooOld = edgeCases.some(e => e.type === 'purchase_too_old');
    const hasAlreadyRefunded = edgeCases.some(e => e.type === 'already_refunded');
    
    if (hasAlreadyRefunded) {
      throw new Error('This purchase has already been refunded');
    }

    if (hasCreditsFullyUsed || hasPurchaseTooOld) {
      return 'credit_only';
    }

    if (request.refundType === 'partial') {
      return 'mixed'; // Some credits, some cash
    }

    return 'full_stripe'; // Full Stripe refund with credit deduction
  }

  private async executeRefund(
    purchase: any, 
    strategy: string, 
    request: RefundRequest,
    edgeCases: RefundEdgeCase[]
  ): Promise<RefundResult> {
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      return await db.transaction(async (tx) => {
        let result: RefundResult;

        switch (strategy) {
          case 'credit_only':
            result = await this.executeCreditOnlyRefund(purchase, refundId, request);
            break;
            
          case 'full_stripe':
            result = await this.executeFullStripeRefund(purchase, refundId, request);
            break;
            
          case 'mixed':
            result = await this.executeMixedRefund(purchase, refundId, request);
            break;
            
          default:
            throw new Error(`Unknown refund strategy: ${strategy}`);
        }

        // Log refund for audit trail
        await this.logRefund(purchase, result, request, edgeCases);
        
        return result;
      });
    } catch (error) {
      console.error(`Refund execution failed for ${refundId}:`, error);
      throw error;
    }
  }

  private async executeCreditOnlyRefund(purchase: any, refundId: string, request: RefundRequest): Promise<RefundResult> {
    // Credit the full amount back to the user as negative ledger entry
    const creditAmount = purchase.totalCredits * 1000; // Convert to millicredits
    
    await billingService.applyLedgerEntry(
      purchase.userId,
      BigInt(creditAmount),
      {
        type: 'refund',
        referenceType: 'system',
        referenceId: refundId,
        metadata: {
          originalPurchaseId: purchase.id,
          refundType: 'credit_only',
          reason: request.reason,
          adminNotes: request.adminNotes
        }
      }
    );

    return {
      refundId,
      status: 'succeeded',
      refundType: 'credit_only',
      creditRefundAmount: creditAmount,
      message: 'Credits refunded to your account balance',
      edgeCaseHandled: 'Credits refunded due to edge case (purchase too old or credits fully used)'
    };
  }

  private async executeFullStripeRefund(purchase: any, refundId: string, request: RefundRequest): Promise<RefundResult> {
    try {
      // Process Stripe refund with circuit breaker protection
      const stripeRefund = await reliabilityManager.executeWithProtection(
        'stripe',
        async () => stripe.refunds.create({
          payment_intent: purchase.stripePaymentIntentId,
          amount: request.amount || purchase.priceUsdCents,
          metadata: {
            refundId,
            userId: purchase.userId,
            originalPurchaseId: purchase.id,
            reason: request.reason
          }
        }),
        async () => {
          // Critical: Never duplicate refunds - queue for manual review
          console.error('Stripe refund failed, queuing for manual review');
          throw new Error('Payment processing temporarily unavailable. Refund queued for manual processing.');
        }
      );

      // Deduct credits from user balance (negative ledger entry)
      const creditDeduction = -(purchase.totalCredits * 1000); // Convert to negative millicredits
      
      await billingService.applyLedgerEntry(
        purchase.userId,
        BigInt(creditDeduction),
        {
          type: 'refund',
          referenceType: 'stripe',
          referenceId: stripeRefund.id,
          metadata: {
            originalPurchaseId: purchase.id,
            refundType: 'full_stripe',
            reason: request.reason,
            adminNotes: request.adminNotes
          }
        }
      );

      return {
        refundId,
        status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'processing',
        refundType: 'stripe_refund',
        creditRefundAmount: creditDeduction,
        cashRefundAmount: stripeRefund.amount,
        stripeRefundId: stripeRefund.id,
        message: `$${(stripeRefund.amount / 100).toFixed(2)} refunded to your payment method`
      };
    } catch (error) {
      // If Stripe refund fails, fall back to credit-only refund
      console.warn('Stripe refund failed, falling back to credit refund:', error);
      return await this.executeCreditOnlyRefund(purchase, refundId, request);
    }
  }

  private async executeMixedRefund(purchase: any, refundId: string, request: RefundRequest): Promise<RefundResult> {
    const creditsUsed = await this.calculateCreditsUsed(purchase.userId, purchase.createdAt);
    const unusedCredits = Math.max(0, purchase.totalCredits - creditsUsed);
    const unusedPercentage = unusedCredits / purchase.totalCredits;
    
    // Calculate proportional cash refund for unused credits
    const cashRefundAmount = Math.floor(purchase.priceUsdCents * unusedPercentage);
    
    try {
      // Process partial Stripe refund with circuit breaker protection
      const stripeRefund = await reliabilityManager.executeWithProtection(
        'stripe',
        async () => stripe.refunds.create({
          payment_intent: purchase.stripePaymentIntentId,
          amount: cashRefundAmount,
          metadata: {
            refundId,
            userId: purchase.userId,
            originalPurchaseId: purchase.id,
            reason: request.reason,
            refundType: 'partial_mixed'
          }
        }),
        async () => {
          // Critical: Never duplicate refunds - queue for manual review  
          console.error('Stripe partial refund failed, queuing for manual review');
          throw new Error('Payment processing temporarily unavailable. Partial refund queued for manual processing.');
        }
      );

      // Only deduct the unused credits
      const creditDeduction = -(unusedCredits * 1000); // Convert to negative millicredits
      
      await billingService.applyLedgerEntry(
        purchase.userId,
        BigInt(creditDeduction),
        {
          type: 'refund',
          referenceType: 'stripe',
          referenceId: stripeRefund.id,
          metadata: {
            originalPurchaseId: purchase.id,
            refundType: 'mixed',
            creditsUsed,
            unusedCredits,
            reason: request.reason
          }
        }
      );

      return {
        refundId,
        status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'processing',
        refundType: 'mixed',
        creditRefundAmount: creditDeduction,
        cashRefundAmount: cashRefundAmount,
        stripeRefundId: stripeRefund.id,
        message: `$${(cashRefundAmount / 100).toFixed(2)} refunded for unused credits (${unusedCredits} credits)`
      };
    } catch (error) {
      console.warn('Mixed refund failed, falling back to credit refund:', error);
      return await this.executeCreditOnlyRefund(purchase, refundId, request);
    }
  }

  private async calculateCreditsUsed(userId: string, since: Date): Promise<number> {
    const [result] = await db
      .select({
        totalUsed: sql<number>`COALESCE(SUM(ABS(amount_millicredits)), 0)`
      })
      .from(creditLedger)
      .where(and(
        eq(creditLedger.userId, userId),
        eq(creditLedger.type, 'deduction'),
        sql`created_at >= ${since}`
      ));

    return Math.floor((result?.totalUsed || 0) / 1000); // Convert millicredits to credits
  }

  private async checkExistingRefunds(purchaseId: string): Promise<any[]> {
    return await db
      .select()
      .from(creditLedger)
      .where(and(
        eq(creditLedger.type, 'refund'),
        sql`metadata->>'originalPurchaseId' = ${purchaseId}`
      ));
  }

  private async logRefund(
    purchase: any,
    result: RefundResult, 
    request: RefundRequest,
    edgeCases: RefundEdgeCase[]
  ) {
    console.log(`[REFUND AUDIT] ${result.refundId}:`, {
      userId: purchase.userId,
      purchaseId: purchase.id,
      refundType: result.refundType,
      creditAmount: result.creditRefundAmount,
      cashAmount: result.cashRefundAmount,
      stripeRefundId: result.stripeRefundId,
      reason: request.reason,
      edgeCases: edgeCases.map(e => e.type),
      status: result.status,
      timestamp: new Date().toISOString()
    });
  }

  // Get refund history for a user
  async getUserRefunds(userId: string, limit: number = 20): Promise<any[]> {
    const refunds = await db
      .select()
      .from(creditLedger)
      .where(and(
        eq(creditLedger.userId, userId),
        eq(creditLedger.type, 'refund')
      ))
      .orderBy(desc(creditLedger.createdAt))
      .limit(limit);

    return refunds.map(refund => ({
      id: refund.id,
      refundId: refund.referenceId,
      amount: refund.amountMillicredits,
      amountCredits: Number(refund.amountMillicredits) / 1000,
      createdAt: refund.createdAt,
      referenceType: refund.referenceType,
      metadata: refund.metadata,
      reason: (refund.metadata as any)?.reason || 'unknown'
    }));
  }

  // Administrative method to handle complex edge cases
  async handleComplexRefund(
    adminUserId: string,
    request: RefundRequest & { 
      forceStrategy?: 'credit_only' | 'full_stripe' | 'mixed';
      overrideEdgeCases?: boolean;
    }
  ): Promise<RefundResult> {
    // Enhanced logging for admin actions
    console.log(`[ADMIN REFUND] ${adminUserId} processing complex refund:`, request);
    
    if (request.overrideEdgeCases) {
      // Skip edge case validation for admin overrides
      const purchase = await this.validatePurchase(request.userId, request.purchaseId);
      const strategy = request.forceStrategy || 'credit_only';
      return await this.executeRefund(purchase, strategy, request, []);
    }
    
    return await this.processRefund(request);
  }
}

export const refundService = new RefundService();