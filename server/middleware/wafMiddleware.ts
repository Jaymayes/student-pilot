/**
 * WAF Middleware - SEV-1 Emergency Fix + Trust-by-Secret S2S Bypass
 * 
 * Features:
 * - Preserves x-forwarded-host for trusted ingress
 * - Trust-by-Secret bypass for authenticated S2S telemetry (no SQLi inspection)
 * - Strong SQLi detection for untrusted requests
 * - Prototype pollution protection
 */

import { Request, Response, NextFunction } from 'express';
import { 
  WAF_CONFIG, 
  shouldPreserveXForwardedHost, 
  isAllowedHost, 
  sanitizeUnderscoreKeys,
  shouldBypassSqliInspection,
  detectSqli
} from '../config/wafConfig';

export function wafMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientIp = req.ip || req.socket.remoteAddress || '0.0.0.0';
  const xfh = req.headers['x-forwarded-host'] as string | undefined;
  const host = req.headers['host'];
  const path = req.path || req.url?.split('?')[0] || '/';
  
  // Decision: preserve or strip x-forwarded-host
  if (WAF_CONFIG.STRIP_X_FORWARDED_HOST && !shouldPreserveXForwardedHost(clientIp, xfh || host)) {
    delete req.headers['x-forwarded-host'];
  }
  
  // Validate host header against allowed suffixes (non-blocking under SEV-1)
  if (!WAF_CONFIG.SEV1_MODE && host && !isAllowedHost(host)) {
    console.warn(`[WAF] Untrusted host header: ${host} from ${clientIp}`);
  }
  
  // Trust-by-Secret check for S2S telemetry
  const bypassResult = shouldBypassSqliInspection(clientIp, path, req.headers as Record<string, string | string[] | undefined>);
  
  if (bypassResult.bypass) {
    // S2S authenticated telemetry - skip SQLi inspection
    console.log(`[WAF] BYPASS S2S: ${path} from ${clientIp} (trust_by_secret)`);
    // Still add trace headers if missing
    ensureTraceHeaders(req);
    return next();
  }
  
  // For non-bypassed requests, perform SQLi inspection on body
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    const sqliResult = detectSqli(bodyStr);
    
    if (sqliResult.detected) {
      console.warn(`[WAF] BLOCK: SQLi detected in ${path} from ${clientIp} - pattern: ${sqliResult.pattern}`);
      res.status(403).json({ 
        error: 'Forbidden', 
        reason: 'WAF_SQLI_DETECTED',
        requestId: req.headers['x-trace-id'] || 'unknown'
      });
      return;
    }
  }
  
  // Add trace headers if missing (SEV-1 bypass mode)
  ensureTraceHeaders(req);
  
  next();
}

/**
 * Ensure trace headers exist for request correlation
 */
function ensureTraceHeaders(req: Request): void {
  if (WAF_CONFIG.SEV1_BYPASS_HEADER_VALIDATION) {
    if (!req.headers['x-trace-id']) {
      req.headers['x-trace-id'] = `auto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    if (!req.headers['x-idempotency-key']) {
      req.headers['x-idempotency-key'] = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  }
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
