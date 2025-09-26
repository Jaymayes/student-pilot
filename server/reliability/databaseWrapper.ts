/**
 * Database Operations Circuit Breaker Wrapper - Task perf-5
 * 
 * Provides circuit breaker protection for all database operations,
 * ensuring resilience against Neon database connection issues.
 */

import { reliabilityManager } from './index';

/**
 * Wrap database operations with circuit breaker protection
 */
export async function withDatabaseProtection<T>(
  operation: () => Promise<T>,
  operationName = 'database_operation'
): Promise<T> {
  return reliabilityManager.executeWithProtection(
    'database',
    operation,
    async () => {
      // Graceful degradation for database failures
      console.warn(`Database operation '${operationName}' failed, using fallback`);
      throw new Error(`Database temporarily unavailable for ${operationName}. Please try again later.`);
    }
  );
}

/**
 * Enhanced database wrapper with more specific error handling
 */
export async function withDatabaseProtectionAndFallback<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T>,
  operationName = 'database_operation'
): Promise<T> {
  return reliabilityManager.executeWithProtection(
    'database',
    operation,
    fallback
  );
}