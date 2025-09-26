/**
 * Server-Side Circuit Breaker Implementation - Task perf-5
 * 
 * Provides enterprise-grade reliability patterns for external service dependencies:
 * - Circuit breaker with configurable failure thresholds
 * - Exponential backoff retry logic
 * - Graceful degradation and fallback handling
 * - Timeout protection and request monitoring
 */

import { EventEmitter } from 'events';
import { metricsCollector } from '../monitoring/metrics';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  timeout: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
}

/**
 * Enterprise Circuit Breaker for External Services
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private lastRetryTime: number = 0;
  private nextRetryTime: number = 0;

  constructor(
    private readonly config: CircuitBreakerConfig,
    private readonly retryConfig: RetryConfig
  ) {
    super();
    this.setupMonitoring();
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Check circuit state
      if (this.state === 'OPEN') {
        if (Date.now() < this.nextRetryTime) {
          throw new CircuitBreakerError(
            `Circuit breaker is OPEN for ${this.config.name}. Next retry in ${this.nextRetryTime - Date.now()}ms`,
            'CIRCUIT_OPEN'
          );
        }
        this.state = 'HALF_OPEN';
        this.emit('state-change', { name: this.config.name, state: 'HALF_OPEN' });
      }

      // Execute with timeout protection
      const result = await this.executeWithTimeout(operation);
      
      // Record success
      this.onSuccess();
      
      // Record metrics
      metricsCollector.recordExternalApiCall(this.config.name, Date.now() - startTime, true);
      
      return result;
      
    } catch (error) {
      // Record failure
      this.onFailure();
      
      // Record metrics
      metricsCollector.recordExternalApiCall(this.config.name, Date.now() - startTime, false);
      
      // Attempt fallback if available
      if (fallback && this.shouldUseFallback(error)) {
        try {
          const fallbackResult = await fallback();
          this.emit('fallback-used', { name: this.config.name, originalError: error });
          return fallbackResult;
        } catch (fallbackError) {
          this.emit('fallback-failed', { name: this.config.name, originalError: error, fallbackError });
        }
      }
      
      throw error;
    }
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateBackoff(attempt);
          await this.sleep(delay);
        }
        
        return await this.execute(operation, fallback);
        
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry non-retriable errors
        if (!this.isRetriableError(error)) {
          throw error;
        }
        
        // Don't retry if circuit is open
        if (error instanceof CircuitBreakerError && error.code === 'CIRCUIT_OPEN') {
          throw error;
        }
        
        if (attempt === this.retryConfig.maxRetries) {
          this.emit('max-retries-exceeded', { 
            name: this.config.name, 
            attempts: attempt + 1, 
            error: lastError 
          });
        }
      }
    }
    
    throw lastError!;
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(`Operation timed out after ${this.config.timeout}ms for ${this.config.name}`));
      }, this.config.timeout);

      try {
        const result = await operation();
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  private onSuccess(): void {
    this.successes++;
    this.failures = 0; // Reset failure count on success
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.emit('state-change', { name: this.config.name, state: 'CLOSED' });
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'CLOSED' && this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextRetryTime = Date.now() + this.config.recoveryTimeout;
      this.emit('state-change', { name: this.config.name, state: 'OPEN' });
      this.emit('circuit-opened', { 
        name: this.config.name, 
        failures: this.failures,
        nextRetry: this.nextRetryTime 
      });
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextRetryTime = Date.now() + this.config.recoveryTimeout;
      this.emit('state-change', { name: this.config.name, state: 'OPEN' });
    }
  }

  private calculateBackoff(attempt: number): number {
    const exponentialDelay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.exponentialBase, attempt - 1),
      this.retryConfig.maxDelay
    );
    
    if (this.retryConfig.jitter) {
      // Add ±25% jitter to prevent thundering herd
      const jitterRange = exponentialDelay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(0, exponentialDelay + jitter);
    }
    
    return exponentialDelay;
  }

  private isRetriableError(error: any): boolean {
    // Network errors and 5xx server errors are retriable
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEOUT') {
      return true;
    }
    
    if (error.status && error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // Rate limiting (429) is retriable with backoff
    if (error.status === 429) {
      return true;
    }
    
    return false;
  }

  private shouldUseFallback(error: any): boolean {
    // Use fallback for service unavailable or timeout errors
    return error instanceof TimeoutError || 
           error.status === 503 || 
           error.code === 'ECONNREFUSED';
  }

  private setupMonitoring(): void {
    setInterval(() => {
      this.emit('health-check', {
        name: this.config.name,
        state: this.state,
        failures: this.failures,
        successes: this.successes,
        lastFailureTime: this.lastFailureTime
      });
    }, this.config.monitoringPeriod);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Getters for monitoring
  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.nextRetryTime
    };
  }
}

/**
 * Custom error classes for circuit breaker
 */
export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Pre-configured circuit breakers for different service types
 */
export const createOpenAICircuitBreaker = () => new CircuitBreaker(
  {
    name: 'openai',
    failureThreshold: 3,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
    timeout: 60000 // 60 seconds for AI operations
  },
  {
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2,
    jitter: true
  }
);

export const createStorageCircuitBreaker = () => new CircuitBreaker(
  {
    name: 'storage',
    failureThreshold: 5,
    recoveryTimeout: 15000, // 15 seconds
    monitoringPeriod: 60000,
    timeout: 30000 // 30 seconds for storage operations
  },
  {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    exponentialBase: 2,
    jitter: true
  }
);

export const createDatabaseCircuitBreaker = () => new CircuitBreaker(
  {
    name: 'database',
    failureThreshold: 10,
    recoveryTimeout: 5000, // 5 seconds
    monitoringPeriod: 30000,
    timeout: 15000 // 15 seconds for database operations
  },
  {
    maxRetries: 2,
    baseDelay: 200,
    maxDelay: 2000,
    exponentialBase: 2,
    jitter: true
  }
);

export const createStripeCircuitBreaker = () => new CircuitBreaker(
  {
    name: 'stripe',
    failureThreshold: 3,
    recoveryTimeout: 60000, // 1 minute - payment errors need careful handling
    monitoringPeriod: 60000,
    timeout: 30000 // 30 seconds for payment operations
  },
  {
    maxRetries: 1, // Be conservative with payment retries
    baseDelay: 2000,
    maxDelay: 5000,
    exponentialBase: 2,
    jitter: false // No jitter for payment operations
  }
);

export const createAgentBridgeCircuitBreaker = () => new CircuitBreaker(
  {
    name: 'agent-bridge',
    failureThreshold: 5,
    recoveryTimeout: 20000, // 20 seconds
    monitoringPeriod: 60000,
    timeout: 45000 // 45 seconds for agent operations
  },
  {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    exponentialBase: 2,
    jitter: true
  }
);