import { Request, Response, NextFunction } from 'express';
import { db } from '../../../db';
import { auditTrail } from '@shared/schema';
import * as crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      correlationId?: string;
      auditBefore?: Record<string, unknown>;
    }
  }
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = (req.headers['x-trace-id'] as string) || crypto.randomUUID();
  req.correlationId = (req.headers['x-correlation-id'] as string) || req.requestId;
  next();
}

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export async function logAuditTrail(
  action: AuditAction,
  entityType: string,
  entityId: string,
  req: Request,
  changes?: { before?: unknown; after?: unknown }
): Promise<void> {
  try {
    const actorType = req.authContext?.serviceId 
      ? 'system' 
      : req.authContext?.roles.includes('admin') 
        ? 'admin' 
        : 'student';
    
    await db.insert(auditTrail).values({
      action,
      entityType,
      entityId,
      actorId: req.authContext?.userId,
      actorType: actorType as 'student' | 'provider' | 'system' | 'admin',
      actorIp: req.ip || req.socket.remoteAddress,
      changes: changes || null,
      ferpaAccess: req.ferpaAccess || false,
      requestId: req.requestId,
      correlationId: req.correlationId,
    });
  } catch (error) {
    console.error('[AuditTrail] Failed to log audit entry:', error);
  }
}

export function auditMiddleware(entityType: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);
    
    res.json = function(body: unknown) {
      const method = req.method;
      let action: AuditAction | null = null;
      
      if (method === 'POST' && res.statusCode >= 200 && res.statusCode < 300) {
        action = 'CREATE';
      } else if (method === 'PUT' || method === 'PATCH') {
        action = 'UPDATE';
      } else if (method === 'DELETE') {
        action = 'DELETE';
      }
      
      if (action) {
        const entityId = req.params.id || (body as Record<string, unknown>)?.id as string || 'unknown';
        
        logAuditTrail(action, entityType, entityId, req, {
          before: req.auditBefore,
          after: action !== 'DELETE' ? body : undefined,
        }).catch(console.error);
      }
      
      return originalJson(body);
    };
    
    next();
  };
}
