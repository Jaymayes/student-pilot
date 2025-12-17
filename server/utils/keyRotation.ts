/**
 * Session Secret Key Rotation Utility
 * 
 * RT-018 Remediation: Supports zero-downtime key rotation for SESSION_SECRET.
 * 
 * Usage:
 * 1. Set SESSION_SECRET_OLD to the current secret
 * 2. Set SESSION_SECRET to the new secret
 * 3. Deploy - new sessions use new secret, old sessions still validate
 * 4. Wait for session TTL (7 days) to expire old sessions
 * 5. Remove SESSION_SECRET_OLD
 * 
 * Key Rotation SOP:
 * - Generate new 64-character secret: openssl rand -hex 32
 * - Add SESSION_SECRET_OLD in Replit Secrets (copy current SESSION_SECRET)
 * - Update SESSION_SECRET to new value
 * - Redeploy application
 * - Monitor for session validation errors
 * - After 7 days, remove SESSION_SECRET_OLD
 */

import crypto from 'crypto';

interface KeyRotationConfig {
  currentSecret: string;
  previousSecret?: string;
  rotationStarted?: Date;
}

/**
 * Get key rotation configuration from environment
 */
export function getKeyRotationConfig(): KeyRotationConfig {
  const currentSecret = process.env.SESSION_SECRET;
  const previousSecret = process.env.SESSION_SECRET_OLD;
  
  if (!currentSecret || currentSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }
  
  return {
    currentSecret,
    previousSecret: previousSecret && previousSecret.length >= 32 ? previousSecret : undefined,
    rotationStarted: previousSecret ? new Date() : undefined
  };
}

/**
 * Get array of secrets for express-session (supports key rotation)
 * 
 * When SESSION_SECRET_OLD is set, both secrets are used for validation
 * but only the new SESSION_SECRET is used for signing new sessions.
 */
export function getSessionSecrets(): string[] {
  const config = getKeyRotationConfig();
  const secrets: string[] = [config.currentSecret];
  
  if (config.previousSecret) {
    secrets.push(config.previousSecret);
    console.log('🔑 Key rotation in progress: Previous secret will be accepted for validation');
  }
  
  return secrets;
}

/**
 * Generate a new cryptographically secure session secret
 */
export function generateNewSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate a session secret meets security requirements
 */
export function validateSecret(secret: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (secret.length < 32) {
    issues.push('Secret must be at least 32 characters');
  }
  
  if (secret.length < 64) {
    issues.push('Recommended: Use 64+ character secret for enhanced security');
  }
  
  if (/^[a-f0-9]+$/i.test(secret) === false && secret.length === 64) {
    issues.push('Consider using hex-encoded random bytes for uniformity');
  }
  
  return {
    valid: issues.filter(i => !i.startsWith('Recommended')).length === 0,
    issues
  };
}

/**
 * Get key rotation status for monitoring
 */
export function getKeyRotationStatus(): {
  inRotation: boolean;
  currentKeyHash: string;
  previousKeyHash?: string;
  recommendation: string;
} {
  const config = getKeyRotationConfig();
  
  const hashKey = (key: string) => 
    crypto.createHash('sha256').update(key).digest('hex').substring(0, 8);
  
  return {
    inRotation: !!config.previousSecret,
    currentKeyHash: hashKey(config.currentSecret),
    previousKeyHash: config.previousSecret ? hashKey(config.previousSecret) : undefined,
    recommendation: config.previousSecret 
      ? 'Key rotation active. Remove SESSION_SECRET_OLD after 7 days.'
      : 'No rotation in progress. Consider rotating every 90 days.'
  };
}
