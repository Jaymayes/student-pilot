/**
 * CSRF Protection Middleware - RT-018 Implementation
 * 
 * Implements CSRF token protection for all state-changing requests
 * as required by the executive security directive.
 */

import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { secureLogger } from '../logging/secureLogger';

declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
    }
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Middleware to generate and validate CSRF tokens
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for safe methods
  if (SAFE_METHODS.has(req.method)) {
    // For safe methods, just provide token generation capability
    req.csrfToken = () => {
      if (!req.session) {
        throw new Error('Session required for CSRF token generation');
      }
      if (!(req.session as any).csrfToken) {
        (req.session as any).csrfToken = randomUUID();
      }
      return (req.session as any).csrfToken;
    };
    return next();
  }

  // For state-changing methods (POST, PUT, PATCH, DELETE), validate token
  const sessionToken = req.session ? (req.session as any).csrfToken : null;
  const headerToken = req.headers['x-csrf-token'] || req.headers['csrf-token'];
  const bodyToken = req.body?.csrfToken || req.body?._csrf;

  const providedToken = headerToken || bodyToken;

  // Check if we have both session token and provided token
  if (!sessionToken || !providedToken) {
    secureLogger.warn('CSRF token validation failed - missing tokens', {
      correlationId: (req as any).correlationId,
      method: req.method,
      path: req.path,
      userId: (req.user as any)?.claims?.sub,
      hasSessionToken: !!sessionToken,
      hasProvidedToken: !!providedToken
    });
    
    return res.status(403).json({
      message: 'CSRF token required for this operation',
      correlationId: (req as any).correlationId
    });
  }

  // Validate token
  if (sessionToken !== providedToken) {
    secureLogger.warn('CSRF token validation failed - token mismatch', {
      correlationId: (req as any).correlationId,
      method: req.method,
      path: req.path,
      userId: (req.user as any)?.claims?.sub
    });
    
    return res.status(403).json({
      message: 'Invalid CSRF token',
      correlationId: (req as any).correlationId
    });
  }

  // Token is valid, provide token generation capability for future requests
  req.csrfToken = () => sessionToken;
  
  next();
}

/**
 * Endpoint to get CSRF token for authenticated users
 */
export function getCsrfToken(req: Request, res: Response) {
  if (!req.session) {
    return res.status(400).json({ message: 'Session required' });
  }

  // Generate token if it doesn't exist
  if (!(req.session as any).csrfToken) {
    (req.session as any).csrfToken = randomUUID();
  }

  res.json({
    csrfToken: (req.session as any).csrfToken,
    correlationId: (req as any).correlationId
  });
}

/**
 * Middleware that exempts specific routes from CSRF protection
 * Use with caution and only for legitimate use cases like webhooks
 */
export function exemptFromCsrf(req: Request, res: Response, next: NextFunction) {
  (req as any).csrfExempt = true;
  next();
}

/**
 * Conditional CSRF middleware that respects exemptions
 */
export function conditionalCsrfProtection(req: Request, res: Response, next: NextFunction) {
  if ((req as any).csrfExempt) {
    return next();
  }
  return csrfProtection(req, res, next);
}