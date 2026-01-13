# Backoff & Circuit Breaker Usage Examples

## Overview

The `resilience.ts` module provides two core patterns for handling transient failures:

1. **Exponential Backoff with Jitter** - Retry failed operations with increasing delays
2. **Circuit Breaker** - Prevent cascading failures by failing fast when a service is down

---

## Exponential Backoff

### Basic Usage

```typescript
import { withBackoff } from './resilience';

// Retry up to 3 times with exponential delays (1s, 2s, 4s)
const result = await withBackoff(async () => {
  const response = await fetch('https://api.example.com/data');
  if (!response.ok) throw new Error('API error');
  return response.json();
});
```

### Custom Configuration

```typescript
const result = await withBackoff(
  async () => {
    return await someApiCall();
  },
  {
    maxRetries: 5,        // Default: 3
    baseDelayMs: 500,     // Default: 1000
    maxDelayMs: 8000,     // Default: 4000
    jitterFactor: 0.5     // Default: 0.3 (30% randomization)
  }
);
```

---

## Circuit Breaker

### Basic Usage

```typescript
import { CircuitBreaker } from './resilience';

const openAiBreaker = new CircuitBreaker('openai', {
  failureThreshold: 5,    // Open after 5 consecutive failures
  resetTimeoutMs: 30000,  // Try again after 30 seconds
  halfOpenRequests: 3     // Need 3 successes to fully close
});

try {
  const response = await openAiBreaker.execute(async () => {
    return await callOpenAI(prompt);
  });
} catch (err) {
  if (err.message.includes('is OPEN')) {
    // Service is known to be down, fail fast
    return fallbackResponse;
  }
  throw err;
}
```

### State Monitoring

```typescript
const state = openAiBreaker.getState();
// Returns: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
```

---

## Combined Pattern (Recommended)

```typescript
import { fetchWithResilience, CircuitBreaker } from './resilience';

const stripeBreaker = new CircuitBreaker('stripe');

const customer = await fetchWithResilience<StripeCustomer>(
  'https://api.stripe.com/v1/customers',
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ email }),
    backoff: { maxRetries: 3, baseDelayMs: 500 },
    circuitBreaker: stripeBreaker
  }
);
```

---

## Service-Specific Configurations

### DataService → Orchestrator

```typescript
const dataServiceBreaker = new CircuitBreaker('dataservice', {
  failureThreshold: 3,
  resetTimeoutMs: 15000
});

const user = await fetchWithResilience('/users/123', {
  headers: { 'X-API-Key': process.env.DATASERVICE_API_KEY },
  backoff: { maxRetries: 3, baseDelayMs: 1000 },
  circuitBreaker: dataServiceBreaker
});
```

### Orchestrator → OpenAI

```typescript
const openAiBreaker = new CircuitBreaker('openai', {
  failureThreshold: 5,
  resetTimeoutMs: 60000  // Longer timeout for rate limits
});

const analysis = await openAiBreaker.execute(async () => {
  return withBackoff(async () => {
    const response = await openai.chat.completions.create({...});
    return response.choices[0].message.content;
  }, { maxRetries: 2, baseDelayMs: 2000 });
});
```

---

## Telemetry Integration

Log circuit breaker state changes to A8:

```typescript
const breaker = new CircuitBreaker('external-api');

// Wrap with telemetry
const executeWithTelemetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  const prevState = breaker.getState();
  try {
    const result = await breaker.execute(fn);
    const newState = breaker.getState();
    if (prevState !== newState) {
      await logToA8({ event: 'circuit_state_change', from: prevState, to: newState });
    }
    return result;
  } catch (err) {
    await logToA8({ event: 'circuit_failure', state: breaker.getState() });
    throw err;
  }
};
```
