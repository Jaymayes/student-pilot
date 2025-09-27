/**
 * Enterprise Load Testing Configuration - ScholarLink
 * $10M ARR Capacity Validation (12-month growth horizon with 3x headroom)
 * 
 * Critical Endpoint Categories:
 * 1. Revenue-Critical: AI services, billing, payments, partner events
 * 2. User Experience: profiles, scholarships, applications, search
 * 3. Operations: monitoring, alerts, health checks
 * 4. SEO Engine: server-side rendered pages, sitemaps
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Authentication endpoints - foundational for all other tests
export const AUTH_ENDPOINTS = {
  login: `${BASE_URL}/api/login`,
  callback: `${BASE_URL}/api/callback`,
  user: `${BASE_URL}/api/auth/user`,
  logout: `${BASE_URL}/api/logout`
};

// Core revenue-generating AI services (highest load priority)
export const AI_ENDPOINTS = {
  generateMatches: `${BASE_URL}/api/matches/generate`,
  analyzeEssay: `${BASE_URL}/api/essays/analyze`,
  generateOutline: `${BASE_URL}/api/essays/generate-outline`,
  improveContent: `${BASE_URL}/api/essays/improve-content`,
  generateIdeas: `${BASE_URL}/api/essays/generate-ideas`
};

// Critical billing and payment operations (zero tolerance for failures)
export const BILLING_ENDPOINTS = {
  summary: `${BASE_URL}/api/billing/summary`,
  ledger: `${BASE_URL}/api/billing/ledger`,
  usage: `${BASE_URL}/api/billing/usage`,
  estimate: `${BASE_URL}/api/billing/estimate`,
  createCheckout: `${BASE_URL}/api/billing/create-checkout`,
  stripeWebhook: `${BASE_URL}/api/billing/stripe-webhook`,
  refund: `${BASE_URL}/api/billing/refund`,
  refunds: `${BASE_URL}/api/billing/refunds`,
  kpis: `${BASE_URL}/api/billing/kpis`,
  trackConversion: `${BASE_URL}/api/billing/track-conversion`
};

// Core user experience endpoints
export const USER_ENDPOINTS = {
  profile: `${BASE_URL}/api/profile`,
  scholarships: `${BASE_URL}/api/scholarships`,
  scholarshipDetail: `${BASE_URL}/api/scholarships/:id`,
  matches: `${BASE_URL}/api/matches`,
  applications: `${BASE_URL}/api/applications`,
  essays: `${BASE_URL}/api/essays`,
  documents: `${BASE_URL}/api/documents`
};

// Partner revenue and attribution (B2B growth engine)
export const PARTNER_ENDPOINTS = {
  trackEvent: `${BASE_URL}/api/partner-events`,
  trackBatch: `${BASE_URL}/api/partner-events/batch`,
  deepLink: `${BASE_URL}/api/partner-deep-link`,
  health: `${BASE_URL}/api/partner-health`,
  marketplace: `${BASE_URL}/api/marketplace/promoted-listings`,
  monetization: `${BASE_URL}/api/partner-monetization/enrollment`,
  commitment: `${BASE_URL}/api/partner-monetization/commitment`
};

// Monitoring and reliability (operational excellence)
export const MONITORING_ENDPOINTS = {
  health: `${BASE_URL}/health`,
  apiHealth: `${BASE_URL}/api/health`,
  reliability: `${BASE_URL}/api/health/reliability`,
  metrics: `${BASE_URL}/metrics`,
  apiMetrics: `${BASE_URL}/api/metrics`,
  alerts: `${BASE_URL}/api/alerts`,
  alertsSummary: `${BASE_URL}/api/alerts/summary`,
  cacheMetrics: `${BASE_URL}/api/performance/cache-metrics`
};

// SEO traffic engine (organic growth driver)
export const SEO_ENDPOINTS = {
  scholarshipsList: `${BASE_URL}/scholarships`,
  scholarshipDetail: `${BASE_URL}/scholarships/:id/:slug`,
  categoryPage: `${BASE_URL}/scholarships/category/:category`,
  statePage: `${BASE_URL}/scholarships/state/:state`,
  sitemap: `${BASE_URL}/sitemap.xml`,
  robotsTxt: `${BASE_URL}/robots.txt`,
  securityTxt: `${BASE_URL}/.well-known/security.txt`
};

// File upload and storage operations
export const STORAGE_ENDPOINTS = {
  uploadUrl: `${BASE_URL}/api/objects/upload`,
  documentUpload: `${BASE_URL}/api/documents/upload`,
  fileAccess: `${BASE_URL}/objects/:path`
};

// Data validation and quality (data trust foundation)
export const DATA_ENDPOINTS = {
  freshness: `${BASE_URL}/api/data-validation/freshness`,
  revalidate: `${BASE_URL}/api/data-validation/revalidate/:id`,
  globalStatus: `${BASE_URL}/api/data-validation/global-status`,
  validate: `${BASE_URL}/api/data-validation/validate/:id`,
  schemaHealth: `${BASE_URL}/api/monitoring/schema/health`,
  arrFreshness: `${BASE_URL}/api/monitoring/arr-freshness`
};

// A/B testing and experimentation
export const EXPERIMENT_ENDPOINTS = {
  assignments: `${BASE_URL}/api/experiments/assignments`,
  exposures: `${BASE_URL}/api/experiments/exposures`,
  conversions: `${BASE_URL}/api/experiments/conversions`,
  analytics: `${BASE_URL}/api/experiments/:experimentId/analytics`,
  experiments: `${BASE_URL}/api/experiments`
};

// Load testing performance targets (CEO directive)
export const PERFORMANCE_TARGETS = {
  // SLO targets for production readiness
  slo: {
    p95_latency: 100, // ms - internal target
    p99_latency: 250, // ms - internal target  
    error_rate: 0.001, // 0.1% max error rate
    availability: 0.999 // 99.9% uptime
  },
  
  // Capacity planning (12-month growth with 3x headroom)
  capacity: {
    concurrent_users: 10000, // Peak concurrent users
    requests_per_second: 1000, // Peak RPS across all endpoints
    ai_operations_per_minute: 500, // AI service load
    billing_operations_per_minute: 100, // Payment processing load
    partner_events_per_second: 50 // Attribution tracking load
  },
  
  // Resource thresholds for alerts
  resources: {
    cpu_utilization: 0.8, // 80% max CPU
    memory_utilization: 0.85, // 85% max memory
    db_connections: 0.9, // 90% max connections
    cache_hit_ratio: 0.85 // 85% min cache hits
  }
};

// Test scenarios mapping to CEO objectives
export const TEST_SCENARIOS = {
  BASELINE: 'Establish sustainable throughput per service tier',
  STRESS: 'Determine failure thresholds and circuit breaker behavior',
  SPIKE: 'Validate autoscaling and thundering-herd resilience',
  SOAK: 'Surface memory leaks and GC pathologies over 72 hours', 
  DEGRADATION: 'Test graceful fallbacks during dependency failures',
  SEO_REPLAY: 'Simulate search-driven traffic spikes'
};

export default {
  AUTH_ENDPOINTS,
  AI_ENDPOINTS,
  BILLING_ENDPOINTS,
  USER_ENDPOINTS,
  PARTNER_ENDPOINTS,
  MONITORING_ENDPOINTS,
  SEO_ENDPOINTS,
  STORAGE_ENDPOINTS,
  DATA_ENDPOINTS,
  EXPERIMENT_ENDPOINTS,
  PERFORMANCE_TARGETS,
  TEST_SCENARIOS
};