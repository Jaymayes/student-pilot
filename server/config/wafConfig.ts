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
    '35.184.0.0/13',   // GCP us-central1 (primary)
    '35.192.0.0/12',   // GCP us-central1
    '35.224.0.0/12',   // GCP us-central1
    '34.0.0.0/8',      // GCP global
    '136.0.0.0/8',     // Additional cloud infra
    '10.0.0.0/8',      // Private RFC1918 (internal)
    '172.16.0.0/12',   // Private RFC1918 (internal)
    '192.168.0.0/16',  // Private RFC1918 (internal)
  ] as const,
  
  // S2S Telemetry Trust-by-Secret Configuration
  S2S_TELEMETRY_CONFIG: {
    // Paths that can bypass SQLi inspection with valid shared secret
    ALLOWED_PATHS: ['/api/telemetry/ingest', '/telemetry/ingest', '/events', '/api/events'],
    // Header containing shared secret for bypass
    SECRET_HEADER: 'x-scholar-shared-secret',
    // Environment variable containing the secret
    SECRET_ENV_VAR: 'SHARED_SECRET',
  } as const,
  
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
  UNDERSCORE_KEY_POLICY: 'selective' as 'block_all' | 'log_and_drop' | 'allow_all' | 'selective',
  
  // ALLOWLIST: These underscore keys are permitted (infra signals)
  UNDERSCORE_KEYS_ALLOWED: ['_meta', '_trace', '_correlation'] as const,
  
  // BLOCKLIST: These underscore keys are ALWAYS blocked (security)
  UNDERSCORE_KEYS_BLOCKED: ['__proto__', 'constructor', 'prototype', '_internal', '_debug'] as const,
  
  // SEV-1 bypass mode
  SEV1_MODE: true,
  SEV1_BYPASS_HEADER_VALIDATION: true, // Auto-generate missing headers under SEV-1
  
  // SQLi detection patterns (strong patterns only - overbroad regex removed)
  SQLI_PATTERNS: [
    /union\s+select/i,           // UNION SELECT injection
    /or\s+1\s*=\s*1/i,           // OR 1=1 bypass
    /--\s*$/,                    // SQL comment terminator
    /;\s*drop\s+/i,              // DROP statement
    /;\s*delete\s+/i,            // DELETE statement
    /;\s*truncate\s+/i,          // TRUNCATE statement
    /xp_cmdshell/i,              // SQL Server command exec
    /sp_executesql/i,            // SQL Server dynamic SQL
    /load_file\s*\(/i,           // MySQL file read
    /into\s+outfile/i,           // MySQL file write
    /benchmark\s*\(/i,           // Time-based injection
    /sleep\s*\(/i,               // Time-based injection
    /waitfor\s+delay/i,          // SQL Server time-based
  ] as const,
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

/**
 * Check if request qualifies for S2S Trust-by-Secret bypass
 * All three conditions must be met:
 * 1. Valid shared secret header
 * 2. Client IP in trusted CIDR
 * 3. Path is allowed telemetry path
 */
export function shouldBypassSqliInspection(
  clientIp: string,
  path: string,
  headers: Record<string, string | string[] | undefined>
): { bypass: boolean; reason: string } {
  const config = WAF_CONFIG.S2S_TELEMETRY_CONFIG;
  
  // Check 1: Path is allowed telemetry path
  const isAllowedPath = config.ALLOWED_PATHS.some(p => 
    path === p || path.startsWith(p + '?') || path.startsWith(p + '/')
  );
  if (!isAllowedPath) {
    return { bypass: false, reason: 'path_not_allowed' };
  }
  
  // Check 2: Valid shared secret
  const secretHeader = headers[config.SECRET_HEADER] || headers[config.SECRET_HEADER.toLowerCase()];
  const expectedSecret = process.env[config.SECRET_ENV_VAR];
  const secretValue = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;
  
  if (!expectedSecret || !secretValue || secretValue !== expectedSecret) {
    return { bypass: false, reason: 'invalid_or_missing_secret' };
  }
  
  // Check 3: Client IP in trusted CIDR
  if (!isTrustedIngress(clientIp)) {
    return { bypass: false, reason: 'ip_not_trusted' };
  }
  
  return { bypass: true, reason: 'trust_by_secret' };
}

/**
 * Check request body for SQLi patterns (strong patterns only)
 */
export function detectSqli(body: string): { detected: boolean; pattern: string | null } {
  for (const pattern of WAF_CONFIG.SQLI_PATTERNS) {
    if (pattern.test(body)) {
      return { detected: true, pattern: pattern.source };
    }
  }
  return { detected: false, pattern: null };
}

export type WafConfig = typeof WAF_CONFIG;
