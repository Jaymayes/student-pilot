// Database connection and utility functions

import { PrismaClient } from '@prisma/client';
import { appConfig } from '@/config';
import pino from 'pino';

const logger = pino({ name: 'database' });

// Create Prisma client with proper configuration
export const prisma = new PrismaClient({
  log: appConfig.isProduction ? ['warn', 'error'] : ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: appConfig.DATABASE_URL,
    },
  },
});

/**
 * Connect to database and handle errors
 */
export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from database');
  }
}

/**
 * Transaction wrapper for safe database operations
 */
export async function withTransaction<T>(
  operation: (tx: any) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    return await operation(tx);
  });
}

/**
 * Health check for database
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
 * Initialize database (run migrations if needed)
 */
export async function initializeDatabase() {
  try {
    logger.info('Initializing database...');
    await connectDatabase();
    
    // Check if database is accessible
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }
    
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize database');
    throw error;
  }
}

// Export Prisma client for direct use
export default prisma;