import { eq, and, desc, sql } from "drizzle-orm";
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

// Credit package definitions with exact pricing and bonuses
export const CREDIT_PACKAGES = {
  starter: {
    priceUsdCents: 500, // $5.00
    baseCredits: 5000,
    bonusCredits: 0,
    totalCredits: 5000,
  },
  basic: {
    priceUsdCents: 2000, // $20.00
    baseCredits: 20000,
    bonusCredits: 0,
    totalCredits: 20000,
  },
  pro: {
    priceUsdCents: 5000, // $50.00
    baseCredits: 50000,
    bonusCredits: 2500, // 5% bonus
    totalCredits: 52500,
  },
  business: {
    priceUsdCents: 10000, // $100.00
    baseCredits: 100000,
    bonusCredits: 10000, // 10% bonus
    totalCredits: 110000,
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

// Utility functions
export function creditsToMillicredits(credits: number): bigint {
  return BigInt(Math.round(credits * MILLICREDITS_PER_CREDIT));
}

export function millicreditsToCredits(millicredits: bigint): number {
  return Number(millicredits) / MILLICREDITS_PER_CREDIT;
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
  }

  // Calculate charge in millicredits for usage
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

    // Calculate cost in credits (exact decimal calculation)
    const inputCostCredits = (inputTokens / 1000) * Number(rates.inputCreditsPer1k);
    const outputCostCredits = (outputTokens / 1000) * Number(rates.outputCreditsPer1k);
    const totalCostCredits = inputCostCredits + outputCostCredits;

    let finalCostCredits = totalCostCredits;
    
    // Apply rounding mode
    if (roundingMode === "ceil") {
      finalCostCredits = Math.ceil(totalCostCredits);
    }

    const chargeMillicredits = creditsToMillicredits(finalCostCredits);

    return {
      chargeMillicredits,
      appliedRates: rates,
    };
  }

  // Get user's current balance
  async getUserBalance(userId: string): Promise<CreditBalance> {
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

      // Calculate millicredits to award
      const millicreditsToAward = creditsToMillicredits(purchase.totalCredits);

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

    return {
      balanceCredits: Number(balanceCredits.toFixed(2)),
      balanceMillicredits: balance.balanceMillicredits || BigInt(0),
      balanceUsd: creditsToUsd(balanceCredits),
      packages: Object.entries(CREDIT_PACKAGES).map(([code, pkg]) => ({
        code,
        ...pkg,
        priceUsd: pkg.priceUsdCents / 100,
      })),
      rateCard: activeRates,
      recentLedger,
      recentUsage,
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
            sql`${creditLedger.createdAt} < ${cursorDate}`
          )
        )
        .orderBy(desc(creditLedger.createdAt))
        .limit(limit + 1);
    }

    const entries = await query;
    const hasMore = entries.length > limit;
    const resultEntries = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? entries[limit]?.createdAt?.toISOString() : undefined;

    return {
      entries: resultEntries,
      nextCursor,
    };
  }

  // Get paginated usage events
  async getUserUsage(
    userId: string,
    limit: number = 100,
    cursor?: string
  ): Promise<{
    usage: UsageEvent[];
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
            sql`${usageEvents.createdAt} < ${cursorDate}`
          )
        )
        .orderBy(desc(usageEvents.createdAt))
        .limit(limit + 1);
    }

    const usage = await query;
    const hasMore = usage.length > limit;
    const resultUsage = hasMore ? usage.slice(0, limit) : usage;
    const nextCursor = hasMore ? usage[limit]?.createdAt?.toISOString() : undefined;

    return {
      usage: resultUsage,
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