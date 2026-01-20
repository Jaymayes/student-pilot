/**
 * WAF Configuration - SEV-1 Emergency Rollback
 * 
 * CIR-1768893338: WAF regression stripped x-forwarded-host header
 * 
 * POLICY:
 * - If client IP ∈ WAF_TRUSTED_* AND Host/XFH endswith any suffix in WAF_ALLOWED_HOST_SUFFIXES → preserve x-forwarded-host
 * - Else strip or 403 per PROD rules
 * - Keep underscore-key block (e.g., _meta), but log and drop the property; do not 4xx the entire request on telemetry
 */

export const WAF_CONFIG = {
  // Header stripping rollback - CRITICAL FIX
  STRIP_X_FORWARDED_HOST: false, // ROLLED BACK - was causing OIDC failures
  
  // Allowlist mode instead of strip
  ALLOWLIST_XFH: true,
  
  // Trusted ingress IP ranges (Replit infrastructure)
  TRUSTED_INGRESS_CIDRS: [
    '35.192.0.0/12',   // GCP us-central1
    '35.224.0.0/12',   // GCP us-central1
    '34.0.0.0/8',      // GCP global
    '136.0.0.0/8',     // Additional cloud infra
    '10.0.0.0/8',      // Private RFC1918 (internal)
    '172.16.0.0/12',   // Private RFC1918 (internal)
    '192.168.0.0/16',  // Private RFC1918 (internal)
  ] as const,
  
  // Trusted internal addresses
  TRUSTED_INTERNALS: [
    '127.0.0.1/32',    // IPv4 localhost
    '::1/128',         // IPv6 localhost
  ] as const,
  
  // Allowed host suffixes for XFH preservation
  ALLOWED_HOST_SUFFIXES: [
    '.replit.app',
    '.replit.co',
    '.replit.dev',
    '.scholaraiadvisor.com',
    '.scholar-auth.replit.app',
  ] as const,
  
  // Underscore key handling (telemetry-safe)
  // Policy: Allow _meta for internal signals; block prototype pollution vectors
  UNDERSCORE_KEY_POLICY: 'selective' as const, // Options: 'block_all', 'log_and_drop', 'allow_all', 'selective'
  
  // ALLOWLIST: These underscore keys are permitted (infra signals)
  UNDERSCORE_KEYS_ALLOWED: ['_meta', '_trace', '_correlation'] as const,
  
  // BLOCKLIST: These underscore keys are ALWAYS blocked (security)
  UNDERSCORE_KEYS_BLOCKED: ['__proto__', 'constructor', 'prototype', '_internal', '_debug'] as const,
  
  // SEV-1 bypass mode
  SEV1_MODE: true,
  SEV1_BYPASS_HEADER_VALIDATION: true, // Auto-generate missing headers under SEV-1
} as const;

/**
 * Check if IP is in a CIDR range
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    
    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);
    
    if (ipParts.length !== 4 || rangeParts.length !== 4) return false;
    
    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
    
    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

/**
 * Check if client IP is trusted
 */
export function isTrustedIngress(clientIp: string): boolean {
  const allTrusted = [...WAF_CONFIG.TRUSTED_INGRESS_CIDRS, ...WAF_CONFIG.TRUSTED_INTERNALS];
  return allTrusted.some(cidr => isIpInCidr(clientIp, cidr));
}

/**
 * Check if host is allowed
 */
export function isAllowedHost(host: string | undefined): boolean {
  if (!host) return false;
  return WAF_CONFIG.ALLOWED_HOST_SUFFIXES.some(suffix => host.endsWith(suffix));
}

/**
 * WAF decision: should preserve x-forwarded-host?
 */
export function shouldPreserveXForwardedHost(clientIp: string, host: string | undefined): boolean {
  if (!WAF_CONFIG.ALLOWLIST_XFH) return false;
  return isTrustedIngress(clientIp) && isAllowedHost(host);
}

/**
 * Sanitize underscore keys from object (telemetry-safe, selective policy)
 * 
 * Policy:
 * - ALLOWED keys (_meta, _trace, _correlation): PRESERVE
 * - BLOCKED keys (__proto__, constructor, prototype): ALWAYS DROP + LOG
 * - Other underscore keys: DROP + LOG (do NOT 4xx)
 */
export function sanitizeUnderscoreKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (WAF_CONFIG.UNDERSCORE_KEY_POLICY === 'allow_all') return obj;
  
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Security: Always block prototype pollution vectors
    if (WAF_CONFIG.UNDERSCORE_KEYS_BLOCKED.some(k => key === k || key.includes(k))) {
      console.warn(`[WAF] [SECURITY] Blocked dangerous key: ${key}`);
      continue;
    }
    
    // Allow explicitly permitted underscore keys
    if (key.startsWith('_') && WAF_CONFIG.UNDERSCORE_KEYS_ALLOWED.some(k => key === k)) {
      result[key] = value;
      continue;
    }
    
    // Drop other underscore keys (but don't 4xx)
    if (key.startsWith('_')) {
      console.log(`[WAF] Dropped non-allowlisted underscore key: ${key}`);
      continue;
    }
    
    result[key] = value;
  }
  return result;
}

export type WafConfig = typeof WAF_CONFIG;
