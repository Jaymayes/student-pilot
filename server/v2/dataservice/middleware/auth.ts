import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

export interface AuthContext {
  userId: string;
  email?: string;
  roles: string[];
  serviceId?: string;
  isFerpaCovered?: boolean;
  isSchoolOfficial?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
}

const S2S_API_KEY = process.env.S2S_API_KEY;
const AUTH_ISSUER_URL = process.env.AUTH_ISSUER_URL;

function verifyJwt(token: string): AuthContext | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    
    return {
      userId: payload.sub || payload.user_id,
      email: payload.email,
      roles: payload.roles || [],
      isFerpaCovered: payload.is_ferpa_covered || false,
      isSchoolOfficial: payload.roles?.includes('school_official') || false,
    };
  } catch {
    return null;
  }
}

function verifyApiKey(apiKey: string, serviceId: string): AuthContext | null {
  if (!S2S_API_KEY) return null;
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(apiKey),
    Buffer.from(S2S_API_KEY)
  );
  
  if (!isValid) return null;
  
  return {
    userId: `service:${serviceId}`,
    roles: ['service'],
    serviceId,
    isFerpaCovered: true,
    isSchoolOfficial: false,
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const serviceId = req.headers['x-service-id'] as string | undefined;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const context = verifyJwt(token);
    
    if (context) {
      req.authContext = context;
      return next();
    }
    
    res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired JWT token' }
    });
    return;
  }
  
  if (apiKey && serviceId) {
    const context = verifyApiKey(apiKey, serviceId);
    
    if (context) {
      req.authContext = context;
      return next();
    }
    
    res.status(401).json({
      error: { code: 'INVALID_API_KEY', message: 'Invalid API key or service ID' }
    });
    return;
  }
  
  res.status(401).json({
    error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
  });
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const serviceId = req.headers['x-service-id'] as string | undefined;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    req.authContext = verifyJwt(token) || undefined;
  } else if (apiKey && serviceId) {
    req.authContext = verifyApiKey(apiKey, serviceId) || undefined;
  }
  
  next();
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authContext) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }
    
    const hasRole = roles.some(role => req.authContext!.roles.includes(role));
    
    if (!hasRole) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
      });
      return;
    }
    
    next();
  };
}
