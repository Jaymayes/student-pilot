import * as jwt from 'jsonwebtoken';
import { Algorithm } from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';

// Centralized JWT verification with timing-safe operations
export class SecureJWTVerifier {
  private static readonly ALLOWED_ALGORITHMS: Algorithm[] = ['HS256'];
  private static readonly GENERIC_ERROR = 'Invalid token';

  static verifyToken(token: string, secret: string, options?: {
    issuer?: string;
    audience?: string;
    clockTolerance?: number;
  }): any {
    try {
      const decoded = jwt.verify(token, secret, {
        algorithms: SecureJWTVerifier.ALLOWED_ALGORITHMS,
        issuer: options?.issuer,
        audience: options?.audience,
        clockTolerance: options?.clockTolerance || 30, // 30 second clock tolerance
      });

      return decoded;
    } catch (error) {
      // Return consistent error regardless of specific failure
      throw new Error(SecureJWTVerifier.GENERIC_ERROR);
    }
  }

  static signToken(payload: any, secret: string, options?: {
    issuer?: string;
    audience?: string;
    expiresIn?: string;
  }): string {
    if (!secret || secret.length === 0) {
      throw new Error('JWT secret is required and cannot be empty');
    }
    
    const signOptions: any = {
      algorithm: 'HS256' as const,
      issuer: options?.issuer,
      audience: options?.audience,
      expiresIn: options?.expiresIn || '15m', // Short-lived tokens
    };
    
    return jwt.sign(payload, secret, signOptions);
  }

  // Timing-safe string comparison
  static timingSafeStringCompare(a: string, b: string): boolean {
    try {
      // Pad strings to same length to prevent timing attacks
      const maxLen = Math.max(a.length, b.length);
      const bufA = Buffer.alloc(maxLen);
      const bufB = Buffer.alloc(maxLen);
      
      bufA.write(a);
      bufB.write(b);
      
      return timingSafeEqual(bufA, bufB) && a.length === b.length;
    } catch {
      return false;
    }
  }
}

// Generic error handler for authentication failures
export class AuthError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthError';
  }
}