/**
 * External Health Client - Graceful degradation for ecosystem service checks
 * 
 * Implements A5-side integrations for:
 * - Issue A: A2 /ready endpoint fallback (use /health if /ready unavailable)
 * - Issue B: A7 async response handling (202 Accepted pattern)
 * 
 * Feature flags:
 * - EXTERNAL_HEALTH_TIMEOUT_MS: Timeout for health checks (default: 5000)
 * - EXTERNAL_HEALTH_CACHE_TTL_MS: Cache TTL for health status (default: 30000)
 */

import { serviceConfig } from '../serviceConfig';

interface HealthCheckResult {
  app: string;
  healthy: boolean;
  status: number | null;
  latencyMs: number;
  endpoint: string;
  fallback: boolean;
  cachedAt?: number;
  error?: string;
}

interface CachedHealth {
  result: HealthCheckResult;
  expiresAt: number;
}

const TIMEOUT_MS = parseInt(process.env.EXTERNAL_HEALTH_TIMEOUT_MS || '5000', 10);
const CACHE_TTL_MS = parseInt(process.env.EXTERNAL_HEALTH_CACHE_TTL_MS || '30000', 10);

const healthCache = new Map<string, CachedHealth>();

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: string;
  headers?: Record<string, string>;
}

async function fetchWithTimeout(url: string, timeoutMs: number, options?: FetchOptions): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      method: options?.method || 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'A5-HealthClient/1.0',
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...options?.headers
      },
      ...(options?.body ? { body: options.body } : {})
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check A2 (scholarship_api) health with /ready -> /health fallback
 * Implements Issue A graceful degradation on client side
 */
export async function checkA2Health(): Promise<HealthCheckResult> {
  const cacheKey = 'a2';
  const cached = healthCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, cachedAt: cached.expiresAt - CACHE_TTL_MS };
  }
  
  const baseUrl = serviceConfig.services.api;
  if (!baseUrl) {
    return {
      app: 'A2',
      healthy: false,
      status: null,
      latencyMs: 0,
      endpoint: 'unconfigured',
      fallback: false,
      error: 'SCHOLARSHIP_API_BASE_URL not configured'
    };
  }
  
  const start = Date.now();
  let result: HealthCheckResult;
  
  try {
    const readyResponse = await fetchWithTimeout(`${baseUrl}/ready`, TIMEOUT_MS);
    const latencyMs = Date.now() - start;
    
    result = {
      app: 'A2',
      healthy: readyResponse.status === 200,
      status: readyResponse.status,
      latencyMs,
      endpoint: '/ready',
      fallback: false
    };
  } catch (readyError) {
    try {
      const healthResponse = await fetchWithTimeout(`${baseUrl}/health`, TIMEOUT_MS);
      const latencyMs = Date.now() - start;
      
      result = {
        app: 'A2',
        healthy: healthResponse.status === 200,
        status: healthResponse.status,
        latencyMs,
        endpoint: '/health',
        fallback: true
      };
    } catch (healthError) {
      const latencyMs = Date.now() - start;
      result = {
        app: 'A2',
        healthy: false,
        status: null,
        latencyMs,
        endpoint: 'unreachable',
        fallback: true,
        error: healthError instanceof Error ? healthError.message : 'Unknown error'
      };
    }
  }
  
  healthCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
  
  return result;
}

/**
 * Check A7 (auto_page_maker) health
 */
export async function checkA7Health(): Promise<HealthCheckResult> {
  const cacheKey = 'a7';
  const cached = healthCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, cachedAt: cached.expiresAt - CACHE_TTL_MS };
  }
  
  const baseUrl = serviceConfig.services.pageMaker;
  if (!baseUrl) {
    return {
      app: 'A7',
      healthy: false,
      status: null,
      latencyMs: 0,
      endpoint: 'unconfigured',
      fallback: false,
      error: 'AUTO_PAGE_MAKER_BASE_URL not configured'
    };
  }
  
  const start = Date.now();
  
  try {
    const response = await fetchWithTimeout(`${baseUrl}/health`, TIMEOUT_MS);
    const latencyMs = Date.now() - start;
    
    const result: HealthCheckResult = {
      app: 'A7',
      healthy: response.status === 200,
      status: response.status,
      latencyMs,
      endpoint: '/health',
      fallback: false
    };
    
    healthCache.set(cacheKey, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS
    });
    
    return result;
  } catch (error) {
    const latencyMs = Date.now() - start;
    const result: HealthCheckResult = {
      app: 'A7',
      healthy: false,
      status: null,
      latencyMs,
      endpoint: 'unreachable',
      fallback: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    healthCache.set(cacheKey, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS
    });
    
    return result;
  }
}

/**
 * Check A8 (auto_com_center) health
 */
