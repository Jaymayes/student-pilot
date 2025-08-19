// User service for managing user accounts and balances

import { Decimal } from 'decimal.js';
import { prisma, withTransaction } from './database';
import { User, UserProfileResponse, JWTPayload } from '@/types';
import { 
  createDecimal, 
  formatCreditsForDisplay, 
  formatCreditsForStorage,
  applyRounding
} from '@/utils/decimal';
import pino from 'pino';

const logger = pino({ name: 'user-service' });

/**
 * Get or create user from JWT payload
 */
export async function getOrCreateUser(jwtPayload: JWTPayload): Promise<User> {
  try {
    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { id: jwtPayload.sub },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          id: jwtPayload.sub,
          email: jwtPayload.email,
          role: jwtPayload.role,
          balanceCredits: new Decimal(0),
        },
      });

      logger.info(
        { userId: user.id, email: user.email }, 
        'Created new user account'
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
      balanceCredits: new Decimal(user.balanceCredits.toString()),
      createdAt: user.createdAt,
    };
  } catch (error) {
    logger.error({ error, userId: jwtPayload.sub }, 'Failed to get or create user');
    throw error;
  }
}

/**
 * Get user profile response
 */
export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const balanceCredits = createDecimal(user.balanceCredits.toString());

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    balanceCredits: formatCreditsForStorage(balanceCredits),
    displayBalance: formatCreditsForDisplay(applyRounding(balanceCredits)),
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Get user balance
 */
export async function getUserBalance(userId: string): Promise<Decimal> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balanceCredits: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return createDecimal(user.balanceCredits.toString());
}

/**
 * Update user balance (within transaction)
 */
export async function updateUserBalance(
  userId: string,
  newBalance: Decimal,
  tx?: any
): Promise<void> {
  const client = tx || prisma;
  
  await client.user.update({
    where: { id: userId },
    data: { 
      balanceCredits: newBalance.toString(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Get user with balance for update (locks row for transaction)
 */
export async function getUserForUpdate(
  userId: string,
  tx: any
): Promise<{ id: string; balanceCredits: Decimal }> {
  // Use raw query for SELECT FOR UPDATE
  const users = await tx.$queryRaw`
    SELECT id, balanceCredits 
    FROM users 
    WHERE id = ${userId}
    FOR UPDATE
  `;

  if (!users || users.length === 0) {
    throw new Error('User not found');
  }

  const user = users[0];
  return {
    id: user.id,
    balanceCredits: createDecimal(user.balanceCredits.toString()),
  };
}

/**
 * Check if user has sufficient balance
 */
export async function checkSufficientBalance(
  userId: string,
  requiredAmount: Decimal
): Promise<{ sufficient: boolean; current: Decimal; shortfall?: Decimal }> {
  const currentBalance = await getUserBalance(userId);
  
  if (currentBalance.gte(requiredAmount)) {
    return {
      sufficient: true,
      current: currentBalance,
    };
  }

  return {
    sufficient: false,
    current: currentBalance,
    shortfall: requiredAmount.minus(currentBalance),
  };
}

/**
 * Add credits to user balance (for purchases)
 */
export async function addCreditsToUser(
  userId: string,
  creditsToAdd: Decimal,
  reason: string,
  metadata: Record<string, any> = {}
): Promise<{ newBalance: Decimal; ledgerEntryId: string }> {
  return await withTransaction(async (tx) => {
    // Get current user with lock
    const userForUpdate = await getUserForUpdate(userId, tx);
    
    // Calculate new balance
    const newBalance = userForUpdate.balanceCredits.add(creditsToAdd);
    
    // Update user balance
    await updateUserBalance(userId, newBalance, tx);
    
    // Create ledger entry
    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        userId,
        kind: 'credit',
        amountCredits: creditsToAdd.toString(),
        rateVersion: 'system',
        reason,
        metadata,
        createdAt: new Date(),
      },
    });

    logger.info(
      { 
        userId, 
        creditsAdded: creditsToAdd.toString(), 
        newBalance: newBalance.toString(),
        reason 
      },
      'Credits added to user account'
    );

    return {
      newBalance,
      ledgerEntryId: ledgerEntry.id,
    };
  });
}

/**
 * Deduct credits from user balance (for usage)
 */
export async function deductCreditsFromUser(
  userId: string,
  creditsToDeduct: Decimal,
  reason: string,
  metadata: Record<string, any> = {}
): Promise<{ newBalance: Decimal; ledgerEntryId: string }> {
  return await withTransaction(async (tx) => {
    // Get current user with lock
    const userForUpdate = await getUserForUpdate(userId, tx);
    
    // Check sufficient balance
    if (userForUpdate.balanceCredits.lt(creditsToDeduct)) {
      throw new Error('Insufficient credits');
    }
    
    // Calculate new balance
    const newBalance = userForUpdate.balanceCredits.minus(creditsToDeduct);
    
    // Update user balance
    await updateUserBalance(userId, newBalance, tx);
    
    // Create ledger entry
    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        userId,
        kind: 'debit',
        amountCredits: creditsToDeduct.toString(),
        rateVersion: 'system',
        reason,
        metadata,
        createdAt: new Date(),
      },
    });

    logger.info(
      { 
        userId, 
        creditsDeducted: creditsToDeduct.toString(), 
        newBalance: newBalance.toString(),
        reason 
      },
      'Credits deducted from user account'
    );

    return {
      newBalance,
      ledgerEntryId: ledgerEntry.id,
    };
  });
}