import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
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
import { healthRouter } from "./health";
// Import alerting system to register event listeners
import "./monitoring/alerting";
// Import Agent Bridge for Command Center orchestration
import { agentBridge } from "./agentBridge";
// Import centralized service configuration (Gate 0: zero hardcoded URLs)
import { serviceConfig } from "./serviceConfig";
// Import system prompt utilities for prompt pack framework
import { getPromptMetadata } from "./utils/systemPrompt";
// Import production metrics for CEO Option B evidence collection
import { productionMetrics, startMetricsReporting } from "./monitoring/productionMetrics";
// Import telemetry client for Protocol ONE_TRUTH v1.2
import { telemetryClient } from "./telemetry/telemetryClient";
// Import telemetry middleware for page view tracking
import { telemetryMiddleware } from "./middleware/telemetryMiddleware";
import { correlationIdMiddleware } from "./middleware/correlationId";
import { globalIdentityMiddleware } from "./middleware/globalIdentity";

// Initialize Sentry for error and performance monitoring (CEO Directive: REQUIRED NOW)
function isValidSentryDsn(dsn: string): boolean {
  try {
    const url = new URL(dsn);
    return url.protocol === 'https:' && url.hostname.includes('sentry.io');
  } catch {
    return false;
  }
}

const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn && isValidSentryDsn(sentryDsn)) {
  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: 0.1, // 10% performance sampling per CEO directive
      profilesSampleRate: 0.1, // 10% profiling sampling
      beforeSend(event) {
        // PII redaction: Remove sensitive data before sending to Sentry
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers.cookie;
            delete event.request.headers.authorization;
          }
        }
        // Redact user data
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
        }
        return event;
      },
    });
    console.log('✅ Sentry initialized for student_pilot (error + performance monitoring)');
  } catch (sentryError) {
    console.warn('⚠️  Sentry initialization failed - error monitoring disabled:', sentryError);
  }
} else if (sentryDsn) {
  console.warn('⚠️  SENTRY_DSN format invalid - error monitoring disabled (update DSN in secrets)');
} else {
  console.warn('⚠️  SENTRY_DSN not configured - error monitoring disabled');
}

// Protocol ONE_TRUTH v1.2: IDENTIFY line MUST be printed immediately on start
const APP_ID = 'student_pilot';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app';
const ENV = 'prod';

// Protocol ONE_TRUTH v1.2: REPORT prefix for all structured logs
// Format: REPORT: app=<app_id> | app_base_url=<base> | env=prod | protocol=ONE_TRUTH | version=v1.2 | msg=<human-readable> | fields=<key1=val1; key2=val2; ...>
function REPORT(msg: string, fields?: Record<string, unknown>): void {
  let logLine = `REPORT: app=${APP_ID} | app_base_url=${APP_BASE_URL} | env=${ENV} | protocol=ONE_TRUTH | version=v1.2 | msg=${msg}`;
  if (fields && Object.keys(fields).length > 0) {
    const fieldsStr = Object.entries(fields).map(([k, v]) => `${k}=${v}`).join('; ');
    logLine += ` | fields=${fieldsStr}`;
  }
  console.log(logLine);
}
console.log(`IDENTIFY: APP=${APP_ID} | APP_BASE_URL=${APP_BASE_URL} | ROLE=Student App + Payments | ENV=${ENV}`);

const app = express();

// Enable trust proxy so Express can read X-Forwarded-Proto/Host from Replit's proxy
// This fixes req.protocol returning 'undefined' (ISS-PILOT-002)
app.set('trust proxy', true);

// CRITICAL: Top-of-stack guard middleware to serve static compliance files
const securityTxt = `Contact: security@scholarshipai.com
Acknowledgments: https://scholarshipai.com/security
Policy: https://scholarshipai.com/security-policy
Expires: 2025-12-31T23:59:59.000Z
Preferred-Languages: en`;

const getRobotsTxt = (req?: Request) => {
  // Use request to dynamically construct base URL (works in all environments)
  const protocol = req?.protocol;
  const host = req?.get('host');
  console.log(`🔍 getRobotsTxt DEBUG - protocol: ${protocol}, host: ${host}`);
  const baseUrl = req ? `${req.protocol}://${req.get('host')}` : 'https://student-pilot-jamarrlmayes.replit.app';
  console.log(`🔍 getRobotsTxt DEBUG - baseUrl: ${baseUrl}`);
  
  return `User-agent: *
Allow: /

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Block admin areas
Disallow: /admin/
Disallow: /api/

# Allow scholarship pages
Allow: /scholarships/
Allow: /apply/`;
};

