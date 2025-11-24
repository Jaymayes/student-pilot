/**
 * Global Identity Standard Middleware
 * Enforces system identity across all API responses per AGENT3 requirements
 */

import { Request, Response, NextFunction } from 'express';

export const APP_NAME = process.env.APP_NAME || 'student_pilot';
export const APP_BASE_URL = process.env.APP_BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app';

/**
 * Global Identity Header Middleware
 * Adds X-System-Identity and X-Base-URL headers to all responses
 * Prevents cross-app identity bleed
 */
export function globalIdentityMiddleware(req: Request, res: Response, next: NextFunction) {
  // Add Global Identity Standard headers to all responses
  res.set('X-System-Identity', APP_NAME);
  res.set('X-Base-URL', APP_BASE_URL);
  
  next();
}

/**
 * Get Global Identity Standard object for inclusion in API responses
 */
export function getGlobalIdentity() {
  return {
    system_identity: APP_NAME,
    base_url: APP_BASE_URL,
  };
}

/**
 * Format log message with Global Identity Standard header
 */
export function formatLogWithIdentity(message: string): string {
  return `[System Identity: ${APP_NAME}] [Base URL: ${APP_BASE_URL}] ${message}`;
}
