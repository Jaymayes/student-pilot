// Usage service for processing token usage and charging credits

import { Decimal } from 'decimal.js';
import { prisma, withTransaction } from './database';
import { getModelRates, getActiveRateCard } from './rateCardService';
import { getUserForUpdate, updateUserBalance } from './userService';
import {
  UsageReconcileRequest,
  UsageReconcileResponse,
  InsufficientCreditsError,
} from '@/types';
import {
  createDecimal,
  calculateUsageCost,
  applyRounding,
  formatCreditsForStorage,
} from '@/utils/decimal';
import pino from 'pino';

const logger = pino({ name: 'usage-service' });

/**
 * Process usage reconciliation with idempotency and balance checking
 */
export async function reconcileUsage(
  request: UsageReconcileRequest
): Promise<UsageReconcileResponse | InsufficientCreditsError> {
  try {
    logger.info(
      {
        userId: request.userId,
        model: request.model,
        inputTokens: request.inputTokens,
        outputTokens: request.outputTokens,
        requestId: request.requestId,
        idempotencyKey: request.idempotencyKey,
      },
      'Processing usage reconciliation'
    );

    // Check for existing idempotency key first
    const existingEntry = await checkIdempotencyKey(request.idempotencyKey);
    if (existingEntry) {
      logger.info(
        { idempotencyKey: request.idempotencyKey },
        'Usage already reconciled, returning existing result'
      );
      return existingEntry;
    }

    // Validate model exists
    const modelRates = await getModelRates(request.model);
    const { version: rateVersion } = await getActiveRateCard();

    // Calculate usage cost
    const costCredits = calculateUsageCost(
      request.inputTokens,
      request.outputTokens,
      modelRates.inputPer1k,
      modelRates.outputPer1k
    );

    // Apply rounding policy
    const finalCost = applyRounding(costCredits);

    logger.info(
      {
        userId: request.userId,
        model: request.model,
        costCredits: costCredits.toString(),
        finalCost: finalCost.toString(),
        rateVersion,
      },
      'Calculated usage cost'
    );

    // Process the debit in a transaction
    return await withTransaction(async (tx) => {
      // Get user with lock for update
      const userForUpdate = await getUserForUpdate(request.userId, tx);

      // Check sufficient balance
      if (userForUpdate.balanceCredits.lt(finalCost)) {
        const shortfall = finalCost.minus(userForUpdate.balanceCredits);
        
        logger.warn(
          {
            userId: request.userId,
            required: finalCost.toString(),
            available: userForUpdate.balanceCredits.toString(),
            shortfall: shortfall.toString(),
          },
          'Insufficient credits for usage'
        );

        return {
          error: 'insufficient_credits',
          required: formatCreditsForStorage(finalCost),
          available: formatCreditsForStorage(userForUpdate.balanceCredits),
          shortfall: formatCreditsForStorage(shortfall),
        } as InsufficientCreditsError;
      }

      // Calculate new balance
      const newBalance = userForUpdate.balanceCredits.minus(finalCost);

      // Update user balance
      await updateUserBalance(request.userId, newBalance, tx);

      // Create ledger entry
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          userId: request.userId,
          kind: 'debit',
          amountCredits: finalCost.toString(),
          model: request.model,
          inputTokens: request.inputTokens,
          outputTokens: request.outputTokens,
          rateVersion,
          reason: 'Token usage',
          requestId: request.requestId,
          idempotencyKey: request.idempotencyKey,
          metadata: {
            inputRate: modelRates.inputPer1k,
            outputRate: modelRates.outputPer1k,
            rawCost: costCredits.toString(),
            appliedCost: finalCost.toString(),
            markup: 4,
          },
        },
      });

      logger.info(
        {
          userId: request.userId,
          ledgerEntryId: ledgerEntry.id,
          chargedCredits: finalCost.toString(),
          newBalance: newBalance.toString(),
        },
        'Usage reconciled successfully'
      );

      return {
        success: true,
        balanceCredits: formatCreditsForStorage(newBalance),
        chargedCredits: formatCreditsForStorage(finalCost),
        ledgerEntryId: ledgerEntry.id,
      } as UsageReconcileResponse;
    });
  } catch (error) {
    logger.error(
      { error, request },
      'Failed to reconcile usage'
    );
    throw error;
  }
}

/**
 * Check if idempotency key has been used
 */
async function checkIdempotencyKey(
  idempotencyKey: string
): Promise<UsageReconcileResponse | null> {
  const existingEntry = await prisma.ledgerEntry.findUnique({
    where: { idempotencyKey },
    include: {
      user: {
        select: { balanceCredits: true },
      },
    },
  });

  if (!existingEntry) {
    return null;
  }

  // Return the same response as if it were processed now
  return {
    success: true,
    balanceCredits: formatCreditsForStorage(
      createDecimal(existingEntry.user.balanceCredits.toString())
    ),
    chargedCredits: formatCreditsForStorage(
      createDecimal(existingEntry.amountCredits.toString())
    ),
    ledgerEntryId: existingEntry.id,
  };
}

/**
 * Get usage statistics for a user
 */
export async function getUserUsageStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCreditsUsed: string;
  totalTokensProcessed: number;
  requestCount: number;
  modelBreakdown: Record<string, {
    creditsUsed: string;
    inputTokens: number;
    outputTokens: number;
    requestCount: number;
  }>;
}> {
  const whereClause: any = {
    userId,
    kind: 'debit',
    model: { not: null },
  };

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = startDate;
    if (endDate) whereClause.createdAt.lte = endDate;
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: whereClause,
    select: {
      amountCredits: true,
      model: true,
      inputTokens: true,
      outputTokens: true,
    },
  });

  let totalCreditsUsed = createDecimal(0);
  let totalTokensProcessed = 0;
  const modelBreakdown: Record<string, any> = {};

  for (const entry of entries) {
    const credits = createDecimal(entry.amountCredits.toString());
    const inputTokens = entry.inputTokens || 0;
    const outputTokens = entry.outputTokens || 0;
    const model = entry.model!;

    totalCreditsUsed = totalCreditsUsed.add(credits);
    totalTokensProcessed += inputTokens + outputTokens;

    if (!modelBreakdown[model]) {
      modelBreakdown[model] = {
        creditsUsed: createDecimal(0),
        inputTokens: 0,
        outputTokens: 0,
        requestCount: 0,
      };
    }

    modelBreakdown[model].creditsUsed = modelBreakdown[model].creditsUsed.add(credits);
    modelBreakdown[model].inputTokens += inputTokens;
    modelBreakdown[model].outputTokens += outputTokens;
    modelBreakdown[model].requestCount++;
  }

  // Format model breakdown for response
  const formattedModelBreakdown: Record<string, any> = {};
  for (const [model, stats] of Object.entries(modelBreakdown)) {
    formattedModelBreakdown[model] = {
      ...stats,
      creditsUsed: formatCreditsForStorage(stats.creditsUsed),
    };
  }

  return {
    totalCreditsUsed: formatCreditsForStorage(totalCreditsUsed),
    totalTokensProcessed,
    requestCount: entries.length,
    modelBreakdown: formattedModelBreakdown,
  };
}