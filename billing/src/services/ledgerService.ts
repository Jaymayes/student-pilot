// Ledger service for transaction history and auditing

import { prisma } from './database';
import { LedgerQuery, LedgerResult } from '@/types';
import {
  decimal,
  toDbString,
  fromDbString,
  formatCreditsForDisplay,
} from '@/utils/decimal';
import pino from 'pino';

const logger = pino({ name: 'ledger-service' });

/**
 * Get paginated ledger entries for a user
 */
export async function getUserLedger(
  userId: string,
  limit: number = 50,
  cursor?: string
): Promise<{
  entries: Array<{
    id: string;
    kind: string;
    amountCredits: string;
    displayAmount: string;
    usdCents?: number;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    rateVersion: string;
    reason: string;
    requestId?: string;
    metadata: Record<string, any>;
    createdAt: string;
  }>;
  hasMore: boolean;
  nextCursor?: string;
}> {
  const whereClause: any = { userId };
  
  if (cursor) {
    whereClause.createdAt = { lt: new Date(cursor) };
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = entries.length > limit;
  const items = hasMore ? entries.slice(0, -1) : entries;

  return {
    entries: items.map(entry => {
      const amount = fromDbString(entry.amountCredits.toString());
      return {
        id: entry.id,
        kind: entry.kind,
        amountCredits: toDbString(amount),
        displayAmount: formatCreditsForDisplay(amount),
        usdCents: entry.usdCents || undefined,
        model: entry.model || undefined,
        inputTokens: entry.inputTokens || undefined,
        outputTokens: entry.outputTokens || undefined,
        rateVersion: entry.rateVersion,
        reason: entry.reason,
        requestId: entry.requestId || undefined,
        metadata: entry.metadata as Record<string, any>,
        createdAt: entry.createdAt.toISOString(),
      };
    }),
    hasMore,
    nextCursor: hasMore ? items[items.length - 1]?.createdAt.toISOString() : undefined,
  };
}

/**
 * Get ledger entries for admin view
 */
export async function getAdminLedger(
  userId?: string,
  limit: number = 100,
  cursor?: string
): Promise<{
  entries: Array<{
    id: string;
    userId: string;
    userEmail?: string;
    kind: string;
    amountCredits: string;
    displayAmount: string;
    usdCents?: number;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    rateVersion: string;
    reason: string;
    requestId?: string;
    idempotencyKey?: string;
    metadata: Record<string, any>;
    createdAt: string;
  }>;
  hasMore: boolean;
  nextCursor?: string;
}> {
  const whereClause: any = {};
  
  if (userId) {
    whereClause.userId = userId;
  }
  
  if (cursor) {
    whereClause.createdAt = { lt: new Date(cursor) };
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: whereClause,
    include: {
      user: {
        select: { email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = entries.length > limit;
  const items = hasMore ? entries.slice(0, -1) : entries;

  return {
    entries: items.map(entry => {
      const amount = createDecimal(entry.amountCredits.toString());
      return {
        id: entry.id,
        userId: entry.userId,
        userEmail: entry.user.email,
        kind: entry.kind,
        amountCredits: formatCreditsForStorage(amount),
        displayAmount: formatCreditsForDisplay(amount),
        usdCents: entry.usdCents || undefined,
        model: entry.model || undefined,
        inputTokens: entry.inputTokens || undefined,
        outputTokens: entry.outputTokens || undefined,
        rateVersion: entry.rateVersion,
        reason: entry.reason,
        requestId: entry.requestId || undefined,
        idempotencyKey: entry.idempotencyKey || undefined,
        metadata: entry.metadata as Record<string, any>,
        createdAt: entry.createdAt.toISOString(),
      };
    }),
    hasMore,
    nextCursor: hasMore ? items[items.length - 1]?.createdAt.toISOString() : undefined,
  };
}

/**
 * Export ledger to CSV format
 */
export async function exportLedgerToCSV(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<string> {
  const whereClause: any = { userId };
  
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = startDate;
    if (endDate) whereClause.createdAt.lte = endDate;
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    // No limit for export - be careful with large datasets
  });

  // CSV headers
  const headers = [
    'timestamp',
    'kind',
    'amountCredits',
    'usdCents',
    'model',
    'inputTokens',
    'outputTokens',
    'requestId',
    'idempotencyKey',
    'rateVersion',
    'reason',
  ].join(',');

  // CSV rows
  const rows = entries.map(entry => [
    entry.createdAt.toISOString(),
    entry.kind,
    entry.amountCredits.toString(),
    entry.usdCents || '',
    entry.model || '',
    entry.inputTokens || '',
    entry.outputTokens || '',
    entry.requestId || '',
    entry.idempotencyKey || '',
    entry.rateVersion,
    `"${entry.reason.replace(/"/g, '""')}"`, // Escape quotes
  ].join(','));

  return [headers, ...rows].join('\n');
}

/**
 * Create admin adjustment (credit or debit)
 */
export async function createAdminAdjustment(
  request: AdminAdjustmentRequest,
  adminUserId: string
): Promise<{
  success: boolean;
  newBalance: string;
  ledgerEntryId: string;
}> {
  const amount = createDecimal(request.amountCredits);
  
  try {
    if (amount.isPositive()) {
      // Credit adjustment
      const { newBalance, ledgerEntryId } = await addCreditsToUser(
        request.userId,
        amount,
        `Admin adjustment: ${request.reason}`,
        {
          adminUserId,
          adjustmentType: 'credit',
        }
      );

      logger.info(
        {
          targetUserId: request.userId,
          adminUserId,
          amount: amount.toString(),
          reason: request.reason,
          newBalance: newBalance.toString(),
        },
        'Admin credit adjustment completed'
      );

      return {
        success: true,
        newBalance: formatCreditsForStorage(newBalance),
        ledgerEntryId,
      };
    } else {
      // Debit adjustment (negative amount)
      const debitAmount = amount.abs();
      const { newBalance, ledgerEntryId } = await deductCreditsFromUser(
        request.userId,
        debitAmount,
        `Admin adjustment: ${request.reason}`,
        {
          adminUserId,
          adjustmentType: 'debit',
        }
      );

      logger.info(
        {
          targetUserId: request.userId,
          adminUserId,
          amount: debitAmount.toString(),
          reason: request.reason,
          newBalance: newBalance.toString(),
        },
        'Admin debit adjustment completed'
      );

      return {
        success: true,
        newBalance: formatCreditsForStorage(newBalance),
        ledgerEntryId,
      };
    }
  } catch (error) {
    logger.error(
      {
        error,
        targetUserId: request.userId,
        adminUserId,
        amount: amount.toString(),
        reason: request.reason,
      },
      'Admin adjustment failed'
    );
    throw error;
  }
}

/**
 * Get ledger summary statistics
 */
export async function getLedgerSummary(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCredits: string;
  totalDebits: string;
  netCredits: string;
  transactionCount: number;
  uniqueUsers: number;
}> {
  const whereClause: any = {};
  
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = startDate;
    if (endDate) whereClause.createdAt.lte = endDate;
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: whereClause,
    select: {
      kind: true,
      amountCredits: true,
      userId: true,
    },
  });

  let totalCredits = createDecimal(0);
  let totalDebits = createDecimal(0);
  const uniqueUsers = new Set<string>();

  for (const entry of entries) {
    const amount = createDecimal(entry.amountCredits.toString());
    uniqueUsers.add(entry.userId);

    if (entry.kind === 'credit') {
      totalCredits = totalCredits.add(amount);
    } else if (entry.kind === 'debit') {
      totalDebits = totalDebits.add(amount);
    }
  }

  const netCredits = totalCredits.minus(totalDebits);

  return {
    totalCredits: formatCreditsForStorage(totalCredits),
    totalDebits: formatCreditsForStorage(totalDebits),
    netCredits: formatCreditsForStorage(netCredits),
    transactionCount: entries.length,
    uniqueUsers: uniqueUsers.size,
  };
}