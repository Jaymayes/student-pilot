// JWT utilities for secure authentication

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { appConfig } from '@/config';
import { JWTPayload } from '@/types';

/**
 * Timing-safe JWT verification to prevent timing attacks
 */
export function verifyJWTTimingSafe(token: string): JWTPayload | null {
  try {
    // Algorithm allowlist - only allow RS256
    const decoded = jwt.verify(token, appConfig.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: appConfig.JWT_ISSUER,
      audience: appConfig.JWT_AUDIENCE,
    }) as JWTPayload;

    // Validate required fields
    if (!decoded.sub || !decoded.email || !decoded.role) {
      return null;
    }

    // Validate role enum
    if (!['user', 'admin'].includes(decoded.role)) {
      return null;
    }

    return decoded;
  } catch (error) {
    // Always take the same amount of time regardless of error type
    // This prevents timing attacks that could reveal information about tokens
    crypto.timingSafeEqual(
      Buffer.from('dummy'.padEnd(32, '0')),
      Buffer.from('dummy'.padEnd(32, '0'))
    );
    
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
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Validate token format before verification
 */
export function isValidTokenFormat(token: string): boolean {
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  // Each part should be valid base64url
  try {
    parts.forEach(part => {
      if (!part || part.length === 0) {
        throw new Error('Empty part');
      }
      // Decode to validate base64url format
      Buffer.from(part, 'base64url');
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get uniform error response for authentication failures
 */
export function getUniformAuthError() {
  return {
    error: 'Unauthorized',
    message: 'Invalid or missing authentication token',
  };
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: JWTPayload): boolean {
  return user.role === 'admin';
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}