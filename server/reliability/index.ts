/**
 * Enterprise Reliability Manager - Task perf-5
 * 
 * Coordinates circuit breakers for all external services and provides
 * centralized reliability patterns including graceful degradation.
 */

import { 
  createOpenAICircuitBreaker,
  createStorageCircuitBreaker,
  createDatabaseCircuitBreaker,
  createStripeCircuitBreaker,
  createAgentBridgeCircuitBreaker,
  CircuitBreaker
} from './circuitBreaker';

/**
 * Enterprise Reliability Manager
 */
export class ReliabilityManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor() {
    // Initialize all circuit breakers
    this.circuitBreakers.set('openai', createOpenAICircuitBreaker());
    this.circuitBreakers.set('storage', createStorageCircuitBreaker());
    this.circuitBreakers.set('database', createDatabaseCircuitBreaker());
    this.circuitBreakers.set('stripe', createStripeCircuitBreaker());
    this.circuitBreakers.set('agent-bridge', createAgentBridgeCircuitBreaker());

    this.setupEventHandlers();
  }

  /**
   * Get circuit breaker for a service
   */
  getCircuitBreaker(serviceName: string): CircuitBreaker | null {
    return this.circuitBreakers.get(serviceName) || null;
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async executeWithProtection<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    
    if (!circuitBreaker) {
      console.warn(`No circuit breaker found for service: ${serviceName}`);
      return operation();
    }

    return circuitBreaker.executeWithRetry(operation, fallback);
  }

  /**
   * Get health status of all services
   */
  getServiceHealth(): Record<string, any> {
    const health: Record<string, any> = {};
    
    for (const [serviceName, circuitBreaker] of Array.from(this.circuitBreakers.entries())) {
      health[serviceName] = {
        ...circuitBreaker.getStats(),
        healthy: circuitBreaker.getState() !== 'OPEN'
      };
    }
    
    return health;
  }

  /**
   * Setup monitoring and alerting for circuit breakers
   */
  private setupEventHandlers(): void {
    for (const [serviceName, circuitBreaker] of Array.from(this.circuitBreakers.entries())) {
      circuitBreaker.on('circuit-opened', (data: any) => {
        console.error(`🚨 [ALERT] Circuit breaker OPENED for ${serviceName}:`, data);
      });

      circuitBreaker.on('state-change', (data: any) => {
        console.log(`🔄 Circuit breaker state changed for ${serviceName}: ${data.state}`);
      });

      circuitBreaker.on('fallback-used', (data: any) => {
        console.warn(`⚠️  Fallback used for ${serviceName} due to:`, data.originalError.message);
      });

      circuitBreaker.on('fallback-failed', (data: any) => {
        console.error(`❌ Fallback failed for ${serviceName}:`, data.fallbackError.message);
      });

      circuitBreaker.on('max-retries-exceeded', (data: any) => {
        console.error(`🔁 Max retries exceeded for ${serviceName} after ${data.attempts} attempts`);
      });
    }
  }
}

// Singleton instance
export const reliabilityManager = new ReliabilityManager();

// Export circuit breakers and types
export * from './circuitBreaker';