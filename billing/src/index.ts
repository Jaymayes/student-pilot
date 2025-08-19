// ScholarLink Billing Service - Main Application Entry Point

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import pino from 'pino';
import swaggerUi from 'swagger-ui-express';

import { appConfig } from '@/config';
import { initializeDatabase, closeDatabase } from '@/services/database';
import { setupAuth } from '@/middleware/auth';
import { setupValidation } from '@/middleware/validation';
import { setupSecurity } from '@/middleware/security';
import { setupRoutes } from './routes';
import { generateSwaggerSpec } from './docs/swagger';

// Create logger
const logger = pino({ 
  name: 'billing-service',
  level: appConfig.LOG_LEVEL 
});

// Create Express app
const app = express();

// Trust proxy for rate limiting in production
if (appConfig.isProduction) {
  app.set('trust proxy', 1);
}

// Setup middleware
app.use(helmet({
  contentSecurityPolicy: appConfig.isProduction ? undefined : false
}));

app.use(cors({
  origin: appConfig.corsAllowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
app.use(pinoHttp({ 
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
    if (res.statusCode >= 500 || err) return 'error';
    return 'info';
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: appConfig.RATE_LIMIT_WINDOW_MS,
  max: appConfig.RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Setup custom middleware
setupAuth(app);
setupValidation(app);
setupSecurity(app);

// Health checks
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/readyz', async (req, res) => {
  try {
    // Check database connectivity
    const { checkDatabaseHealth } = await import('@/services/database');
    const dbHealthy = await checkDatabaseHealth();
    
    if (!dbHealthy) {
      return res.status(503).json({ status: 'not ready', reason: 'database unhealthy' });
    }

    // Check rate card availability
    const { getRateCard } = await import('@/services/rateCardService');
    const rateCard = await getRateCard(appConfig.RATE_CARD_VERSION);
    
    if (!rateCard) {
      return res.status(503).json({ status: 'not ready', reason: 'rate card not loaded' });
    }

    res.status(200).json({ 
      status: 'ready', 
      timestamp: new Date().toISOString(),
      rateCardVersion: rateCard.version 
    });
  } catch (error) {
    logger.error({ error }, 'Readiness check failed');
    res.status(503).json({ status: 'not ready', error: 'internal error' });
  }
});

// Metrics endpoint (basic implementation)
app.get('/metrics', (req, res) => {
  // TODO: Implement Prometheus metrics
  res.set('Content-Type', 'text/plain');
  res.send(`# HELP billing_service_info Billing service information
# TYPE billing_service_info gauge
billing_service_info{version="1.0.0"} 1
`);
});

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(generateSwaggerSpec()));

// API Routes
setupRoutes(app);

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || 'unknown';
  
  logger.error({ 
    error: error.message, 
    stack: error.stack, 
    correlationId,
    path: req.path,
    method: req.method 
  }, 'Unhandled error');

  if (appConfig.isProduction) {
    res.status(500).json({ 
      error: 'Internal server error', 
      correlationId 
    });
  } else {
    res.status(500).json({ 
      error: error.message, 
      stack: error.stack, 
      correlationId 
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal');
  
  try {
    await closeDatabase();
    logger.info('Application shut down gracefully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Ensure rate card is loaded
    const { ensureRateCardExists } = await import('@/services/rateCardService');
    await ensureRateCardExists();
    
    // Start listening
    const server = app.listen(appConfig.PORT, () => {
      logger.info({ 
        port: appConfig.PORT, 
        environment: appConfig.NODE_ENV 
      }, 'Billing service started');
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error({ error }, 'Server error');
      process.exit(1);
    });

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  startServer();
}

export { app };