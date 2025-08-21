import * as crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Timing-safe string comparison to prevent timing attacks
export function timingSafeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Use a dummy comparison to maintain constant time
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// Secure random string generator for tokens and IDs
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Password strength validation
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Content Security Policy nonce generator
export function generateCSPNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

// Middleware to add security headers
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Generate unique nonce for this request
  const nonce = generateCSPNonce();
  req.nonce = nonce;
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  
  // Strict Transport Security (HSTS) for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
}

// Rate limiting helper with adaptive thresholds
export function createAdaptiveRateLimit(baseLimit: number, windowMs: number) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip + (req.user ? `:${(req.user as any).id}` : '');
    const now = Date.now();
    
    let userLimit = requestCounts.get(key);
    
    if (!userLimit || now > userLimit.resetTime) {
      userLimit = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    userLimit.count++;
    requestCounts.set(key, userLimit);
    
    // Adaptive limit based on authentication status
    const limit = req.user ? baseLimit * 2 : baseLimit;
    
    if (userLimit.count > limit) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        resetTime: new Date(userLimit.resetTime).toISOString()
      });
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - userLimit.count).toString());
    res.setHeader('X-RateLimit-Reset', userLimit.resetTime.toString());
    
    next();
  };
}

// Input sanitization for HTML content
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// SQL injection prevention helpers
export function validateSqlIdentifier(identifier: string): boolean {
  // Only allow alphanumeric characters and underscores
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

// Secure cookie settings
export function getSecureCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  };
}

// Type extensions
declare global {
  namespace Express {
    interface Request {
      nonce?: string;
    }
  }
}