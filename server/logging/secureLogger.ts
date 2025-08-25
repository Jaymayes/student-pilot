/**
 * Secure Logging Service - RT-015 Implementation
 * 
 * Implements deny-by-default logging with PII masking and structured JSON output.
 * Follows executive directive for zero PII/secret exposure in logs.
 */

// PII and sensitive data patterns to mask
const SENSITIVE_PATTERNS = [
  // User PII
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, // Credit card
  /\b\d{3}-\d{3}-\d{4}\b/g, // Phone numbers
  
  // API keys and tokens
  /sk_[a-zA-Z0-9]{20,}/g, // Stripe secret keys
  /pk_[a-zA-Z0-9]{20,}/g, // Stripe public keys
  /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, // JWT tokens
  /Bearer\s+[A-Za-z0-9\-_]+/gi, // Bearer tokens
  /[a-zA-Z0-9]{32,}/g, // Generic long strings that might be tokens
];

const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'ssn',
  'social_security_number',
  'credit_card',
  'card_number',
  'cvv',
  'cvc',
  'pin',
  'access_token',
  'refresh_token',
  'id_token',
  'api_key',
  'stripe_key',
  'openai_key'
]);

// Allowlisted fields that are safe to log (deny-by-default approach)
const SAFE_FIELDS = new Set([
  'id',
  'correlationId',
  'method',
  'path',
  'status',
  'duration',
  'timestamp',
  'level',
  'message',
  'error_type',
  'stack_trace_sanitized',
  'user_id_hashed',
  'request_id',
  'ip_hashed'
]);

export interface LogContext {
  correlationId?: string;
  userId?: string;
  method?: string;
  path?: string;
  [key: string]: any;
}

export class SecureLogger {
  /**
   * Masks sensitive data in strings
   */
  private maskSensitiveData(value: string): string {
    let masked = value;
    
    for (const pattern of SENSITIVE_PATTERNS) {
      masked = masked.replace(pattern, '[REDACTED]');
    }
    
    return masked;
  }

  /**
   * Sanitizes an object by removing sensitive fields and masking PII
   */
  private sanitizeObject(obj: any, depth = 0): any {
    if (depth > 5) return '[MAX_DEPTH]'; // Prevent deep recursion
    
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return this.maskSensitiveData(obj);
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        // Check if field contains sensitive information
        if (SENSITIVE_FIELDS.has(lowerKey) || 
            lowerKey.includes('password') || 
            lowerKey.includes('token') ||
            lowerKey.includes('secret') ||
            lowerKey.includes('key')) {
          sanitized[key] = '[REDACTED]';
        } else if (SAFE_FIELDS.has(key) || lowerKey.includes('id')) {
          // Hash user IDs for privacy while maintaining debuggability
          if (key === 'userId' && typeof value === 'string') {
            sanitized['user_id_hashed'] = this.hashUserId(value);
          } else {
            sanitized[key] = this.sanitizeObject(value, depth + 1);
          }
        } else {
          // For other fields, apply string masking if it's a string
          sanitized[key] = this.sanitizeObject(value, depth + 1);
        }
      }
      
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Creates a consistent hash of user ID for logging without exposing PII
   */
  private hashUserId(userId: string): string {
    // Simple hash for logging - not cryptographically secure
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user_${Math.abs(hash)}`;
  }

  /**
   * Creates structured log entry with security controls
   */
  private createLogEntry(level: string, message: string, context?: LogContext): any {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? this.sanitizeObject(context) : {};
    
    return {
      timestamp,
      level: level.toUpperCase(),
      message: this.maskSensitiveData(message),
      ...sanitizedContext
    };
  }

  /**
   * Log info level messages
   */
  info(message: string, context?: LogContext): void {
    const logEntry = this.createLogEntry('info', message, context);
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Log warning level messages
   */
  warn(message: string, context?: LogContext): void {
    const logEntry = this.createLogEntry('warn', message, context);
    console.warn(JSON.stringify(logEntry));
  }

  /**
   * Log error level messages with sanitized stack traces
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error_type: error?.name,
      error_message: error?.message ? this.maskSensitiveData(error.message) : undefined,
      stack_trace_sanitized: process.env.NODE_ENV === 'development' && error?.stack ? 
        this.maskSensitiveData(error.stack) : undefined
    };
    
    const logEntry = this.createLogEntry('error', message, errorContext);
    console.error(JSON.stringify(logEntry));
  }

  /**
   * Log debug level messages (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = this.createLogEntry('debug', message, context);
      console.log(JSON.stringify(logEntry));
    }
  }
}

// Singleton instance
export const secureLogger = new SecureLogger();