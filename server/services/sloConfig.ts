/**
 * SLO Configuration - A8 as Source of Truth
 * 
 * Separates public SLO endpoints from internal readiness endpoints
 * per CEO directive T+12h → T+18h
 */

export const SLO_CONFIG = {
  // Public SLO endpoints (measured against targets)
  publicEndpoints: ['/', '/pricing', '/browse'],
  
  // Internal readiness endpoints (excluded from public SLOs)
  internalEndpoints: ['/health', '/readiness'],
  
  // Reporting window
  windowMs: 300000, // 5 minutes tumbling
  
  // Targets for public endpoints
  targets: {
    p95: 110,  // ≤110ms (tightened from 120ms)
    p99: 180,  // ≤180ms (tightened from 200ms)
    successRate: 99.5,
    errorRate5xx: 0.5
  },
  
  // SLO burn thresholds
  burnAlerts: {
    p95SustainedMinutes: 15,
    p99SustainedMinutes: 5
  },
  
  // Timing: server-side start→last byte
  timingMethod: 'server_side_start_to_last_byte'
};

export function isPublicEndpoint(path: string): boolean {
  return SLO_CONFIG.publicEndpoints.some(ep => 
    path === ep || path.startsWith(ep + '?')
  );
}

export function isInternalEndpoint(path: string): boolean {
  return SLO_CONFIG.internalEndpoints.some(ep => 
    path === ep || path.startsWith(ep + '?')
  );
}