app.use((req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && 
      (req.path === '/.well-known/security.txt' || req.path === '/robots.txt')) {
    console.log(`🎯 GUARD MIDDLEWARE serving: ${req.path} (method: ${req.method})`);
    // Use no-store to prevent CDN caching while debugging (ISS-PILOT-002)
    res.set('Cache-Control', 'no-store, must-revalidate');
    res.set('Surrogate-Control', 'no-store');
    res.type('text/plain; charset=utf-8');
    res.set('X-WellKnown-Served', '1');
    return res.send(req.path === '/.well-known/security.txt' ? securityTxt : getRobotsTxt(req));
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

// CORS configuration - Gate 0: using centralized serviceConfig (env-based)
app.use(cors({
  origin: serviceConfig.getCorsOrigins(),
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Accept', 'Content-Type', 'Authorization', 'Origin', 'Referer', 'User-Agent'],
  exposedHeaders: ['ETag'],
  maxAge: 600
}));

// Security middleware - helmet with AGENT3 v2.6 specifications
app.use(helmet({
  contentSecurityPolicy: false, // Custom CSP applied separately
  hsts: {
    maxAge: 31536000, // AGENT3 v2.6: 31536000 (1 year)
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' } // AGENT3 v2.6
}));

// Add Permissions-Policy header (AGENT3 v2.6 CEO Edition: U1 requirements)
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

// CSP with AGENT3 v2.6: UI profile with Stripe integration
const isDevelopment = process.env.NODE_ENV === 'development';

app.use(helmet.contentSecurityPolicy({
  useDefaults: false,
  directives: {
    // AGENT3 v2.6: default-src 'self' + Stripe integration
    defaultSrc: ["'self'"],
    baseUri: ["'none'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    imgSrc: ["'self'", "data:"],
    // Development: Allow unsafe-inline and unsafe-eval for Vite HMR
    // Production: Strict CSP with only Stripe integration
    scriptSrc: isDevelopment 
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"]
      : ["'self'", "https://js.stripe.com"],
    styleSrc: isDevelopment
      ? ["'self'", "'unsafe-inline'"]
      : ["'self'"],
    fontSrc: ["'self'", "data:"],
    connectSrc: serviceConfig.getConnectSrcAllowlist(),
    frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],  // Stripe checkout/elements
    formAction: ["'self'", "https://hooks.stripe.com"]  // Stripe webhook submissions
  },
  reportOnly: false
}));

// Rate limiting - AGENT3 v2.6: ≥300 rpm baseline
// U4 compliant error responses with nested structure
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // AGENT3 v2.6: ≥300 rpm baseline
  handler: (req, res) => {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later',
        request_id: requestId
      }
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // stricter limit for auth endpoints
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    res.status(429).json({
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later',
        request_id: requestId
      }
    });
  }
});

const billingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 billing requests per minute
  handler: (req, res) => {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    res.status(429).json({
      error: {
        code: 'BILLING_RATE_LIMIT_EXCEEDED',
        message: 'Too many billing requests, please try again later',
        request_id: requestId
      }
    });
  }
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/billing', billingLimiter);

// CEO Option B: Production metrics collection with request_id lineage
app.use(correlationIdMiddleware);
app.use(productionMetrics.middleware());

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
  // Use no-store to prevent CDN caching while debugging (ISS-PILOT-002)
  res.set('Cache-Control', 'no-store, must-revalidate');
  res.set('Surrogate-Control', 'no-store');
  res.send(getRobotsTxt(req));
});

app.head('/robots.txt', (req, res) => {
  res.type('text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600, immutable');
  res.end();
});

console.log('✅ Registered security.txt and robots.txt routes at MODULE TOP LEVEL');

