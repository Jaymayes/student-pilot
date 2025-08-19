// Security middleware

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { appConfig } from '@/config';
import { generateCorrelationId } from '@/utils/jwt';
import { AuthenticatedRequest } from '@/types';

/**
 * CORS configuration
 */
export const corsOptions = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (appConfig.corsAllowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Correlation-ID'
  ],
});

/**
 * Security headers with Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: appConfig.isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false, // Disable in development for easier debugging
  crossOriginEmbedderPolicy: false, // Allow embedding for Swagger UI
});

/**
 * Rate limiting by IP
 */
export const rateLimitByIP = rateLimit({
  windowMs: appConfig.RATE_LIMIT_WINDOW_MS,
  max: appConfig.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded, please try again later',
    retryAfter: Math.ceil(appConfig.RATE_LIMIT_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust proxy headers in production
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/healthz' || req.path === '/readyz';
  },
});

/**
 * Rate limiting by authenticated user
 */
export const rateLimitByUser = rateLimit({
  windowMs: appConfig.RATE_LIMIT_WINDOW_MS,
  max: appConfig.RATE_LIMIT_MAX_REQUESTS * 2, // Higher limit for authenticated users
  keyGenerator: (req: AuthenticatedRequest) => {
    return req.user?.sub || req.ip;
  },
  message: {
    error: 'Too Many Requests',
    message: 'User rate limit exceeded, please try again later',
    retryAfter: Math.ceil(appConfig.RATE_LIMIT_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
});

/**
 * Aggressive rate limiting for expensive operations
 */
export const rateLimitAggressive = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded for this operation',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
});

/**
 * Correlation ID middleware for request tracking
 */
export function correlationId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId = req.headers['x-correlation-id'] as string || generateCorrelationId();
  
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
}

/**
 * Trust proxy configuration for production
 */
export function trustProxy(app: any): void {
  if (appConfig.isProduction) {
    app.set('trust proxy', true);
  }
}