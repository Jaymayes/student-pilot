import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { env, isProduction } from "./environment";
import * as crypto from "crypto";
import { metricsCollector } from "./monitoring/metrics";
import { reliabilityManager } from "./reliability";
// Import alerting system to register event listeners
import "./monitoring/alerting";

const app = express();

// CRITICAL: Top-of-stack guard middleware to serve static compliance files
const securityTxt = `Contact: security@scholarshipai.com
Acknowledgments: https://scholarshipai.com/security
Policy: https://scholarshipai.com/security-policy
Expires: 2025-12-31T23:59:59.000Z
Preferred-Languages: en`;

const robotsTxt = `User-agent: *
Allow: /

# Sitemap location
Sitemap: https://student-pilot-jamarrlmayes.replit.app/sitemap.xml

# Block admin areas
Disallow: /admin/
Disallow: /api/

# Allow scholarship pages
Allow: /scholarships/
Allow: /apply/`;

app.use((req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && 
      (req.path === '/.well-known/security.txt' || req.path === '/robots.txt')) {
    console.log(`🎯 GUARD MIDDLEWARE serving: ${req.path} (method: ${req.method})`);
    res.set('Cache-Control', 'public, max-age=3600, immutable');
    res.type('text/plain; charset=utf-8');
    res.set('X-WellKnown-Served', '1');
    return res.send(req.path === '/.well-known/security.txt' ? securityTxt : robotsTxt);
  }
  next();
});

console.log('🚀 Top-level guard middleware registered for static compliance files');

// Configure EJS for server-side rendering
app.set('view engine', 'ejs');
app.set('views', path.join(import.meta.dirname, 'views'));

// Disable ETags globally to prevent 304 responses that break React Query
app.disable('etag');

