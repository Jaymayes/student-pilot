/**
 * ⚠️  TEMPORARY CREDIT API ENDPOINTS ⚠️
 * 
 * EXTRACTION DEADLINE: Sprint ending December 8, 2025 (2 weeks)
 * TARGET: Move to separate scholarship_api Replit project
 * 
 * These endpoints implement the scholarship_api credit ledger contract
 * TEMPORARILY inside student_pilot to unblock revenue readiness.
 * 
 * DO NOT EXTEND OR ENHANCE - This is a time-boxed shim only.
 * All new credit features MUST be added to the standalone scholarship_api service.
 * 
 * Extraction Checklist:
 * 1. Create scholarship_api Replit project
 * 2. Copy these endpoints to scholarship_api/server/routes.ts
 * 3. Migrate credit_ledger and credit_balances tables to scholarship_api database
 * 4. Update student_pilot to call scholarship_api via SCHOLARSHIP_API_BASE_URL
 * 5. Remove this file entirely
 * 6. Update Stripe webhook in student_pilot/server/routes.ts to call scholarship_api
 */

import type { Express } from 'express';
import { db } from '../db';
import { creditLedger, creditBalances, users } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

// Idempotency key status enum (matches scholarship_api spec)
const IdempotencyStatus = {
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const;

// Simple in-memory idempotency store (NOTE: Redis recommended for production multi-instance)
interface IdempotencyRecord {
  key: string;
  status: typeof IdempotencyStatus[keyof typeof IdempotencyStatus];
  requestHash: string;
  response?: any;
  createdAt: Date;
  completedAt?: Date;
}

const idempotencyStore = new Map<string, IdempotencyRecord>();

// Clean up old idempotency keys (>24 hours)
setInterval(() => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  Array.from(idempotencyStore.entries()).forEach(([key, record]) => {
    if (record.createdAt < cutoff) {
      idempotencyStore.delete(key);
    }
  });
}, 60 * 60 * 1000); // Every hour

// Request schemas (match scholarship_api contract)
const CreditRequestSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().positive(),
  provider: z.enum(['stripe', 'admin', 'system', 'promo']),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  description: z.string().optional()
});

const DebitRequestSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().positive(),
  operation: z.string(),
  referenceId: z.string().optional(),
  description: z.string().optional()
});

