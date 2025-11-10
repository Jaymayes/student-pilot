/**
 * Admin Metrics Endpoint - CEO Option B Evidence Collection
 * 
 * Exposes production metrics for T+24/T+48 evidence generation.
 * Protected by shared secret authentication.
 */

import { Router, type Request, Response } from 'express';
import { productionMetrics } from '../monitoring/productionMetrics';
import { secureLogger } from '../logging/secureLogger';

export const adminMetricsRouter = Router();

/**
 * Middleware to authenticate admin requests using shared secret
 */
function authenticateAdmin(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  const sharedSecret = process.env.SHARED_SECRET;
  
  if (!sharedSecret) {
    secureLogger.error('SHARED_SECRET not configured for admin endpoints', new Error('MISSING_SECRET'));
    return res.status(500).json({
      error: {
        code: 'SERVER_CONFIG_ERROR',
        message: 'Admin authentication not configured',
        request_id: (req as any).correlationId
      }
    });
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
        request_id: (req as any).correlationId
      }
    });
  }
  
  const token = authHeader.substring(7);
  
  if (token !== sharedSecret) {
    secureLogger.warn('Invalid admin authentication attempt', {
      correlationId: (req as any).correlationId,
      path: req.path
    });
    
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid authentication credentials',
        request_id: (req as any).correlationId
      }
    });
  }
  
  next();
}

/**
 * GET /api/admin/metrics
 * 
 * Returns comprehensive production metrics snapshot for evidence generation.
 * Requires Bearer token authentication with SHARED_SECRET.
 */
adminMetricsRouter.get('/metrics', authenticateAdmin, (req: Request, res: Response) => {
  try {
    const snapshot = productionMetrics.getMetricsSnapshot();
    
    secureLogger.info('Admin metrics snapshot requested', {
      correlationId: (req as any).correlationId,
      sampleCount: snapshot.latency.overall.count
    });
    
    res.json({
      success: true,
      data: snapshot,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    secureLogger.error('Failed to generate metrics snapshot', error as Error, {
      correlationId: (req as any).correlationId
    });
    
    res.status(500).json({
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to retrieve metrics',
        request_id: (req as any).correlationId
      }
    });
  }
});

/**
 * GET /api/admin/metrics/histogram
 * 
 * Returns latency histogram for charting.
 */
adminMetricsRouter.get('/metrics/histogram', authenticateAdmin, (req: Request, res: Response) => {
  try {
    const bucketSize = parseInt(req.query.bucketSize as string) || 10;
    const histogram = productionMetrics.getLatencyHistogram(bucketSize);
    
    res.json({
      success: true,
      data: {
        histogram,
        bucketSize
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    secureLogger.error('Failed to generate histogram', error as Error, {
      correlationId: (req as any).correlationId
    });
    
    res.status(500).json({
      error: {
        code: 'HISTOGRAM_ERROR',
        message: 'Failed to generate histogram',
        request_id: (req as any).correlationId
      }
    });
  }
});

/**
 * GET /api/admin/metrics/slow-endpoints
 * 
 * Returns slowest endpoints for optimization.
 */
adminMetricsRouter.get('/metrics/slow-endpoints', authenticateAdmin, (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const slowEndpoints = productionMetrics.getSlowEndpoints(limit);
    
    res.json({
      success: true,
      data: slowEndpoints,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    secureLogger.error('Failed to get slow endpoints', error as Error, {
      correlationId: (req as any).correlationId
    });
    
    res.status(500).json({
      error: {
        code: 'SLOW_ENDPOINTS_ERROR',
        message: 'Failed to retrieve slow endpoints',
        request_id: (req as any).correlationId
      }
    });
  }
});

/**
 * POST /api/admin/metrics/reset
 * 
 * Resets all metrics (for testing or new monitoring period).
 * Use with caution - this clears all collected data.
 */
adminMetricsRouter.post('/metrics/reset', authenticateAdmin, (req: Request, res: Response) => {
  try {
    productionMetrics.reset();
    
    secureLogger.info('Production metrics reset by admin', {
      correlationId: (req as any).correlationId
    });
    
    res.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    secureLogger.error('Failed to reset metrics', error as Error, {
      correlationId: (req as any).correlationId
    });
    
    res.status(500).json({
      error: {
        code: 'RESET_ERROR',
        message: 'Failed to reset metrics',
        request_id: (req as any).correlationId
      }
    });
  }
});
