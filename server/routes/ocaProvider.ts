import express, { Request, Response } from 'express';
import { env } from '../environment';
import { registerProviderWithBreaker } from '../../staging-v2/one-click-apply/oca_circuit_breaker';

const router = express.Router();

/**
 * POST /api/oca/provider/register
 * Register a provider using the OCA circuit breaker pattern
 * Gated by FEATURE_CIRCUIT_BREAKER_ENABLED
 */
router.post('/provider/register', async (req: Request, res: Response): Promise<void> => {
  // Gate by feature flag
  if (env.FEATURE_CIRCUIT_BREAKER_ENABLED !== 'true') {
    res.status(400).json({
      success: false,
      error: 'Circuit breaker feature is not enabled'
    });
    return;
  }

  try {
    const providerData = req.body;
    
    // Generate idempotency key from request body or create one
    const idempotencyKey = req.headers['x-idempotency-key'] as string || 
                          `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Use circuit breaker to register provider
    const result = await registerProviderWithBreaker(providerData, idempotencyKey);

    res.status(200).json({
      success: result.success,
      queued: result.queued,
      ...(result.providerId && { providerId: result.providerId })
    });
  } catch (error) {
    console.error('❌ Provider registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as ocaProviderRouter };
