import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import * as crypto from 'crypto';

// Pagination validation schema
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(256).optional()
});

// Billing specific validation schemas
export const BillingPaginationSchema = PaginationSchema.extend({
  type: z.enum(['ledger', 'usage']).optional()
});

// Input validation middleware factory
export function validateInput(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse({
        ...req.query,
        ...req.body,
        ...req.params
      });
      
      // Replace request data with validated data
      req.query = validatedData;
      req.body = validatedData;
      req.params = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
}

// XSS protection - HTML escape utility
export function escapeHtml(text: string): string {
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match as keyof typeof htmlEscapes]);
}

// Safe JSON parsing with size limits
export function safeJsonParse(str: string, maxSize: number = 1024 * 1024): any {
  if (str.length > maxSize) {
    throw new Error('JSON payload too large');
  }
  
  try {
    return JSON.parse(str);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

// Cursor validation and creation

export function createSecureCursor(data: { createdAt: Date; id: string }, secret: string): string {
  const payload = Buffer.from(JSON.stringify({
    createdAt: data.createdAt.toISOString(),
    id: data.id,
    exp: Date.now() + (1000 * 60 * 60 * 24) // 24 hour expiry
  })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  
  return `${payload}.${signature}`;
}

export function validateSecureCursor(cursor: string, secret: string): { createdAt: Date; id: string } | null {
  try {
    const [payload, signature] = cursor.split('.');
    if (!payload || !signature) return null;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    // Decode and validate payload
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    // Check expiry
    if (data.exp && Date.now() > data.exp) return null;
    
    return {
      createdAt: new Date(data.createdAt),
      id: data.id
    };
  } catch {
    return null;
  }
}