export async function checkA8Health(): Promise<HealthCheckResult> {
  const cacheKey = 'a8';
  const cached = healthCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, cachedAt: cached.expiresAt - CACHE_TTL_MS };
  }
  
  const baseUrl = serviceConfig.services.comCenter;
  if (!baseUrl) {
    return {
      app: 'A8',
      healthy: false,
      status: null,
      latencyMs: 0,
      endpoint: 'unconfigured',
      fallback: false,
      error: 'AUTO_COM_CENTER_BASE_URL not configured'
    };
  }
  
  const start = Date.now();
  
  try {
    const response = await fetchWithTimeout(`${baseUrl}/health`, TIMEOUT_MS);
    const latencyMs = Date.now() - start;
    
    const result: HealthCheckResult = {
      app: 'A8',
      healthy: response.status === 200,
      status: response.status,
      latencyMs,
      endpoint: '/health',
      fallback: false
    };
    
    healthCache.set(cacheKey, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS
    });
    
    return result;
  } catch (error) {
    const latencyMs = Date.now() - start;
    const result: HealthCheckResult = {
      app: 'A8',
      healthy: false,
      status: null,
      latencyMs,
      endpoint: 'unreachable',
      fallback: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    healthCache.set(cacheKey, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS
    });
    
    return result;
  }
}

/**
 * Check all ecosystem dependencies health
 */
export async function checkAllDependencies(): Promise<{
  overall: boolean;
  dependencies: HealthCheckResult[];
}> {
  const results = await Promise.all([
    checkA2Health(),
    checkA7Health(),
    checkA8Health()
  ]);
  
  return {
    overall: results.every(r => r.healthy),
    dependencies: results
  };
}

/**
 * Clear health cache (for testing or manual refresh)
 */
export function clearHealthCache(): void {
  healthCache.clear();
}

/**
 * A7 Async Response Handler
 * Implements Issue B: Handle 202 Accepted responses from A7 async ingestion
 */
export interface A7IngestResult {
  status: 'accepted' | 'processed' | 'duplicate' | 'error';
  eventId?: string;
  idempotencyKey?: string;
  error?: string;
}

export async function ingestToA7(event: {
  id: string;
  source: string;
  type: string;
  data: Record<string, unknown>;
}): Promise<A7IngestResult> {
  const baseUrl = serviceConfig.services.pageMaker;
  
  if (!baseUrl) {
    console.warn('[A7Client] AUTO_PAGE_MAKER_BASE_URL not configured, skipping ingestion');
    return {
      status: 'error',
      error: 'A7 not configured'
    };
  }
  
  const idempotencyKey = `${event.source}:${event.id}`;
  
  try {
    const response = await fetchWithTimeout(`${baseUrl}/ingest`, TIMEOUT_MS, {
      method: 'POST',
      body: JSON.stringify({
        id: event.id,
        source: event.source,
        type: event.type,
        data: event.data,
        timestamp: new Date().toISOString()
      }),
      headers: {
        'X-Idempotency-Key': idempotencyKey
      }
    });
    
    if (response.status === 202) {
      const result = await response.json();
      return {
        status: 'accepted',
        eventId: result.id || event.id,
        idempotencyKey: result.idempotency_key || idempotencyKey
      };
    }
    
    if (response.status === 200) {
      const result = await response.json();
      if (result.status === 'duplicate') {
        return {
          status: 'duplicate',
          eventId: result.original_id || event.id
        };
      }
      return {
        status: 'processed',
        eventId: result.id || event.id
      };
    }
    
    const errorBody = await response.text().catch(() => '');
    return {
      status: 'error',
      error: `Unexpected status: ${response.status}${errorBody ? ` - ${errorBody.substring(0, 100)}` : ''}`
    };
  } catch (error) {
    console.error('[A7Client] Ingestion failed:', error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Poll A7 for event processing status
 * Use after receiving 202 Accepted if confirmation is needed
 */
export async function pollA7EventStatus(eventId: string, maxAttempts = 5, delayMs = 1000): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown';
  processedAt?: string;
  error?: string;
}> {
  const baseUrl = serviceConfig.services.pageMaker;
  
  if (!baseUrl) {
    return { status: 'unknown', error: 'A7 not configured' };
  }
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/ingest/${eventId}/status`, TIMEOUT_MS);
      
      if (response.status === 200) {
        const result = await response.json();
        
        if (result.status === 'completed') {
          return {
            status: 'completed',
            processedAt: result.processed_at
          };
        }
        
        if (result.status === 'failed') {
          return {
            status: 'failed',
            error: result.error
          };
        }
        
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        
        return { status: result.status };
      }
      
      if (response.status === 404) {
        return { status: 'unknown', error: 'Event not found' };
      }
      
      return { status: 'unknown', error: `Unexpected status: ${response.status}` };
    } catch (error) {
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      return { status: 'unknown', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  return { status: 'unknown', error: 'Max attempts reached' };
}
