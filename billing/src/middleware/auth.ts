// Authentication middleware

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/types';
import { 
  verifyJWTTimingSafe, 
  extractBearerToken, 
  isValidTokenFormat,
  getUniformAuthError,
  isAdmin
} from '@/utils/jwt';

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    res.status(401).json(getUniformAuthError());
    return;
  }

  if (!isValidTokenFormat(token)) {
    res.status(401).json(getUniformAuthError());
    return;
  }

  const payload = verifyJWTTimingSafe(token);
  
  if (!payload) {
    res.status(401).json(getUniformAuthError());
    return;
  }

  // Add user to request object
  (req as AuthenticatedRequest).user = payload;
  next();
}

/**
 * Admin authorization middleware - requires admin role
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!isAdmin(req.user)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin role required',
    });
    return;
  }
  
  next();
}

/**
 * Optional authentication middleware - adds user if token present
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (token && isValidTokenFormat(token)) {
    const payload = verifyJWTTimingSafe(token);
    if (payload) {
      (req as AuthenticatedRequest).user = payload;
    }
  }

  next();
}

// Export the functions with aliases to match routes expectations
export const requireAuth = authenticateToken;

// Setup function for app-level auth middleware
export function setupAuth(app: any): void {
  // Global auth setup if needed
}