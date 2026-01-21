import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import * as jose from 'jose';

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

let jwksCache: jose.JWTVerifyGetKey | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 3600000;

async function getJwks(): Promise<jose.JWTVerifyGetKey> {
  const now = Date.now();
  if (jwksCache && now - jwksCacheTime < JWKS_CACHE_TTL) {
    return jwksCache;
  }
  
  if (!AUTH_ISSUER_URL) {
    throw new Error('AUTH_ISSUER_URL not configured');
  }
  
  const issuerUrl = AUTH_ISSUER_URL.replace(/\/$/, '');
  const jwksUrl = `${issuerUrl}/.well-known/jwks.json`;
  
  jwksCache = jose.createRemoteJWKSet(new URL(jwksUrl));
  jwksCacheTime = now;
  
  return jwksCache;
}

async function verifyJwt(token: string): Promise<AuthContext | null> {
  try {
    const jwks = await getJwks();
    
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: AUTH_ISSUER_URL?.replace(/\/$/, ''),
    });
    
    return {
      userId: (payload.sub || payload.user_id) as string,
      email: payload.email as string | undefined,
      roles: (payload.roles as string[]) || [],
      isFerpaCovered: (payload.is_ferpa_covered as boolean) || false,
      isSchoolOfficial: ((payload.roles as string[])?.includes('school_official')) || false,
    };
  } catch (error) {
    console.warn('[DataService Auth] JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
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

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const serviceId = req.headers['x-service-id'] as string | undefined;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const context = await verifyJwt(token);
    
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

export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const serviceId = req.headers['x-service-id'] as string | undefined;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const context = await verifyJwt(token);
    req.authContext = context || undefined;
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
