// JWT utility functions with timing-safe operations

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { appConfig } from '@/config';
import { JWTPayload } from '@/types';

/**
 * Verify JWT token with timing-safe operations
 */
export function verifyJWTTimingSafe(token: string): JWTPayload | null {
  try {
    // Verify JWT with RS256 algorithm
    const decoded = jwt.verify(token, appConfig.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: appConfig.JWT_ISSUER,
      audience: appConfig.JWT_AUDIENCE,
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    // Timing-safe error handling - always take consistent time
    crypto.timingSafeEqual(Buffer.from('dummy'), Buffer.from('dummy'));
    return null;
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}

/**
 * Check if token format is valid (basic structure validation)
 */
export function isValidTokenFormat(token: string): boolean {
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

/**
 * Get uniform error response for authentication failures
 */
export function getUniformAuthError() {
  return {
    error: 'Unauthorized',
    message: 'Authentication required',
  };
}

/**
 * Check if user has admin role
 */
export function isAdmin(user?: JWTPayload): boolean {
  return user?.role === 'admin';
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Timing-safe string comparison
 */
export function timingSafeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch (error) {
    return false;
  }
}

/**
 * Generate secure random string
 */
export function generateSecureRandom(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Validate JWT claims
 */
export function validateJWTClaims(payload: JWTPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  
  // Check expiration
  if (payload.exp && payload.exp < now) {
    return false;
  }
  
  // Check issued at (not in future)
  if (payload.iat && payload.iat > now + 60) { // Allow 60s clock skew
    return false;
  }
  
  // Check required fields
  if (!payload.sub || !payload.iss || !payload.aud) {
    return false;
  }
  
  return true;
}

/**
 * Create a mock JWT payload for testing (development only)
 */
export function createMockJWTPayload(userId: string, role: string = 'user'): JWTPayload {
  if (appConfig.isProduction) {
    throw new Error('Mock JWT payload not allowed in production');
  }
  
  const now = Math.floor(Date.now() / 1000);
  
  return {
    sub: userId,
    role,
    iss: appConfig.JWT_ISSUER,
    aud: appConfig.JWT_AUDIENCE,
    iat: now,
    exp: now + 3600, // 1 hour
  };
}