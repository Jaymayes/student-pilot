import { eq, and, desc, sql, lt } from "drizzle-orm";
import { db } from "./db";
import {
  creditBalances,
  creditLedger,
  purchases,
  rateCard,
  usageEvents,
  type CreditBalance,
  type CreditLedgerEntry,
  type Purchase,
  type RateCardEntry,
  type UsageEvent,
  type InsertCreditLedgerEntry,
  type InsertPurchase,
  type InsertUsageEvent,
} from "@shared/schema";

// Constants
export const CREDITS_PER_DOLLAR = 1000; // 1,000 credits = $1.00 USD
export const MILLICREDITS_PER_CREDIT = 1000; // 1 credit = 1,000 millicredits

// Credit package definitions with exact pricing and bonuses - QA-010: BigInt precision
// 1,000 credits = $1.00 USD, stored as millicredits for precision
export const CREDIT_PACKAGES = {
  starter: {
    priceUsdCents: 999, // $9.99
    baseCredits: 9990,
    bonusCredits: 0,
    totalCredits: 9990,
    // BigInt millicredits for precise calculations
    totalMillicredits: BigInt(9990 * MILLICREDITS_PER_CREDIT),
  },
  professional: {
    priceUsdCents: 4999, // $49.99
    baseCredits: 49990,
    bonusCredits: 2500, // ~5% bonus
    totalCredits: 52490,
    totalMillicredits: BigInt(52490 * MILLICREDITS_PER_CREDIT),
  },
  enterprise: {
    priceUsdCents: 9999, // $99.99
    baseCredits: 99990,
    bonusCredits: 10000, // ~10% bonus  
    totalCredits: 109990,
    totalMillicredits: BigInt(109990 * MILLICREDITS_PER_CREDIT),
  },
} as const;

export type PackageCode = keyof typeof CREDIT_PACKAGES;

