import { Request, Response, NextFunction } from 'express';
import { db } from '../../../db';
import { auditTrail } from '@shared/schema';
import type { AuthContext } from './auth';

const FERPA_PROTECTED_ROUTES = new Set([
  '/users/:id',
  '/users/:id/profile',
  '/uploads',
  '/uploads/:id',
]);

function isFerpaRoute(path: string): boolean {
  for (const pattern of FERPA_PROTECTED_ROUTES) {
    const regex = new RegExp('^' + pattern.replace(/:id/g, '[^/]+') + '$');
    if (regex.test(path)) return true;
  }
  return false;
}

export async function ferpaGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const relativePath = req.path.replace('/api/v2/dataservice', '');
  
  if (!isFerpaRoute(relativePath)) {
    return next();
  }
  
  const auth = req.authContext as AuthContext | undefined;
  
  if (!auth) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required for FERPA-protected resource' }
    });
    return;
  }
  
  const hasFerpaAccess = auth.isFerpaCovered || auth.isSchoolOfficial || auth.roles.includes('admin');
  
  if (!hasFerpaAccess) {
    res.status(403).json({
      error: { code: 'FERPA_ACCESS_DENIED', message: 'FERPA-covered access required' }
    });
    return;
  }
  
  req.ferpaAccess = true;
  
  next();
}

declare global {
  namespace Express {
    interface Request {
      ferpaAccess?: boolean;
    }
  }
}

export function markFerpaAccess(req: Request, _res: Response, next: NextFunction): void {
  if (req.authContext?.isFerpaCovered || req.authContext?.isSchoolOfficial) {
    req.ferpaAccess = true;
  }
  next();
}
