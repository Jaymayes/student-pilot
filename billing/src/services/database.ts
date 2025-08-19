// Database service with Prisma client

import { PrismaClient } from '@prisma/client';
import { appConfig } from '@/config';
import pino from 'pino';

const logger = pino({ name: 'database' });

// Create Prisma client with logging configuration
export const prisma = new PrismaClient({
  log: appConfig.isDevelopment 
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
  datasources: {
    db: {
      url: appConfig.DATABASE_URL,
    },
  },
});

/**
 * Initialize database connection and run health checks
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    
    // Run a simple query to verify connection
    await prisma.user.count();
    
    logger.info('Database connection established');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error({ error }, 'Error closing database connection');
    throw error;
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return false;
  }
}

/**
 * Transaction wrapper with retry logic
 */
export async function withTransaction<T>(
  operation: (tx: PrismaClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        return await operation(tx);
      }, {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      });
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable (deadlock, connection issues, etc.)
      if (
        attempt < maxRetries && 
        (error as Error).message.includes('deadlock') ||
        (error as Error).message.includes('connection')
      ) {
        logger.warn(
          { attempt, error: error as Error }, 
          'Transaction failed, retrying'
        );
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt - 1) * 100)
        );
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError!;
}