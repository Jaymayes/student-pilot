/**
 * WAF Middleware - SEV-1 Emergency Fix
 * 
 * Preserves x-forwarded-host for trusted ingress while maintaining security
 */

import { Request, Response, NextFunction } from 'express';
import { WAF_CONFIG, shouldPreserveXForwardedHost, isAllowedHost, sanitizeUnderscoreKeys } from '../config/wafConfig';

export function wafMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientIp = req.ip || req.socket.remoteAddress || '0.0.0.0';
  const xfh = req.headers['x-forwarded-host'] as string | undefined;
  const host = req.headers['host'];
  
  // Decision: preserve or strip x-forwarded-host
  if (WAF_CONFIG.STRIP_X_FORWARDED_HOST && !shouldPreserveXForwardedHost(clientIp, xfh || host)) {
    // Strip the header for untrusted requests
    delete req.headers['x-forwarded-host'];
  }
  
  // Validate host header against allowed suffixes (non-blocking under SEV-1)
  if (!WAF_CONFIG.SEV1_MODE && host && !isAllowedHost(host)) {
    console.warn(`[WAF] Untrusted host header: ${host} from ${clientIp}`);
    // In strict mode, would 403 here
  }
  
  // Add trace headers if missing (SEV-1 bypass mode)
  if (WAF_CONFIG.SEV1_BYPASS_HEADER_VALIDATION) {
    if (!req.headers['x-trace-id']) {
      req.headers['x-trace-id'] = `auto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    if (!req.headers['x-idempotency-key']) {
      req.headers['x-idempotency-key'] = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  }
  
  next();
}

/**
 * Telemetry body sanitizer - removes underscore keys without 4xx
 */
export function telemetrySanitizer(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    req.body = sanitizeUnderscoreKeys(req.body as Record<string, unknown>);
  }
  next();
}
