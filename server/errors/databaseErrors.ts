/**
 * Database Error Classification and Handling - QA-011 Implementation
 * 
 * Implements comprehensive error handling for async database operations
 * with proper error classification, retry logic, and circuit breaker patterns.
 */

import { secureLogger } from '../logging/secureLogger';

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(operation: string, originalError?: Error) {
    super('Database connection failed', operation, originalError, true);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseConstraintError extends DatabaseError {
  constructor(operation: string, constraint: string, originalError?: Error) {
    super(`Database constraint violation: ${constraint}`, operation, originalError, false);
    this.name = 'DatabaseConstraintError';
  }
}

export class DatabaseTimeoutError extends DatabaseError {
  constructor(operation: string, originalError?: Error) {
    super('Database operation timed out', operation, originalError, true);
    this.name = 'DatabaseTimeoutError';
  }
}

export class DatabaseNotFoundError extends DatabaseError {
  constructor(operation: string, resource: string, originalError?: Error) {
    super(`Resource not found: ${resource}`, operation, originalError, false);
    this.name = 'DatabaseNotFoundError';
  }
}

/**
 * Circuit breaker for database operations
 */
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new DatabaseError(
          'Circuit breaker is OPEN',
          operationName,
          undefined,
          true
        );
      } else {
        this.state = 'HALF_OPEN';
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      secureLogger.error('Circuit breaker opened due to consecutive failures', undefined, {
        failures: this.failures,
        threshold: this.threshold
      });
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Retry logic with exponential backoff
 */
export class RetryManager {
  constructor(
    private readonly maxRetries: number = 3,
    private readonly baseDelay: number = 1000,
    private readonly maxDelay: number = 10000
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
    isRetryable: (error: any) => boolean = this.isRetryableError
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on last attempt or non-retryable errors
        if (attempt > this.maxRetries || !isRetryable(error)) {
          throw error;
        }
        
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt - 1),
          this.maxDelay
        );
        
        secureLogger.warn('Database operation failed, retrying', {
          operation: operationName,
          attempt,
          maxRetries: this.maxRetries,
          retryDelay: delay,
          error: error instanceof Error ? error.message : String(error)
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof DatabaseError) {
      return error.retryable;
    }
    
    // Check for common retryable database errors
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;
    
    // Connection errors
    if (errorCode === 'ECONNRESET' || 
        errorCode === 'ECONNREFUSED' || 
        errorCode === 'ETIMEOUT' ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout')) {
      return true;
    }
    
    // PostgreSQL transient errors
    if (errorCode === '40001' || // serialization_failure
        errorCode === '40P01' || // deadlock_detected
        errorCode === '53300' || // too_many_connections
        errorCode === '57P03') { // cannot_connect_now
      return true;
    }
    
    return false;
  }
}

// Global circuit breaker and retry manager instances
export const dbCircuitBreaker = new CircuitBreaker(5, 30000);
export const dbRetryManager = new RetryManager(3, 1000, 10000);

/**
 * Enhanced database operation wrapper with error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  correlationId?: string
): Promise<T> {
  try {
    return await dbRetryManager.execute(
      () => dbCircuitBreaker.execute(operation, operationName),
      operationName
    );
  } catch (error) {
    const dbError = classifyDatabaseError(error, operationName);
    
    secureLogger.error(
      `Database operation failed: ${operationName}`,
      dbError,
      {
        correlationId,
        operation: operationName,
        retryable: dbError.retryable,
        circuitBreakerState: dbCircuitBreaker.getState().state
      }
    );
    
    throw dbError;
  }
}

/**
 * Classify database errors into appropriate error types
 */
function classifyDatabaseError(error: any, operation: string): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code;
  
  // Connection errors
  if (errorCode === 'ECONNRESET' || 
      errorCode === 'ECONNREFUSED' || 
      errorMessage.includes('connection')) {
    return new DatabaseConnectionError(operation, error);
  }
  
  // Timeout errors
  if (errorCode === 'ETIMEOUT' || errorMessage.includes('timeout')) {
    return new DatabaseTimeoutError(operation, error);
  }
  
  // Constraint violations
  if (errorCode === '23505' || // unique_violation
      errorCode === '23503' || // foreign_key_violation
      errorCode === '23502' || // not_null_violation
      errorCode === '23514' || // check_violation
      errorMessage.includes('constraint') ||
      errorMessage.includes('duplicate') ||
      errorMessage.includes('violates')) {
    return new DatabaseConstraintError(operation, errorCode || 'unknown', error);
  }
  
  // Not found errors (when expecting single result)
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return new DatabaseNotFoundError(operation, 'record', error);
  }
  
  // Generic database error
  return new DatabaseError(
    error.message || 'Unknown database error',
    operation,
    error,
    false
  );
}