// API Routes for ScholarLink Billing Service

import express from 'express';
import { z } from 'zod';
import { validateRequest, validateAuth } from '@/middleware/validation';
import { requireAuth, requireAdmin } from '@/middleware/auth';
import * as userService from '@/services/userService';
import * as rateCardService from '@/services/rateCardService';
import * as purchaseService from '@/services/purchaseService';
import * as usageService from '@/services/usageService';
import * as ledgerService from '@/services/ledgerService';
import { CREDIT_PACKAGES } from '@/config';

// Request/Response schemas
const reconcileUsageSchema = z.object({
  userId: z.string(),
  model: z.string(),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  requestId: z.string().optional(),
  idempotencyKey: z.string(),
});

const purchaseSchema = z.object({
  packageCode: z.enum(['starter', 'basic', 'pro', 'business']),
});

const adminAdjustmentSchema = z.object({
  userId: z.string(),
  amountCredits: z.string(), // Decimal string
  reason: z.string().min(1),
});

const rateCardSchema = z.object({
  version: z.string().min(1),
  config: z.object({
    currency: z.string(),
    creditPerDollar: z.number(),
    rounding: z.enum(['precise', 'ceil']),
    models: z.record(z.object({
      inputPer1k: z.number(),
      outputPer1k: z.number(),
    })),
  }),
});

