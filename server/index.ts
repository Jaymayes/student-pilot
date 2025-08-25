import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { env, isProduction } from "./environment";
import * as crypto from "crypto";

const app = express();

// Configure EJS for server-side rendering
app.set('view engine', 'ejs');
app.set('views', path.join(import.meta.dirname, 'views'));

// Enable compression for better performance
app.use(compression());

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

// CSP in report-only mode initially
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://js.stripe.com"],
    frameSrc: ["'self'", "https://js.stripe.com"],
    connectSrc: [
      "'self'", 
      "https://api.stripe.com", 
      "https://api.openai.com",
      "https://storage.googleapis.com"
    ],
    imgSrc: ["'self'", "data:", "https:"],
    objectSrc: ["'none'"]
  },
  reportOnly: true // Start with report-only
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

// Body parsing with size limits
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Global BigInt serialization for JSON responses
app.set('json replacer', (_key: string, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
});

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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
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
  const server = await registerRoutes(app);

  // Setup monitoring dashboards for T+48 review
  const dashboards = await import('./monitoring/dashboards.js');
  const monitoring = new dashboards.default();
  monitoring.setupRoutes(app);

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