// Enable compression for better performance (gzip/brotli)
app.use(compression({
  level: 6,  // Good balance of compression vs CPU usage
  threshold: 1024, // Only compress files > 1KB
  filter: (req, res) => {
    // Don't compress responses that shouldn't be compressed
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// CORS configuration - permissive in development, strict in production
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? true : [
    'http://localhost:5000',
    'https://student-pilot-jamarrlmayes.replit.app',
    process.env.VITE_BASE_URL || ''
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  maxAge: 86400 // 24 hours
}));

// Security middleware - helmet with initial configuration
app.use(helmet({
  contentSecurityPolicy: false, // Will enable as report-only first
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CSP with environment-specific policies for security and performance
const isDevelopment = process.env.NODE_ENV === 'development';

app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: isDevelopment 
      ? ["'self'", "https://js.stripe.com", "'unsafe-inline'", "https://replit.com"] // Dev: allow inline for Vite HMR
      : ["'self'", "https://js.stripe.com"], // Prod: strict, no unsafe-inline
    frameSrc: ["'self'", "https://js.stripe.com"],
    connectSrc: isDevelopment
      ? ["'self'", "https://api.stripe.com", "https://api.openai.com", "https://storage.googleapis.com", "wss://localhost:*", "ws://localhost:*"] // Dev: allow HMR
      : ["'self'", "https://api.stripe.com", "https://api.openai.com", "https://storage.googleapis.com"], // Prod: no dev origins
    styleSrc: isDevelopment
      ? ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"] // Dev: allow inline for Vite
      : ["'self'", "https://fonts.googleapis.com"], // Prod: no unsafe-inline
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:"],
    objectSrc: ["'none'"]
  },
  reportOnly: false // Enforce CSP for security and performance
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // stricter limit for auth endpoints
  skipSuccessfulRequests: true
});

const billingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30 // 30 billing requests per minute
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/billing', billingLimiter);

// Performance monitoring middleware - collect metrics for all requests
app.use(metricsCollector.httpMetricsMiddleware());

// CRITICAL: Static file routes FIRST to prevent Vite interception
// RFC 9116 compliance for security.txt - serve inline to avoid filesystem dependencies
app.get('/.well-known/security.txt', (req, res) => {
  console.log('✅ Serving security.txt via explicit top-level route');
  res.type('text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600, immutable');
  res.send(`Contact: security@scholarshipai.com
Acknowledgments: https://scholarshipai.com/security
Policy: https://scholarshipai.com/security-policy
Expires: 2025-12-31T23:59:59.000Z
Preferred-Languages: en`);
});

app.head('/.well-known/security.txt', (req, res) => {
  res.type('text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600, immutable');
  res.end();
});

// SEO robots.txt compliance - serve inline
app.get('/robots.txt', (req, res) => {
  console.log('✅ Serving robots.txt via explicit top-level route');
  res.type('text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600, immutable');
  res.send(`User-agent: *
Allow: /

# Sitemap location
Sitemap: https://student-pilot-jamarrlmayes.replit.app/sitemap.xml

# Block admin areas
Disallow: /admin/
Disallow: /api/

# Allow scholarship pages
Allow: /scholarships/
Allow: /apply/`);
});

app.head('/robots.txt', (req, res) => {
  res.type('text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600, immutable');
  res.end();
});

console.log('✅ Registered security.txt and robots.txt routes at MODULE TOP LEVEL');

// CRITICAL: Short-circuit middleware for static compliance files before Vite catch-all
const PLAIN_ROUTES = new Map([
  ['/.well-known/security.txt', { 
    type: 'text/plain; charset=utf-8', 
    body: `Contact: security@scholarshipai.com
Acknowledgments: https://scholarshipai.com/security
Policy: https://scholarshipai.com/security-policy
Expires: 2025-12-31T23:59:59.000Z
Preferred-Languages: en` 
  }],
  ['/robots.txt', { 
    type: 'text/plain; charset=utf-8', 
    body: `User-agent: *
Allow: /

# Sitemap location
Sitemap: https://student-pilot-jamarrlmayes.replit.app/sitemap.xml

# Block admin areas
Disallow: /admin/
Disallow: /api/

# Allow scholarship pages
Allow: /scholarships/
Allow: /apply/` 
  }]
]);

app.use((req, res, next) => {
  const pathname = req.path.replace(/\/+$/, ''); // strip trailing slashes
  const route = PLAIN_ROUTES.get(pathname);
  if (route) {
    console.log(`🎯 Short-circuit serving: ${pathname} (method: ${req.method})`);
    res.set('Cache-Control', 'public, max-age=3600, immutable');
    res.type(route.type).send(route.body);
    return; // HARD STOP: never fall through to Vite
  }
  next();
});

// Body parsing with size limits
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Circular reference replacer for safe JSON serialization
function getCircularReplacer() {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  };
}

// Global BigInt serialization for JSON responses with circular reference safety
app.set('json replacer', getCircularReplacer());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          // Safe JSON serialization that handles circular references
          const safeJson = JSON.stringify(capturedJsonResponse, getCircularReplacer());
          logLine += ` :: ${safeJson}`;
        } catch (error) {
          // Fallback to basic string representation if JSON serialization fails
          logLine += ` :: [Response body - serialization failed]`;
        }
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // CRITICAL: Early path imports for security.txt handler
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.resolve(__dirname, '..', 'client', 'public');

  // Register all application routes
  await registerRoutes(app);
  
  // Add enterprise monitoring endpoints - Task perf-4
  app.get('/metrics', (req, res) => {
    // Security: Require explicit metrics password - no defaults
    if (!process.env.METRICS_PASSWORD) {
      return res.status(503).json({ error: 'Metrics endpoint not configured' });
    }
    
    const auth = req.headers.authorization;
    const expectedAuth = 'Basic ' + Buffer.from('metrics:' + process.env.METRICS_PASSWORD).toString('base64');
    
    if (!auth || auth !== expectedAuth) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Metrics"');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Prometheus-compatible metrics for scraping
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsCollector.getPrometheusMetrics());
  });
  
  app.get('/api/metrics', (req, res) => {
    // JSON metrics for dashboard consumption
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    res.setHeader('X-Correlation-ID', correlationId);
    
    res.json({
      timestamp: new Date().toISOString(),
      correlationId,
      http: metricsCollector.getHttpMetrics(),
      cache: metricsCollector.getCacheMetrics(),
      database: metricsCollector.getDbMetrics(),
      ai: metricsCollector.getAiMetrics(),
      resources: metricsCollector.getResourceMetrics()
    });
  });

  // Enterprise reliability health endpoint - Task perf-5
  app.get('/api/health/reliability', (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    res.setHeader('X-Correlation-ID', correlationId);
    
    const serviceHealth = reliabilityManager.getServiceHealth();
    const overallHealth = Object.values(serviceHealth).every((service: any) => service.healthy);
    
    res.json({
      timestamp: new Date().toISOString(),
      correlationId,
      status: overallHealth ? 'healthy' : 'degraded',
      services: serviceHealth,
      circuitBreakers: {
        total: Object.keys(serviceHealth).length,
        healthy: Object.values(serviceHealth).filter((service: any) => service.healthy).length,
        degraded: Object.values(serviceHealth).filter((service: any) => !service.healthy).length
      }
    });
  });
  
  // Create single HTTP server after all routes are registered
  const server = createServer(app);

  // Setup monitoring dashboards for T+48 review - skip if not available
  try {
    const dashboards = await import('./monitoring/dashboards.js');
    const monitoring = new dashboards.default();
    monitoring.setupRoutes(app);
  } catch (error) {
    console.log('Monitoring dashboards not available, skipping...');
  }

  // Production-safe error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
    
    // Log full error details server-side
    console.error('API Error:', {
      error: err.message,
      stack: err.stack,
      correlationId,
      method: req.method,
      path: req.path,
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString()
    });
    
    const status = (err.statusCode && Number.isInteger(err.statusCode)) ? err.statusCode : 500;
    
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Never expose sensitive error details in production
    const message = status >= 500 && isProduction 
      ? 'Internal server error'
      : err.message || 'An error occurred';
    
    res.status(status).json({ 
      error: message,
      correlationId: isProduction ? correlationId : undefined
    });
  });

  // General static file serving for non-.well-known assets
  app.use(express.static(publicDir, { 
    dotfiles: 'ignore', 
    fallthrough: true 
  }));

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = env.PORT;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
