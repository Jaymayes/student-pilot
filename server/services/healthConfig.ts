/**
 * Health/Readiness Configuration
 * 
 * /health - Lightweight liveness (no DB) for public SLO exclusion
 * /readiness - Deep checks for internal use only
 */

export const HEALTH_CONFIG = {
  // Lightweight liveness check - no DB, no external calls
  liveness: {
    path: '/health',
    checks: ['process_alive', 'memory_ok'],
    timeoutMs: 50,
    excludeFromPublicSLO: true
  },
  
  // Deep readiness check - DB, external services
  readiness: {
    path: '/readiness',
    checks: ['database', 'cache', 'external_services'],
    timeoutMs: 5000,
    excludeFromPublicSLO: true
  }
};

// Pre-warm configuration
export const PREWARM_CONFIG = {
  endpoints: ['/', '/pricing'],
  intervalMs: 120000, // Every 2 minutes
  enabled: true
};

// CDN cache configuration
export const CDN_CONFIG = {
  cacheableEndpoints: ['/'],
  ttlSeconds: 300, // 5 minutes
  staleWhileRevalidate: 60,
  compression: 'brotli'
};
