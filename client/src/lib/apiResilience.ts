/**
 * API Client Resilience - QA-023 Implementation
 * 
 * Implements comprehensive client-side resilience patterns including:
 * - Retry logic with exponential backoff
 * - Circuit breaker for failed endpoints
 * - Request timeout handling
 * - Network error classification
 */

// Error classification for determining retry strategy
export class APIError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable: boolean = false,
    public readonly endpoint?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends APIError {
  constructor(endpoint?: string, originalError?: Error) {
    super(
      'Network connection failed', 
      undefined, 
      true, // Network errors are retryable
      endpoint
    );
    this.name = 'NetworkError';
    this.cause = originalError;
  }
}

export class TimeoutError extends APIError {
  constructor(endpoint?: string) {
    super(
      'Request timed out', 
      408, 
      true, // Timeout errors are retryable
      endpoint
    );
    this.name = 'TimeoutError';
  }
}

export class ServerError extends APIError {
  constructor(status: number, message: string, endpoint?: string) {
    super(
      message, 
      status, 
      status >= 500 && status < 600, // 5xx errors are retryable
      endpoint
    );
    this.name = 'ServerError';
  }
}

export class ClientError extends APIError {
  constructor(status: number, message: string, endpoint?: string) {
    super(
      message, 
      status, 
      false, // 4xx errors are not retryable (except 429)
      endpoint
    );
    this.name = 'ClientError';
  }
}

/**
 * Frontend Circuit Breaker for API endpoints
 */
class APICircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailure = new Map<string, number>();
  private state = new Map<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>();
  
  constructor(
    private readonly threshold: number = 3, // Lower threshold for frontend
    private readonly timeout: number = 30000 // 30 seconds recovery time
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    const currentState = this.state.get(endpoint) || 'CLOSED';
    const failures = this.failures.get(endpoint) || 0;
    const lastFailure = this.lastFailure.get(endpoint) || 0;

    if (currentState === 'OPEN') {
      if (Date.now() - lastFailure < this.timeout) {
        throw new APIError(
          `Circuit breaker is OPEN for ${endpoint}`,
          503,
          false,
          endpoint
        );
      } else {
        this.state.set(endpoint, 'HALF_OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess(endpoint);
      return result;
    } catch (error) {
      this.onFailure(endpoint);
      throw error;
    }
  }

  private onSuccess(endpoint: string): void {
    this.failures.set(endpoint, 0);
    this.state.set(endpoint, 'CLOSED');
  }

  private onFailure(endpoint: string): void {
    const currentFailures = (this.failures.get(endpoint) || 0) + 1;
    this.failures.set(endpoint, currentFailures);
    this.lastFailure.set(endpoint, Date.now());
    
    if (currentFailures >= this.threshold) {
      this.state.set(endpoint, 'OPEN');
      console.warn(`Circuit breaker OPENED for endpoint: ${endpoint}`, {
        failures: currentFailures,
        threshold: this.threshold
      });
    }
  }

  getStats(): { endpoint: string; state: string; failures: number }[] {
    const stats: { endpoint: string; state: string; failures: number }[] = [];
    const stateEndpoints = Array.from(this.state.keys());
    const failureEndpoints = Array.from(this.failures.keys());
    const allEndpoints = new Set([...stateEndpoints, ...failureEndpoints]);
    
    allEndpoints.forEach((endpoint) => {
      stats.push({
        endpoint,
        state: this.state.get(endpoint) || 'CLOSED',
        failures: this.failures.get(endpoint) || 0
      });
    });
    
    return stats;
  }
}

/**
 * Retry manager with exponential backoff for frontend API calls
 */
class APIRetryManager {
  constructor(
    private readonly maxRetries: number = 2, // Conservative for frontend
    private readonly baseDelay: number = 500, // Faster initial retry
    private readonly maxDelay: number = 5000   // Reasonable max for UX
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    endpoint: string,
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
          this.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100, // Add jitter
          this.maxDelay
        );
        
        console.log(`API call failed, retrying in ${delay}ms`, {
          endpoint,
          attempt,
          maxRetries: this.maxRetries,
          error: error instanceof Error ? error.message : String(error)
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof APIError) {
      return error.retryable;
    }
    
    // Network-level errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true; // Network failures
    }
    
    if (error.name === 'AbortError') {
      return true; // Request timeouts
    }
    
    // HTTP status-based retry logic
    if (error.status) {
      return error.status === 429 || // Rate limited
             error.status === 502 || // Bad gateway
             error.status === 503 || // Service unavailable
             error.status === 504;   // Gateway timeout
    }
    
    return false;
  }
}

// Global instances
export const apiCircuitBreaker = new APICircuitBreaker(3, 30000);
export const apiRetryManager = new APIRetryManager(2, 500, 5000);

/**
 * Enhanced fetch wrapper with resilience patterns
 */
export async function resilientFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000 // 10 second timeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  const fetchOptions: RequestInit = {
    ...options,
    signal: controller.signal,
  };

  try {
    return await apiRetryManager.execute(
      () => apiCircuitBreaker.execute(
        async () => {
          const response = await fetch(url, fetchOptions);
          
          if (!response.ok) {
            const errorMessage = await response.text().catch(() => 'Unknown error');
            
            if (response.status >= 400 && response.status < 500) {
              throw new ClientError(response.status, errorMessage, url);
            } else if (response.status >= 500) {
              throw new ServerError(response.status, errorMessage, url);
            }
          }
          
          return response;
        },
        url
      ),
      url
    );
  } catch (error: unknown) {
    const err = error as Error;
    if (err.name === 'AbortError') {
      throw new TimeoutError(url);
    }
    if (err instanceof TypeError) {
      throw new NetworkError(url, err);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resilient API request wrapper for JSON APIs
 */
export async function resilientApiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await resilientFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new APIError(errorText, response.status, false, url);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  
  return await response.text();
}

/**
 * Utility to check circuit breaker health
 */
export function getAPIHealthStats() {
  return {
    circuitBreakerStats: apiCircuitBreaker.getStats(),
    timestamp: new Date().toISOString()
  };
}