// Error classes
export class InsufficientCreditsError extends Error {
  constructor(
    public required: bigint,
    public current: bigint,
    message = "Insufficient credits"
  ) {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export class PaymentRequiredError extends Error {
  constructor(
    public requiredCredits: number,
    public currentCredits: number,
    message = "Payment required"
  ) {
    super(message);
    this.name = "PaymentRequiredError";
  }
}

// Utility functions - QA-010: Fixed precision errors with pure BigInt operations
export function creditsToMillicredits(credits: number): bigint {
  // Convert to integer millicredits to avoid floating point precision issues
  return BigInt(Math.floor(credits * MILLICREDITS_PER_CREDIT));
}

export function millicreditsToCredits(millicredits: bigint): number {
  // Safe conversion for display purposes only - never use for calculations
  return Number(millicredits) / MILLICREDITS_PER_CREDIT;
}

// New BigInt-only utility functions for calculations
export function creditsToMillicreditsBigInt(creditsBigInt: bigint): bigint {
  return creditsBigInt * BigInt(MILLICREDITS_PER_CREDIT);
}

export function millicreditsToFullCredits(millicredits: bigint): bigint {
  return millicredits / BigInt(MILLICREDITS_PER_CREDIT);
}

export function formatCredits(millicredits: bigint): string {
  const credits = millicreditsToCredits(millicredits);
  return credits.toFixed(2);
}

export function creditsToUsd(credits: number): number {
  return credits / CREDITS_PER_DOLLAR;
}

// Core billing service class
export class BillingService {
  // Get current rate for a model
  async getCurrentRate(model: string): Promise<RateCardEntry> {
    try {
      const [rate] = await db
        .select()
        .from(rateCard)
        .where(and(eq(rateCard.model, model), eq(rateCard.active, true)))
        .orderBy(desc(rateCard.effectiveFrom))
        .limit(1);

      if (!rate) {
        throw new Error(`No active rate found for model: ${model}`);
      }

      return rate;
    } catch (error) {
      console.error(`Error getting current rate for model ${model}:`, error);
      throw error;
    }
  }

  // Calculate charge in millicredits for usage - QA-010: Fixed precision with BigInt arithmetic
  async calculateChargeMillicredits(
    model: string,
    inputTokens: number,
    outputTokens: number,
    roundingMode: "exact" | "ceil" = "exact"
  ): Promise<{
    chargeMillicredits: bigint;
    appliedRates: RateCardEntry;
  }> {
    const rates = await this.getCurrentRate(model);

    // All calculations in BigInt millicredits to prevent precision loss
    const inputTokensBigInt = BigInt(inputTokens);
    const outputTokensBigInt = BigInt(outputTokens);
    const inputRateMillicredits = BigInt(rates.inputCreditsPer1k) * BigInt(MILLICREDITS_PER_CREDIT);
    const outputRateMillicredits = BigInt(rates.outputCreditsPer1k) * BigInt(MILLICREDITS_PER_CREDIT);
    
    // Calculate cost in millicredits using integer arithmetic
    const inputCostMillicredits = (inputTokensBigInt * inputRateMillicredits) / BigInt(1000);
    const outputCostMillicredits = (outputTokensBigInt * outputRateMillicredits) / BigInt(1000);
    let totalCostMillicredits = inputCostMillicredits + outputCostMillicredits;
    
    // Apply rounding mode (using BigInt arithmetic)
    if (roundingMode === "ceil") {
      // Ceil operation: if there's any remainder, round up to next millicredit
      const inputRemainder = (inputTokensBigInt * inputRateMillicredits) % BigInt(1000);
      const outputRemainder = (outputTokensBigInt * outputRateMillicredits) % BigInt(1000);
      if (inputRemainder > BigInt(0) || outputRemainder > BigInt(0)) {
        totalCostMillicredits += BigInt(1);
      }
    }

    return {
      chargeMillicredits: totalCostMillicredits,
      appliedRates: rates,
    };
  }

  // Get user's current balance
  async getUserBalance(userId: string): Promise<CreditBalance> {
    try {
      let [balance] = await db
        .select()
        .from(creditBalances)
        .where(eq(creditBalances.userId, userId));

      if (!balance) {
        // Create initial balance for new user
        [balance] = await db
          .insert(creditBalances)
          .values({
            userId,
            balanceMillicredits: BigInt(0),
          })
          .returning();
      }

      return balance;
    } catch (error) {
      console.error(`Error getting user balance for userId ${userId}:`, error);
      throw error;
    }
  }

  // Apply ledger entry with transaction safety
  async applyLedgerEntry(
    userId: string,
    deltaMillicredits: bigint,
    entry: {
      type: "purchase" | "deduction" | "refund" | "adjustment";
      referenceType: "stripe" | "openai" | "admin" | "system";
      referenceId?: string;
      metadata?: any;
    }
  ): Promise<{ newBalance: bigint; ledgerEntry: CreditLedgerEntry }> {
    try {
      return await db.transaction(async (tx) => {
        // Lock the user's balance row for update
        const [currentBalance] = await tx
          .select()
          .from(creditBalances)
          .where(eq(creditBalances.userId, userId))
          .for("update");

        if (!currentBalance) {
          throw new Error("User balance not found");
        }

        const newBalanceMillicredits = (currentBalance.balanceMillicredits || BigInt(0)) + deltaMillicredits;

        // Prevent negative balances for deductions  
        if (deltaMillicredits < 0 && newBalanceMillicredits < 0) {
          throw new InsufficientCreditsError(
            -deltaMillicredits,
            currentBalance.balanceMillicredits || BigInt(0),
            "Insufficient credits for this operation"
          );
        }

        // Update balance
        await tx
          .update(creditBalances)
          .set({
            balanceMillicredits: newBalanceMillicredits,
            updatedAt: new Date(),
          })
          .where(eq(creditBalances.userId, userId));

        // Create ledger entry
        const [ledgerEntry] = await tx
          .insert(creditLedger)
          .values({
            userId,
            type: entry.type,
            amountMillicredits: deltaMillicredits,
            balanceAfterMillicredits: newBalanceMillicredits,
            referenceType: entry.referenceType,
            referenceId: entry.referenceId,
            metadata: entry.metadata,
          })
          .returning();

        return {
          newBalance: newBalanceMillicredits,
          ledgerEntry,
        };
      });
    } catch (error) {
      console.error(`Error applying ledger entry for userId ${userId}:`, error);
      throw error;
    }
  }

  // Charge user for OpenAI usage
  async chargeForUsage(
    userId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    openaiRequestId?: string,
    roundingMode: "exact" | "ceil" = "exact"
  ): Promise<{
    chargedMillicredits: bigint;
    newBalance: bigint;
    usageEvent: UsageEvent;
  }> {
    try {
      const { chargeMillicredits, appliedRates } = await this.calculateChargeMillicredits(
        model,
        inputTokens,
        outputTokens,
        roundingMode
      );

      // Check if user has sufficient balance
      const balance = await this.getUserBalance(userId);
      const currentBalanceMillicredits = balance.balanceMillicredits || BigInt(0);
      if (currentBalanceMillicredits < chargeMillicredits) {
        const requiredCredits = millicreditsToCredits(chargeMillicredits);
        const currentCredits = millicreditsToCredits(currentBalanceMillicredits);
        throw new PaymentRequiredError(requiredCredits, currentCredits);
      }

      return await db.transaction(async (tx) => {
        // Apply charge to ledger and balance
        const { newBalance } = await this.applyLedgerEntry(
          userId,
          -chargeMillicredits, // negative for deduction
          {
            type: "deduction",
            referenceType: "openai",
            referenceId: openaiRequestId,
            metadata: {
              model,
              inputTokens,
              outputTokens,
              inputRate: appliedRates.inputCreditsPer1k,
              outputRate: appliedRates.outputCreditsPer1k,
            },
          }
        );

        // Create usage event record
        const [usageEvent] = await tx
          .insert(usageEvents)
          .values({
            userId,
            model,
            inputTokens,
            outputTokens,
            appliedInputCreditsPer1k: appliedRates.inputCreditsPer1k,
            appliedOutputCreditsPer1k: appliedRates.outputCreditsPer1k,
            chargedMillicredits: chargeMillicredits,
            openaiRequestId,
          })
          .returning();

        return {
          chargedMillicredits: chargeMillicredits,
          newBalance,
          usageEvent,
        };
      });
    } catch (error) {
      console.error(`Error charging for usage for userId ${userId}:`, error);
      throw error;
    }
  }

  // Award credits from purchase (idempotent)
  async awardPurchaseCredits(purchaseId: string): Promise<Purchase> {
    return await db.transaction(async (tx) => {
      const [purchase] = await tx
        .select()
        .from(purchases)
        .where(eq(purchases.id, purchaseId))
        .for("update");

      if (!purchase) {
        throw new Error("Purchase not found");
      }

      if (purchase.status === "fulfilled") {
        // Already fulfilled, return early (idempotent)
        return purchase;
      }

      if (purchase.status !== "paid") {
        throw new Error(`Cannot fulfill purchase with status: ${purchase.status}`);
      }

      // Calculate millicredits to award - QA-010: Use BigInt precision
      const packageInfo = CREDIT_PACKAGES[purchase.packageCode as PackageCode];
      const millicreditsToAward = packageInfo ? packageInfo.totalMillicredits : creditsToMillicreditsBigInt(BigInt(purchase.totalCredits));

      // Apply credit addition to ledger and balance
      await this.applyLedgerEntry(
        purchase.userId,
        millicreditsToAward,
        {
          type: "purchase",
          referenceType: "stripe",
          referenceId: purchase.stripePaymentIntentId || purchase.stripeSessionId || undefined,
          metadata: {
            purchaseId,
            packageCode: purchase.packageCode,
            baseCredits: purchase.baseCredits,
            bonusCredits: purchase.bonusCredits,
            totalCredits: purchase.totalCredits,
          },
        }
      );

      // Mark purchase as fulfilled
      const [updatedPurchase] = await tx
        .update(purchases)
        .set({ status: "fulfilled", updatedAt: new Date() })
        .where(eq(purchases.id, purchaseId))
        .returning();

      return updatedPurchase;
    });
  }

  // Get user's billing summary
  async getUserBillingSummary(userId: string) {
    const balance = await this.getUserBalance(userId);
    const balanceCredits = millicreditsToCredits(balance.balanceMillicredits || BigInt(0));

    // Get recent ledger entries
    const recentLedger = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId))
      .orderBy(desc(creditLedger.createdAt))
      .limit(10);

    // Get recent usage events
    const recentUsage = await db
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.userId, userId))
      .orderBy(desc(usageEvents.createdAt))
      .limit(10);

    // Get active rate card
    const activeRates = await db
      .select()
      .from(rateCard)
      .where(eq(rateCard.active, true))
      .orderBy(rateCard.model);

    // Convert BigInt values to numbers for JSON serialization
    const formatLedgerEntry = (entry: any) => ({
      ...entry,
      amountMillicredits: Number(entry.amountMillicredits || 0),
      balanceAfterMillicredits: Number(entry.balanceAfterMillicredits || 0),
      amount: millicreditsToCredits(entry.amountMillicredits || BigInt(0)),
      balanceAfter: millicreditsToCredits(entry.balanceAfterMillicredits || BigInt(0)),
    });

    const formatUsageEntry = (entry: any) => ({
      ...entry,
      chargedMillicredits: Number(entry.chargedMillicredits || 0),
      creditsCharged: millicreditsToCredits(entry.chargedMillicredits || BigInt(0)),
    });

    return {
      currentBalance: Number(balanceCredits.toFixed(2)),
      lifetimeSpent: Number(balanceCredits.toFixed(2)), // Will calculate properly in next iteration
      totalPurchased: Number(balanceCredits.toFixed(2)), // Will calculate properly in next iteration
      balanceCredits: Number(balanceCredits.toFixed(2)),
      balanceUsd: creditsToUsd(balanceCredits),
      packages: Object.entries(CREDIT_PACKAGES).map(([code, pkg]) => ({
        code,
        ...pkg,
        priceUsd: pkg.priceUsdCents / 100,
      })),
      rateCard: activeRates,
      recentActivity: recentLedger.slice(0, 5).map(formatLedgerEntry),
      recentLedger: recentLedger.map(formatLedgerEntry),
      recentUsage: recentUsage.map(formatUsageEntry),
    };
  }

  // Get paginated ledger entries
  async getUserLedger(
    userId: string,
    limit: number = 100,
    cursor?: string
  ): Promise<{
    entries: CreditLedgerEntry[];
    nextCursor?: string;
  }> {
    let query = db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId))
      .orderBy(desc(creditLedger.createdAt))
      .limit(limit + 1); // Get one extra to check for next page

    if (cursor) {
      const cursorDate = new Date(cursor);
      query = db
        .select()
        .from(creditLedger)
        .where(
          and(
            eq(creditLedger.userId, userId),
            lt(creditLedger.createdAt, cursorDate)
          )
        )
        .orderBy(desc(creditLedger.createdAt))
        .limit(limit + 1);
    }

    const entries = await query;
    const hasMore = entries.length > limit;
    const resultEntries = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? entries[limit]?.createdAt?.toISOString() : undefined;

    // Convert BigInt values to numbers for JSON serialization
    const formatLedgerEntry = (entry: any) => ({
      ...entry,
      amountMillicredits: Number(entry.amountMillicredits || 0),
      balanceAfterMillicredits: Number(entry.balanceAfterMillicredits || 0),
      amount: millicreditsToCredits(entry.amountMillicredits || BigInt(0)),
      balanceAfter: millicreditsToCredits(entry.balanceAfterMillicredits || BigInt(0)),
      description: entry.type === 'purchase' ? 'Credit purchase' : 
                  entry.type === 'deduction' ? 'AI usage' : 
                  entry.type === 'bonus' ? 'Bonus credits' : entry.type,
    });

    return {
      entries: resultEntries.map(formatLedgerEntry),
      nextCursor,
    };
  }

  // Get paginated usage events
  async getUserUsage(
    userId: string,
    limit: number = 100,
    cursor?: string
  ): Promise<{
    entries: UsageEvent[];
    nextCursor?: string;
  }> {
    let query = db
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.userId, userId))
      .orderBy(desc(usageEvents.createdAt))
      .limit(limit + 1);

    if (cursor) {
      const cursorDate = new Date(cursor);
      query = db
        .select()
        .from(usageEvents)
        .where(
          and(
            eq(usageEvents.userId, userId),
            lt(usageEvents.createdAt, cursorDate)
          )
        )
        .orderBy(desc(usageEvents.createdAt))
        .limit(limit + 1);
    }

    const usage = await query;
    const hasMore = usage.length > limit;
    const resultUsage = hasMore ? usage.slice(0, limit) : usage;
    const nextCursor = hasMore ? usage[limit]?.createdAt?.toISOString() : undefined;

    // Convert BigInt values to numbers for JSON serialization
    const formatUsageEntry = (entry: any) => ({
      ...entry,
      chargedMillicredits: Number(entry.chargedMillicredits || 0),
      creditsCharged: millicreditsToCredits(entry.chargedMillicredits || BigInt(0)),
      description: `${entry.model} analysis (${entry.inputTokens} in, ${entry.outputTokens} out)`,
    });

    return {
      entries: resultUsage.map(formatUsageEntry),
      nextCursor,
    };
  }

  // Estimate cost for potential usage (dry run)
  async estimateCharge(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<{
    creditsRequired: number;
    usdEquivalent: number;
    breakdown: {
      inputCost: number;
      outputCost: number;
      inputRate: string;
      outputRate: string;
    };
  }> {
    const { chargeMillicredits, appliedRates } = await this.calculateChargeMillicredits(
      model,
      inputTokens,
      outputTokens
    );

    const creditsRequired = millicreditsToCredits(chargeMillicredits);
    const inputCost = (inputTokens / 1000) * Number(appliedRates.inputCreditsPer1k);
    const outputCost = (outputTokens / 1000) * Number(appliedRates.outputCreditsPer1k);

    return {
      creditsRequired,
      usdEquivalent: creditsToUsd(creditsRequired),
      breakdown: {
        inputCost,
        outputCost,
        inputRate: appliedRates.inputCreditsPer1k,
        outputRate: appliedRates.outputCreditsPer1k,
      },
    };
  }
}

// Export singleton instance
export const billingService = new BillingService();