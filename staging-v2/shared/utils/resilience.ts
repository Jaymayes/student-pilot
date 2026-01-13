export interface BackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterFactor?: number;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenRequests?: number;
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  options: BackoffOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 4000,
    jitterFactor = 0.3
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      
      if (attempt === maxRetries) {
        break;
      }

      const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitter = exponentialDelay * jitterFactor * Math.random();
      const delay = exponentialDelay + jitter;

      console.log(`[Backoff] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailure: number = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeoutMs: options.resetTimeoutMs ?? 30000,
      halfOpenRequests: options.halfOpenRequests ?? 3
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure >= this.options.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.successes = 0;
        console.log(`[CircuitBreaker:${this.name}] Transitioning to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.options.halfOpenRequests) {
        this.state = 'CLOSED';
        this.failures = 0;
        console.log(`[CircuitBreaker:${this.name}] Transitioning to CLOSED`);
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.state === 'HALF_OPEN' || this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
      console.log(`[CircuitBreaker:${this.name}] Transitioning to OPEN (failures: ${this.failures})`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

export async function fetchWithResilience<T>(
  url: string,
  options: RequestInit & { backoff?: BackoffOptions; circuitBreaker?: CircuitBreaker } = {}
): Promise<T> {
  const { backoff, circuitBreaker, ...fetchOptions } = options;

  const doFetch = async (): Promise<T> => {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  };

  const withRetry = backoff ? () => withBackoff(doFetch, backoff) : doFetch;
  return circuitBreaker ? circuitBreaker.execute(withRetry) : withRetry();
}
