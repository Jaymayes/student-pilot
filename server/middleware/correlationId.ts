import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware to ensure all API responses include a standardized X-Correlation-ID header
 * for request tracing and observability.
 * 
 * Behavior:
 * - If X-Correlation-ID header is present in request, validate and use it
 * - If missing, generate a new UUIDv4
 * - Set the correlation ID on both request object and response header
 * - Include in structured logs for traceability
 * 
 * Security considerations:
 * - Validates header length (<128 chars)
 * - Ensures ASCII charset only
 * - Prevents header spoofing/abuse
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  let correlationId = req.headers['x-correlation-id'] as string;

  // Validate existing correlation ID or generate new one
  if (correlationId) {
    // Security validation: length, charset, format
    if (typeof correlationId !== 'string' || 
        correlationId.length > 128 || 
        !/^[a-zA-Z0-9\-_.]+$/.test(correlationId)) {
      // Invalid correlation ID - generate new one
      correlationId = randomUUID();
      console.warn(`Invalid X-Correlation-ID received: ${req.headers['x-correlation-id']}, generated new: ${correlationId}`);
    }
  } else {
    // Generate new correlation ID
    correlationId = randomUUID();
  }

  // Attach to request for downstream use
  (req as any).correlationId = correlationId;

  // Set response header immediately to ensure it's present even if request fails
  res.setHeader('X-Correlation-ID', correlationId);

  // Continue to next middleware
  next();
}

/**
 * Enhanced error handler that includes correlation ID in error responses
 * and structured logging. Replaces inline error handling with centralized approach.
 */
export function correlationErrorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  const correlationId = (req as any).correlationId || randomUUID();
  
  // Ensure correlation ID is in response even for errors
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Structured logging with correlation ID
  console.error(`[${correlationId}] ${req.method} ${req.path} - Error:`, {
    correlationId,
    method: req.method,
    path: req.path,
    userId: (req.user as any)?.claims?.sub,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
  
  // Generic error messages for production (security hardening)
  if (process.env.NODE_ENV === 'production') {
    if (error.name === 'AuthError' || error.status === 401) {
      return res.status(401).json({ 
        message: "Authentication failed", 
        correlationId 
      });
    }
    if (error.name === 'ZodError' || error.status === 400) {
      return res.status(400).json({ 
        message: "Invalid input data", 
        correlationId 
      });
    }
    return res.status(500).json({ 
      message: "Internal server error", 
      correlationId 
    });
  } else {
    // Development mode - include more details
    return res.status(error.status || 500).json({
      message: error.message,
      correlationId,
      ...(error.details && { details: error.details })
    });
  }
}

/**
 * Middleware specifically for billing endpoints to ensure consistent
 * correlation ID behavior and enhanced logging for financial operations.
 */
export function billingCorrelationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Apply standard correlation ID middleware
  correlationIdMiddleware(req, res, () => {
    const correlationId = (req as any).correlationId;
    
    // Enhanced logging for billing operations
    console.info(`[${correlationId}] Billing Request:`, {
      correlationId,
      method: req.method,
      path: req.path,
      userId: (req.user as any)?.claims?.sub,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    next();
  });
}