export function registerTemporaryCreditEndpoints(app: Express) {
  console.log('⚠️  Registering TEMPORARY credit API endpoints (extract by Dec 8, 2025)');

  /**
   * POST /api/v1/credits/credit
   * Grant credits to a user (idempotent)
   * RBAC: system, admin, provider roles only
   */
  app.post('/api/v1/credits/credit', async (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    if (!idempotencyKey) {
      return res.status(400).json({
        error: {
          code: 'MISSING_IDEMPOTENCY_KEY',
          message: 'Header Idempotency-Key is required',
          request_id: crypto.randomUUID()
        }
      });
    }

    // Check idempotency
    const existing = idempotencyStore.get(idempotencyKey);
    if (existing) {
      if (existing.status === 'COMPLETED') {
        // Return cached response
        return res.json(existing.response);
      } else if (existing.status === 'PROCESSING') {
        // Request in progress, ask to retry later
        return res.status(409).json({
          error: {
            code: 'IDEMPOTENCY_KEY_IN_USE',
            message: 'Request with this idempotency key is currently processing',
            request_id: crypto.randomUUID()
          }
        });
      }
    }

    // Validate request
    const validation = CreditRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: validation.error.message,
          request_id: crypto.randomUUID()
        }
      });
    }

    const { userId, amount, provider, referenceType, referenceId, description } = validation.data;
    const requestHash = crypto.createHash('sha256').update(JSON.stringify(validation.data)).digest('hex');

    // Claim idempotency key
    idempotencyStore.set(idempotencyKey, {
      key: idempotencyKey,
      status: 'PROCESSING',
      requestHash,
      createdAt: new Date()
    });

    try {
      // Single transaction with SELECT FOR UPDATE
      const result = await db.transaction(async (tx) => {
        // 1. Lock user's balance row (or create if doesn't exist)
        let [balance] = await tx
          .select()
          .from(creditBalances)
          .where(eq(creditBalances.userId, userId))
          .for('update');

        if (!balance) {
          // Create initial balance record
          [balance] = await tx
            .insert(creditBalances)
            .values({
              userId,
              balanceMillicredits: BigInt(0),
              updatedAt: new Date()
            })
            .returning();
        }

        // 2. Calculate new balance
        const amountMillicredits = BigInt(amount) * BigInt(1000); // credits to millicredits
        const currentBalance = balance.balanceMillicredits ?? BigInt(0);
        const newBalance = currentBalance + amountMillicredits;

        // 3. Map provider to referenceType enum ("stripe", "admin", "system")
        const refType = (provider === 'stripe' || provider === 'admin' || provider === 'system') 
          ? provider 
          : 'system';

        // 4. Insert ledger entry with balance snapshot (use "purchase" type for credits)
        const [ledgerEntry] = await tx
          .insert(creditLedger)
          .values({
            userId,
            amountMillicredits,
            type: 'purchase',
            referenceType: refType as 'stripe' | 'admin' | 'system',
            referenceId: referenceId || idempotencyKey,
            metadata: { 
              provider, 
              description: description || `Credit grant via ${provider}`,
              originalReferenceType: referenceType
            },
            balanceAfterMillicredits: newBalance,
            createdAt: new Date()
          })
          .returning();

        // 4. Update balance
        await tx
          .update(creditBalances)
          .set({
            balanceMillicredits: newBalance,
            updatedAt: new Date()
          })
          .where(eq(creditBalances.userId, userId));

        return {
          success: true,
          userId,
          amountCredits: amount,
          newBalanceCredits: Number(newBalance) / 1000,
          ledgerEntryId: ledgerEntry.id,
          provider
        };
      });

      // Mark idempotency key as completed
      idempotencyStore.set(idempotencyKey, {
        key: idempotencyKey,
        status: 'COMPLETED',
        requestHash,
        response: result,
        createdAt: idempotencyStore.get(idempotencyKey)!.createdAt,
        completedAt: new Date()
      });

      res.json(result);
    } catch (error) {
      // Mark as failed
      idempotencyStore.set(idempotencyKey, {
        key: idempotencyKey,
        status: 'FAILED',
        requestHash,
        createdAt: idempotencyStore.get(idempotencyKey)!.createdAt
      });

      console.error('Credit grant failed:', error);
      res.status(500).json({
        error: {
          code: 'CREDIT_GRANT_FAILED',
          message: 'Failed to grant credits',
          request_id: crypto.randomUUID()
        }
      });
    }
  });

  /**
   * POST /api/v1/credits/debit
   * Debit credits from a user (idempotent, fail-closed on overdraft)
   * RBAC: system, admin, sage roles
   */
  app.post('/api/v1/credits/debit', async (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    if (!idempotencyKey) {
      return res.status(400).json({
        error: {
          code: 'MISSING_IDEMPOTENCY_KEY',
          message: 'Header Idempotency-Key is required',
          request_id: crypto.randomUUID()
        }
      });
    }

    // Check idempotency
    const existing = idempotencyStore.get(idempotencyKey);
    if (existing) {
      if (existing.status === 'COMPLETED') {
        return res.json(existing.response);
      } else if (existing.status === 'PROCESSING') {
        return res.status(409).json({
          error: {
            code: 'IDEMPOTENCY_KEY_IN_USE',
            message: 'Request with this idempotency key is currently processing',
            request_id: crypto.randomUUID()
          }
        });
      }
    }

    // Validate request
    const validation = DebitRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: validation.error.message,
          request_id: crypto.randomUUID()
        }
      });
    }

    const { userId, amount, operation, referenceId, description } = validation.data;
    const requestHash = crypto.createHash('sha256').update(JSON.stringify(validation.data)).digest('hex');

    // Claim idempotency key
    idempotencyStore.set(idempotencyKey, {
      key: idempotencyKey,
      status: 'PROCESSING',
      requestHash,
      createdAt: new Date()
    });

    try {
      // Single transaction with SELECT FOR UPDATE and overdraft validation
      const result = await db.transaction(async (tx) => {
        // 1. Lock user's balance row
        const [balance] = await tx
          .select()
          .from(creditBalances)
          .where(eq(creditBalances.userId, userId))
          .for('update');

        if (!balance) {
          throw new Error('USER_NOT_FOUND');
        }

        // 2. Validate no overdraft BEFORE mutation
        const amountMillicredits = BigInt(amount) * BigInt(1000);
        const currentBalance = balance.balanceMillicredits ?? BigInt(0);
        if (currentBalance < amountMillicredits) {
          throw new Error('INSUFFICIENT_CREDITS');
        }

        // 3. Calculate new balance
        const newBalance = currentBalance - amountMillicredits;

        // 4. Insert ledger entry (use "deduction" type for debits)
        const [ledgerEntry] = await tx
          .insert(creditLedger)
          .values({
            userId,
            amountMillicredits: -amountMillicredits,
            type: 'deduction',
            referenceType: 'system',
            referenceId: referenceId || idempotencyKey,
            metadata: { 
              operation,
              description: description || `Debit for ${operation}`
            },
            balanceAfterMillicredits: newBalance,
            createdAt: new Date()
          })
          .returning();

        // 5. Update balance
        await tx
          .update(creditBalances)
          .set({
            balanceMillicredits: newBalance,
            updatedAt: new Date()
          })
          .where(eq(creditBalances.userId, userId));

        return {
          success: true,
          userId,
          amountCredits: amount,
          newBalanceCredits: Number(newBalance) / 1000,
          ledgerEntryId: ledgerEntry.id
        };
      });

      // Mark completed
      idempotencyStore.set(idempotencyKey, {
        key: idempotencyKey,
        status: 'COMPLETED',
        requestHash,
        response: result,
        createdAt: idempotencyStore.get(idempotencyKey)!.createdAt,
        completedAt: new Date()
      });

      res.json(result);
    } catch (error: any) {
      idempotencyStore.delete(idempotencyKey); // Allow retry on error

      if (error.message === 'INSUFFICIENT_CREDITS') {
        return res.status(409).json({
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: 'User does not have enough credits for this operation',
            request_id: crypto.randomUUID()
          }
        });
      }

      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            request_id: crypto.randomUUID()
          }
        });
      }

      console.error('Debit failed:', error);
      res.status(500).json({
        error: {
          code: 'DEBIT_FAILED',
          message: 'Failed to debit credits',
          request_id: crypto.randomUUID()
        }
      });
    }
  });

  /**
   * GET /api/v1/credits/balance
   * Get user's current credit balance
   */
  app.get('/api/v1/credits/balance', async (req, res) => {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_USER_ID',
          message: 'Query parameter userId is required',
          request_id: crypto.randomUUID()
        }
      });
    }

    try {
      const [balance] = await db
        .select()
        .from(creditBalances)
        .where(eq(creditBalances.userId, userId));

      if (!balance) {
        return res.json({
          userId,
          balanceCredits: 0,
          balanceMillicredits: 0
        });
      }

      const balanceMillicredits = balance.balanceMillicredits ?? BigInt(0);
      res.json({
        userId: balance.userId,
        balanceCredits: Number(balanceMillicredits) / 1000,
        balanceMillicredits: balanceMillicredits.toString(),
        lastUpdated: balance.updatedAt
      });
    } catch (error) {
      console.error('Balance fetch failed:', error);
      res.status(500).json({
        error: {
          code: 'BALANCE_FETCH_FAILED',
          message: 'Failed to fetch balance',
          request_id: crypto.randomUUID()
        }
      });
    }
  });

  console.log('✅ Temporary credit API registered: /api/v1/credits/{credit,debit,balance}');
  console.log('⚠️  REMINDER: Extract to scholarship_api by Dec 8, 2025');
}