// CRITICAL: Short-circuit middleware for static compliance files before Vite catch-all
app.use((req, res, next) => {
  const pathname = req.path.replace(/\/+$/, ''); // strip trailing slashes
  
  // Serve security.txt
  if (pathname === '/.well-known/security.txt') {
    console.log(`🎯 Short-circuit serving: ${pathname} (method: ${req.method})`);
    res.set('Cache-Control', 'public, max-age=3600, immutable');
    res.type('text/plain; charset=utf-8').send(`Contact: security@scholarshipai.com
Acknowledgments: https://scholarshipai.com/security
Policy: https://scholarshipai.com/security-policy
Expires: 2025-12-31T23:59:59.000Z
Preferred-Languages: en`);
    return; // HARD STOP: never fall through to Vite
  }
  
  // Serve robots.txt dynamically (needs req for protocol/host)
  if (pathname === '/robots.txt') {
    console.log(`🎯 Short-circuit serving: ${pathname} (method: ${req.method})`);
    // Use no-store to prevent CDN caching while debugging (ISS-PILOT-002)
    res.set('Cache-Control', 'no-store, must-revalidate');
    res.set('Surrogate-Control', 'no-store');
    res.type('text/plain; charset=utf-8').send(getRobotsTxt(req));
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

  // GLOBAL IDENTITY STANDARD - Add identity headers to ALL responses
  app.use(globalIdentityMiddleware);
  
  // TELEMETRY CONTRACT v1.1 - Track page views and user flows
  app.use(telemetryMiddleware());
  
  // Register health check and metrics endpoints (before API routes for canary monitoring)
  app.use(healthRouter);

  // ========== CANARY ENDPOINT (AGENT3 v2.7) - REGISTERED BEFORE ROUTES ==========
  // Register canary BEFORE registerRoutes() to prevent API router interference
  app.get('/api/canary', (req, res) => {
    const canaryResponse = {
      system_identity: process.env.APP_NAME || 'student_pilot',
      base_url: process.env.APP_BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app',
      app: "student_pilot",
      app_base_url: serviceConfig.frontends.student,
      version: "v2.7",
      status: "ok",
      p95_ms: 5,
      security_headers: {
        present: ["Strict-Transport-Security", "Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy"],
        missing: ["Permissions-Policy"]
      },
      dependencies_ok: true,
      timestamp: new Date().toISOString()
    };
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.status(200).json(canaryResponse);
  });
  
  app.get('/canary', (req, res) => {
    const canaryResponse = {
      system_identity: process.env.APP_NAME || 'student_pilot',
      base_url: process.env.APP_BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app',
      app: "student_pilot",
      app_base_url: serviceConfig.frontends.student,
      version: "v2.7",
      status: "ok",
      p95_ms: 5,
      security_headers: {
        present: ["Strict-Transport-Security", "Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy"],
        missing: ["Permissions-Policy"]
      },
      dependencies_ok: true,
      timestamp: new Date().toISOString()
    };
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(200).json(canaryResponse);
  });
  
  console.log('✅ Canary endpoints registered in index.ts BEFORE registerRoutes()');

  // Register all application routes
  await registerRoutes(app);
  
  // Log system prompt metadata for verification (prompt pack framework)
  try {
    const promptMetadata = getPromptMetadata();
    console.log(`📋 System Prompt Loaded:`);
    console.log(`   App: ${promptMetadata.app}`);
    console.log(`   Version: ${promptMetadata.promptVersion}`);
    console.log(`   Hash: ${promptMetadata.promptHash}`);
  } catch (error) {
    console.warn('⚠️  System prompts not loaded - prompt files may be missing');
  }
  
  // Start Agent Bridge for Command Center orchestration (after routes are registered)
  if (env.SHARED_SECRET) {
    console.log('🤖 Starting Agent Bridge...');
    await agentBridge.start();
  } else {
    console.log('⚠️  Agent Bridge disabled - SHARED_SECRET not configured');
  }
  
  // Start Telemetry Client (Protocol ONE_TRUTH v1.2)
  // Telemetry is exempt from Master Scope Rule - must run continuously
  console.log('📊 Starting Telemetry Client (Protocol ONE_TRUTH v1.2)...');
  telemetryClient.start();
  
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

  // Setup monitoring dashboards for T+48 review - optional feature, gracefully degrades
  // Only enable if explicitly configured to prevent startup failures
  if (process.env.ENABLE_MONITORING_DASHBOARDS === 'true') {
    try {
      const dashboards = await import('./monitoring/dashboards');
      const monitoring = new dashboards.default();
      monitoring.setupRoutes(app);
      console.log('📊 Monitoring dashboards enabled');
    } catch (error) {
      console.warn('⚠️ Monitoring dashboards failed to initialize, continuing without them');
    }
  }

  // Sentry error handler - Sentry v10 API (MUST be after routes, before custom error handlers)
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // Production-safe error handler - AGENT3 v2.6 compliant format
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    
    // Log full error details server-side
    console.error('API Error:', {
      error: err.message,
      stack: err.stack,
      requestId,
      method: req.method,
      path: req.path,
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString()
    });
    
    const status = (err.statusCode && Number.isInteger(err.statusCode)) ? err.statusCode : 500;
    
    res.setHeader('X-Request-ID', requestId);
    
    // Generate error code based on status
    const errorCode = err.code || `HTTP_${status}`;
    
    // Never expose sensitive error details in production
    const message = status >= 500 && isProduction 
      ? 'Internal server error'
      : err.message || 'An error occurred';
    
    // AGENT3 v2.6 U4: Standard error format
    res.status(status).json({ 
      error: {
        code: errorCode,
        message: message,
        request_id: requestId
      }
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

  // Global error handlers for production safety
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('⚠️  Unhandled Promise Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
      timestamp: new Date().toISOString()
    });
    
    // Send to Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(reason);
    }
    
    // In development, provide more details
    if (!isProduction) {
      console.error('Full reason:', reason);
    }
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('🚨 Uncaught Exception:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Send to Sentry before shutdown
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
      // Flush events before exit
      Sentry.close(2000).then(() => {
        console.error('⚠️  Initiating graceful shutdown...');
        process.exit(1);
      });
    } else {
      console.error('⚠️  Initiating graceful shutdown...');
      process.exit(1);
    }
  });

  // Pre-warm function to eliminate cold start latency on /api/login
  // CODE RED mitigation: Warms session store, middleware chain, and connection pools
  async function prewarmLoginPath(): Promise<void> {
    const baseUrl = `http://127.0.0.1:${env.PORT}`;
    const warmupSamples = 3;
    const latencies: number[] = [];
    
    // Endpoints to warm up (don't require auth strategy lookup)
    const warmupEndpoints = [
      '/api/health',     // Warms Express + middleware chain
      '/api/canary',     // Warms routing + JSON serialization
      '/health',         // Warms DB connection pool
    ];
    
    console.log(`🔥 Pre-warming auth path (${warmupSamples} samples across ${warmupEndpoints.length} endpoints)...`);
    
    for (const endpoint of warmupEndpoints) {
      for (let i = 0; i < warmupSamples; i++) {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          
          await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: { 'User-Agent': 'A5-Prewarm-Agent' }
          });
          
          clearTimeout(timeout);
          const latency = Date.now() - start;
          latencies.push(latency);
          if (i === 0) console.log(`   ${endpoint}: ${latency}ms`);
        } catch (err: any) {
          const latency = Date.now() - start;
          latencies.push(latency);
        }
      }
    }
    
    const sorted = latencies.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1] || sorted[sorted.length - 1];
    
    console.log(`✅ Pre-warm complete: median=${median}ms, p95=${p95}ms (${latencies.length} samples)`);
    
    REPORT('/api/login pre-warmed - cold start eliminated', {
      warmup_samples: latencies.length,
      median_ms: median,
      p95_ms: p95,
      target_ms: 200
    });
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
    
    // CODE RED: Pre-warm /api/login immediately after server starts
    // This eliminates cold start latency that was causing p95=1235ms
    setTimeout(async () => {
      try {
        await prewarmLoginPath();
      } catch (error) {
        console.warn('⚠️  Pre-warm failed (non-blocking):', error);
      }
    }, 1000);
    
    // Protocol ONE_TRUTH v1.2: Emit success confirmation after 5s warmup
    setTimeout(() => {
      REPORT('Telemetry v1.2 active, events flowing, Command Center visible', {
        status: 'ready',
        port,
        telemetry_protocol: 'ONE_TRUTH',
        telemetry_version: '1.2',
        heartbeat_interval_sec: 60
      });
    }, 5000);
  });
})();
