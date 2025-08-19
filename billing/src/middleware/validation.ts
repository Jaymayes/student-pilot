// Request validation middleware

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validate request body against Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Strip unknown properties and validate
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request body',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request body',
      });
    }
  };
}

/**
 * Validate request query parameters against Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
      });
    }
  };
}

/**
 * Validate request parameters against Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid path parameters',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid path parameters',
      });
    }
  };
}

/**
 * Enforce content type
 */
export function requireContentType(contentType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.headers['content-type']?.includes(contentType)) {
      res.status(415).json({
        error: 'Unsupported Media Type',
        message: `Content-Type must be ${contentType}`,
      });
      return;
    }
    next();
  };
}

/**
 * Body size limit middleware
 */
export function limitBodySize(maxBytes: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxBytes) {
      res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body exceeds ${maxBytes} bytes`,
      });
      return;
    }
    
    next();
  };
}