export function setupRoutes(app: express.Application) {
  const router = express.Router();

  // ========================================
  // AUTH ROUTES (stub implementation)
  // ========================================
  
  /**
   * @swagger
   * /api/v1/me:
   *   get:
   *     summary: Get current user profile and balance
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: User profile with credit balance
   */
  router.get('/me', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.sub;
      const user = await userService.getUserWithBalance(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        balanceCredits: user.balanceCredits.toString(),
        displayBalance: userService.formatCreditsForDisplay(user.balanceCredits),
        createdAt: user.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ========================================
  // RATE CARD ROUTES
  // ========================================
  
  /**
   * @swagger
   * /api/v1/billing/rate-card:
   *   get:
   *     summary: Get active rate card
   *     responses:
   *       200:
   *         description: Active rate card configuration
   */
  router.get('/billing/rate-card', async (req, res) => {
    try {
      const rateCard = await rateCardService.getActiveRateCard();
      
      if (!rateCard) {
        return res.status(404).json({ error: 'No active rate card found' });
      }

      res.json({
        version: rateCard.version,
        config: rateCard.config,
        activeFrom: rateCard.activeFrom,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/v1/admin/billing/rate-card:
   *   post:
   *     summary: Create new rate card version (admin only)
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RateCard'
   */
  router.post('/admin/billing/rate-card', 
    requireAuth, 
    requireAdmin, 
    validateRequest(rateCardSchema),
    async (req, res) => {
      try {
        const { version, config } = req.body;
        
        const rateCard = await rateCardService.createRateCard(version, config);
        
        res.status(201).json({
          id: rateCard.id,
          version: rateCard.version,
          config: rateCard.config,
          activeFrom: rateCard.activeFrom,
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          return res.status(409).json({ error: 'Rate card version already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // ========================================
  // PURCHASE ROUTES
  // ========================================
  
  /**
   * @swagger
   * /api/v1/billing/purchase:
   *   post:
   *     summary: Initiate credit purchase
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               packageCode:
   *                 type: string
   *                 enum: [starter, basic, pro, business]
   */
  router.post('/billing/purchase', 
    requireAuth, 
    validateRequest(purchaseSchema),
    async (req, res) => {
      try {
        const userId = req.user!.sub;
        const { packageCode } = req.body;
        
        const packageInfo = CREDIT_PACKAGES.find(p => p.code === packageCode);
        if (!packageInfo) {
          return res.status(400).json({ error: 'Invalid package code' });
        }

        const purchase = await purchaseService.createPendingPurchase(
          userId, 
          packageCode, 
          packageInfo.usdCents, 
          packageInfo.credits
        );

        // TODO: Create actual Stripe payment link
        const paymentLink = `https://checkout.stripe.com/placeholder/${purchase.id}`;
        
        res.status(201).json({
          purchaseId: purchase.id,
          packageCode: purchase.packageCode,
          amount: {
            usd: purchase.usdCents / 100,
            credits: purchase.creditsGranted.toString(),
          },
          paymentLink,
          status: purchase.status,
        });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/webhooks/stripe:
   *   post:
   *     summary: Stripe webhook endpoint
   *     description: Handles payment completion notifications from Stripe
   */
  router.post('/webhooks/stripe', async (req, res) => {
    try {
      // TODO: Implement Stripe webhook signature verification
      const { type, data } = req.body;
      
      if (type === 'checkout.session.completed') {
        // Handle successful payment
        const purchaseId = data.object.client_reference_id;
        if (purchaseId) {
          await purchaseService.completePurchase(purchaseId, data.object.id);
        }
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      res.status(400).json({ error: 'Webhook error' });
    }
  });

  // ========================================
  // USAGE CHARGING ROUTES
  // ========================================
  
  /**
   * @swagger
   * /api/v1/usage/reconcile:
   *   post:
   *     summary: Record and charge for AI model usage
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: string
   *               model:
   *                 type: string
   *               inputTokens:
   *                 type: integer
   *               outputTokens:
   *                 type: integer
   *               requestId:
   *                 type: string
   *               idempotencyKey:
   *                 type: string
   */
  router.post('/usage/reconcile', 
    requireAuth,
    validateRequest(reconcileUsageSchema),
    async (req, res) => {
      try {
        const { userId, model, inputTokens, outputTokens, requestId, idempotencyKey } = req.body;
        
        const result = await usageService.reconcileUsage({
          userId,
          model,
          inputTokens,
          outputTokens,
          requestId,
          idempotencyKey,
        });

        if (result.error) {
          const statusCode = result.error === 'INSUFFICIENT_CREDITS' ? 402 : 400;
          return res.status(statusCode).json({ 
            error: result.error,
            details: result.details 
          });
        }

        res.json({
          success: true,
          ledgerEntryId: result.ledgerEntry!.id,
          newBalance: result.newBalance!.toString(),
          debitAmount: result.debitAmount!.toString(),
        });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // ========================================
  // LEDGER ROUTES
  // ========================================
  
  /**
   * @swagger
   * /api/v1/billing/ledger:
   *   get:
   *     summary: Get user's ledger entries (paginated)
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - name: cursor
   *         in: query
   *         schema:
   *           type: string
   *       - name: limit
   *         in: query
   *         schema:
   *           type: integer
   *           default: 50
   */
  router.get('/billing/ledger', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.sub;
      const cursor = req.query.cursor as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const result = await ledgerService.getUserLedger(userId, { cursor, limit });
      
      res.json({
        entries: result.entries.map(entry => ({
          id: entry.id,
          kind: entry.kind,
          amountCredits: entry.amountCredits.toString(),
          usdCents: entry.usdCents,
          model: entry.model,
          inputTokens: entry.inputTokens,
          outputTokens: entry.outputTokens,
          rateVersion: entry.rateVersion,
          reason: entry.reason,
          requestId: entry.requestId,
          createdAt: entry.createdAt,
        })),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/v1/admin/billing/ledger/{userId}:
   *   get:
   *     summary: Get any user's ledger entries (admin only)
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - name: userId
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   */
  router.get('/admin/billing/ledger/:userId', 
    requireAuth, 
    requireAdmin, 
    async (req, res) => {
      try {
        const { userId } = req.params;
        const cursor = req.query.cursor as string;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

        const result = await ledgerService.getUserLedger(userId, { cursor, limit });
        
        res.json({
          userId,
          entries: result.entries,
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/billing/ledger/export.csv:
   *   get:
   *     summary: Export user's ledger as CSV
   *     security:
   *       - BearerAuth: []
   */
  router.get('/billing/ledger/export.csv', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.sub;
      const csv = await ledgerService.exportUserLedgerCSV(userId);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ledger-export.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ========================================
  // ADMIN ADJUSTMENT ROUTES
  // ========================================
  
  /**
   * @swagger
   * /api/v1/admin/billing/adjust:
   *   post:
   *     summary: Make manual credit adjustment (admin only)
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: string
   *               amountCredits:
   *                 type: string
   *               reason:
   *                 type: string
   */
  router.post('/admin/billing/adjust', 
    requireAuth, 
    requireAdmin,
    validateRequest(adminAdjustmentSchema),
    async (req, res) => {
      try {
        const { userId, amountCredits, reason } = req.body;
        const adminId = req.user!.sub;
        
        const result = await ledgerService.createAdjustment(
          userId, 
          amountCredits, 
          reason,
          adminId
        );

        res.json({
          ledgerEntryId: result.ledgerEntry.id,
          newBalance: result.newBalance.toString(),
          adjustment: result.ledgerEntry.amountCredits.toString(),
        });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // Mount all routes under /api/v1
  app.use('/api/v1', router);
}