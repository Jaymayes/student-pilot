// Manual integration test for billing correlation ID
// Run with: tsx server/tests/billing-integration.test.ts
import express from 'express';
import { correlationIdMiddleware, billingCorrelationMiddleware } from '../middleware/correlationId';

// Mock authentication middleware
const mockIsAuthenticated = (req: any, res: any, next: any) => {
  req.user = { claims: { sub: 'test-user-123', email: 'test@example.com' } };
  next();
};

// Mock billing service
const mockBillingService = {
  getUserBillingSummary: vi.fn().mockResolvedValue({
    currentBalance: 1000,
    lifetimeSpent: 500
  }),
  getUserLedger: vi.fn().mockResolvedValue({
    entries: [],
    hasMore: false
  }),
  getUserUsage: vi.fn().mockResolvedValue({
    entries: [],
    hasMore: false
  }),
  estimateCharge: vi.fn().mockResolvedValue({
    estimatedCredits: 10,
    model: 'gpt-4o'
  })
};

describe('Billing Endpoints Correlation ID Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(correlationIdMiddleware);

    // Mock billing routes with correlation middleware
    app.get('/api/billing/summary', billingCorrelationMiddleware, mockIsAuthenticated, async (req, res) => {
      try {
        const summary = await mockBillingService.getUserBillingSummary('test-user-123');
        res.json(summary);
      } catch (error) {
        const correlationId = (req as any).correlationId;
        res.status(500).json({ 
          error: 'Failed to fetch billing summary',
          correlationId 
        });
      }
    });

    app.get('/api/billing/ledger', billingCorrelationMiddleware, mockIsAuthenticated, async (req, res) => {
      try {
        const result = await mockBillingService.getUserLedger('test-user-123', 20);
        res.json(result);
      } catch (error) {
        const correlationId = (req as any).correlationId;
        res.status(500).json({ 
          error: 'Failed to fetch transaction history',
          correlationId 
        });
      }
    });

    app.post('/api/billing/estimate', billingCorrelationMiddleware, mockIsAuthenticated, async (req, res) => {
      try {
        const { model, inputTokens, outputTokens } = req.body;
        if (!model || typeof inputTokens !== 'number' || typeof outputTokens !== 'number') {
          return res.status(400).json({ 
            error: 'Missing or invalid parameters: model, inputTokens, outputTokens required',
            correlationId: (req as any).correlationId
          });
        }
        const estimate = await mockBillingService.estimateCharge(model, inputTokens, outputTokens);
        res.json(estimate);
      } catch (error) {
        const correlationId = (req as any).correlationId;
        res.status(500).json({ 
          error: 'Failed to estimate cost',
          correlationId 
        });
      }
    });

    // Mock webhook endpoint
    app.post('/api/billing/stripe-webhook', billingCorrelationMiddleware, express.raw({ type: 'application/json' }), async (req, res) => {
      const correlationId = (req as any).correlationId;
      
      // Simulate webhook processing
      try {
        // Mock successful webhook processing
        res.json({ received: true, correlationId });
      } catch (error) {
        res.status(500).json({ 
          error: 'Webhook processing failed',
          correlationId 
        });
      }
    });
  });

  describe('GET /api/billing/summary', () => {
    it('should include X-Correlation-ID header in response', async () => {
      const response = await request(app)
        .get('/api/billing/summary')
        .expect(200);

      expect(response.headers['x-correlation-id']).toMatch(/^[a-f0-9-]+$/);
      expect(response.body).toEqual({
        currentBalance: 1000,
        lifetimeSpent: 500
      });
    });

    it('should use provided correlation ID', async () => {
      const testCorrelationId = 'test-correlation-12345';
      
      const response = await request(app)
        .get('/api/billing/summary')
        .set('X-Correlation-ID', testCorrelationId)
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe(testCorrelationId);
    });

    it('should include correlation ID in error responses', async () => {
      mockBillingService.getUserBillingSummary.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/billing/summary')
        .expect(500);

      expect(response.headers['x-correlation-id']).toBeTruthy();
      expect(response.body.correlationId).toBeTruthy();
      expect(response.body.error).toBe('Failed to fetch billing summary');
    });
  });

  describe('GET /api/billing/ledger', () => {
    it('should maintain correlation ID across request', async () => {
      const testCorrelationId = 'ledger-test-uuid';
      
      const response = await request(app)
        .get('/api/billing/ledger')
        .set('X-Correlation-ID', testCorrelationId)
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe(testCorrelationId);
      expect(mockBillingService.getUserLedger).toHaveBeenCalled();
    });

    it('should handle query parameters with correlation tracking', async () => {
      const response = await request(app)
        .get('/api/billing/ledger?limit=10&cursor=abc123')
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeTruthy();
    });
  });

  describe('POST /api/billing/estimate', () => {
    it('should validate input and include correlation ID', async () => {
      const response = await request(app)
        .post('/api/billing/estimate')
        .send({ model: 'gpt-4o', inputTokens: 100, outputTokens: 50 })
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeTruthy();
      expect(response.body).toEqual({
        estimatedCredits: 10,
        model: 'gpt-4o'
      });
    });

    it('should return validation error with correlation ID', async () => {
      const response = await request(app)
        .post('/api/billing/estimate')
        .send({ model: 'gpt-4o' }) // Missing required fields
        .expect(400);

      expect(response.headers['x-correlation-id']).toBeTruthy();
      expect(response.body.correlationId).toBeTruthy();
      expect(response.body.error).toContain('Missing or invalid parameters');
    });
  });

  describe('POST /api/billing/stripe-webhook', () => {
    it('should handle webhook with correlation ID', async () => {
      const response = await request(app)
        .post('/api/billing/stripe-webhook')
        .send({ type: 'checkout.session.completed' })
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeTruthy();
      expect(response.body.received).toBe(true);
      expect(response.body.correlationId).toBeTruthy();
    });

    it('should maintain correlation ID through raw body parsing', async () => {
      const testCorrelationId = 'webhook-test-uuid';
      
      const response = await request(app)
        .post('/api/billing/stripe-webhook')
        .set('X-Correlation-ID', testCorrelationId)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ type: 'test.event' }))
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe(testCorrelationId);
    });
  });

  describe('Correlation ID Consistency', () => {
    it('should maintain same correlation ID across multiple endpoints', async () => {
      const testCorrelationId = 'consistency-test-uuid';
      
      // First request
      const response1 = await request(app)
        .get('/api/billing/summary')
        .set('X-Correlation-ID', testCorrelationId)
        .expect(200);

      // Second request with same correlation ID
      const response2 = await request(app)
        .get('/api/billing/ledger')
        .set('X-Correlation-ID', testCorrelationId)
        .expect(200);

      expect(response1.headers['x-correlation-id']).toBe(testCorrelationId);
      expect(response2.headers['x-correlation-id']).toBe(testCorrelationId);
    });

    it('should generate unique correlation IDs for different requests', async () => {
      const response1 = await request(app)
        .get('/api/billing/summary')
        .expect(200);

      const response2 = await request(app)
        .get('/api/billing/ledger')
        .expect(200);

      expect(response1.headers['x-correlation-id']).toBeTruthy();
      expect(response2.headers['x-correlation-id']).toBeTruthy();
      expect(response1.headers['x-correlation-id']).not.toBe(response2.headers['x-correlation-id']);
    });
  });

  describe('Header Security', () => {
    it('should reject malicious correlation IDs', async () => {
      const maliciousId = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .get('/api/billing/summary')
        .set('X-Correlation-ID', maliciousId)
        .expect(200);

      // Should generate new ID instead of using malicious one
      expect(response.headers['x-correlation-id']).not.toBe(maliciousId);
      expect(response.headers['x-correlation-id']).toMatch(/^[a-f0-9-]+$/);
    });

    it('should handle oversized correlation IDs', async () => {
      const oversizedId = 'a'.repeat(200); // Over 128 char limit
      
      const response = await request(app)
        .get('/api/billing/summary')
        .set('X-Correlation-ID', oversizedId)
        .expect(200);

      expect(response.headers['x-correlation-id']).not.toBe(oversizedId);
      expect(response.headers['x-correlation-id'].length).toBeLessThan(128);
    });
  });
});