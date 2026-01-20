/**
 * Authentication Rate Limiting Middleware - QA-005 Implementation
 * 
 * Implements brute-force protection for authentication endpoints with:
 * - Per-IP limits: 5 attempts/minute, 20/hour, 100/day
 * - Per-account limits: 10 attempts/hour
 * - Exponential backoff with jitter
 * - Audit logging for security events
 */

import type { Request, Response, NextFunction } from 'express';
import { secureLogger } from '../logging/secureLogger';
import { isTrustedIngress } from '../config/wafConfig';

interface RateLimitEntry {
  count: number;
  windowStart: number;
  lockoutUntil?: number;
  exponentialDelay: number;
}

interface AccountLimitEntry {
  attempts: number;
  windowStart: number;
  locked: boolean;
  lockoutUntil?: number;
}

class AuthRateLimiter {
  private ipLimits = new Map<string, {
    minute: RateLimitEntry;
    hour: RateLimitEntry;
    day: RateLimitEntry;
  }>();
  
  private accountLimits = new Map<string, AccountLimitEntry>();
  
  // Rate limit configurations
  private readonly IP_LIMITS = {
    MINUTE: { max: 5, window: 60 * 1000 },
    HOUR: { max: 20, window: 60 * 60 * 1000 },
    DAY: { max: 100, window: 24 * 60 * 60 * 1000 }
  };
  
  private readonly ACCOUNT_LIMITS = {
    HOUR: { max: 10, window: 60 * 60 * 1000 }
  };

  /**
   * Get client IP with proxy support
   */
  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? 
      (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) :
      req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    return ip.toString().trim();
  }

  /**
   * Check if a time window has expired
   */
  private isWindowExpired(windowStart: number, windowDuration: number): boolean {
    return Date.now() - windowStart > windowDuration;
  }

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateBackoff(attempts: number, baseDelay = 1000): number {
    const exponential = Math.min(baseDelay * Math.pow(2, attempts), 300000); // Max 5 minutes
    const jitter = Math.random() * 0.1 * exponential; // 10% jitter
    return Math.floor(exponential + jitter);
  }

  /**
   * Update rate limit entry
   */
  private updateRateLimit(entry: RateLimitEntry, windowDuration: number): void {
    const now = Date.now();
    
    if (this.isWindowExpired(entry.windowStart, windowDuration)) {
      entry.count = 1;
      entry.windowStart = now;
      entry.exponentialDelay = 1000; // Reset backoff
    } else {
      entry.count++;
      entry.exponentialDelay = this.calculateBackoff(entry.count);
    }
  }

  /**
   * Check IP-based rate limits
   */
  private checkIPLimits(ip: string, correlationId?: string): { blocked: boolean; reason?: string; retryAfter?: number } {
    if (!this.ipLimits.has(ip)) {
      this.ipLimits.set(ip, {
        minute: { count: 0, windowStart: Date.now(), exponentialDelay: 1000 },
        hour: { count: 0, windowStart: Date.now(), exponentialDelay: 1000 },
        day: { count: 0, windowStart: Date.now(), exponentialDelay: 1000 }
      });
    }

    const limits = this.ipLimits.get(ip)!;
    const now = Date.now();

    // Check if currently in lockout
    for (const [period, limitEntry] of Object.entries(limits)) {
      if (limitEntry.lockoutUntil && now < limitEntry.lockoutUntil) {
        secureLogger.warn('IP blocked during active lockout period', {
          correlationId,
          clientIP: ip,
          period,
          lockoutRemaining: Math.ceil((limitEntry.lockoutUntil - now) / 1000)
        });
        return { blocked: true, reason: `IP locked out`, retryAfter: Math.ceil((limitEntry.lockoutUntil - now) / 1000) };
      }
    }

    // Update and check minute limit
    this.updateRateLimit(limits.minute, this.IP_LIMITS.MINUTE.window);
    if (limits.minute.count > this.IP_LIMITS.MINUTE.max) {
      limits.minute.lockoutUntil = now + limits.minute.exponentialDelay;
      secureLogger.warn('IP rate limit exceeded - minute window', {
        correlationId,
        clientIP: ip,
        attempts: limits.minute.count,
        lockoutDuration: limits.minute.exponentialDelay
      });
      return { blocked: true, reason: 'Too many attempts per minute', retryAfter: Math.ceil(limits.minute.exponentialDelay / 1000) };
    }

    // Update and check hour limit
    this.updateRateLimit(limits.hour, this.IP_LIMITS.HOUR.window);
    if (limits.hour.count > this.IP_LIMITS.HOUR.max) {
      limits.hour.lockoutUntil = now + limits.hour.exponentialDelay;
      secureLogger.warn('IP rate limit exceeded - hour window', {
        correlationId,
        clientIP: ip,
        attempts: limits.hour.count,
        lockoutDuration: limits.hour.exponentialDelay
      });
      return { blocked: true, reason: 'Too many attempts per hour', retryAfter: Math.ceil(limits.hour.exponentialDelay / 1000) };
    }

    // Update and check day limit
    this.updateRateLimit(limits.day, this.IP_LIMITS.DAY.window);
    if (limits.day.count > this.IP_LIMITS.DAY.max) {
      limits.day.lockoutUntil = now + limits.day.exponentialDelay;
      secureLogger.warn('IP rate limit exceeded - day window', {
        correlationId,
        clientIP: ip,
        attempts: limits.day.count,
        lockoutDuration: limits.day.exponentialDelay
      });
      return { blocked: true, reason: 'Daily limit exceeded', retryAfter: Math.ceil(limits.day.exponentialDelay / 1000) };
    }

    return { blocked: false };
  }

  /**
   * Check account-based rate limits
   */
  private checkAccountLimits(accountId: string, correlationId?: string): { blocked: boolean; reason?: string; retryAfter?: number } {
    if (!this.accountLimits.has(accountId)) {
      this.accountLimits.set(accountId, {
        attempts: 1,
        windowStart: Date.now(),
        locked: false
      });
      return { blocked: false };
    }

    const limit = this.accountLimits.get(accountId)!;
    const now = Date.now();

    // Check if in lockout
    if (limit.lockoutUntil && now < limit.lockoutUntil) {
      secureLogger.warn('Account blocked during active lockout period', {
        correlationId,
        accountId,
        lockoutRemaining: Math.ceil((limit.lockoutUntil - now) / 1000)
      });
      return { blocked: true, reason: 'Account temporarily locked', retryAfter: Math.ceil((limit.lockoutUntil - now) / 1000) };
    }

    // Reset window if expired
    if (this.isWindowExpired(limit.windowStart, this.ACCOUNT_LIMITS.HOUR.window)) {
      limit.attempts = 1;
      limit.windowStart = now;
      limit.locked = false;
      return { blocked: false };
    }

    // Increment and check limit
    limit.attempts++;
    if (limit.attempts > this.ACCOUNT_LIMITS.HOUR.max) {
      const lockoutDuration = this.calculateBackoff(limit.attempts, 5000); // 5s base for account limits
      limit.lockoutUntil = now + lockoutDuration;
      limit.locked = true;
      
      secureLogger.warn('Account rate limit exceeded', {
        correlationId,
        accountId,
        attempts: limit.attempts,
        lockoutDuration
      });
      
      return { blocked: true, reason: 'Too many failed attempts for this account', retryAfter: Math.ceil(lockoutDuration / 1000) };
    }

    return { blocked: false };
  }

  /**
   * Record successful authentication (reset counters)
   */
  public recordSuccess(ip: string, accountId?: string, correlationId?: string): void {
    // Reset IP limits on successful auth
    if (this.ipLimits.has(ip)) {
      const limits = this.ipLimits.get(ip)!;
      limits.minute.count = 0;
      limits.hour.count = 0;
      limits.day.count = 0;
    }

    // Reset account limits on successful auth
    if (accountId && this.accountLimits.has(accountId)) {
      const limit = this.accountLimits.get(accountId)!;
      limit.attempts = 0;
      limit.locked = false;
      delete limit.lockoutUntil;
    }

    secureLogger.info('Successful authentication - rate limits reset', {
      correlationId,
      clientIP: ip,
      accountId
    });
  }

  /**
   * Check if request should be rate limited
   */
  public checkLimits(req: Request): { allowed: boolean; reason?: string; retryAfter?: number } {
    const ip = this.getClientIP(req);
    const correlationId = (req as any).correlationId;
    const accountId = req.body?.email || req.body?.username;

    // WHITELIST: Skip rate limiting for trusted infrastructure IPs (health probes, monitoring)
    // Hotfix: CIR-1768945183 - GCP health probes were being rate-limited causing 21% error rate
    if (isTrustedIngress(ip)) {
      secureLogger.debug('Rate limit bypassed for trusted IP', { clientIP: ip });
      return { allowed: true };
    }

    // Check IP limits first
    const ipCheck = this.checkIPLimits(ip, correlationId);
    if (ipCheck.blocked) {
      return { allowed: false, reason: ipCheck.reason, retryAfter: ipCheck.retryAfter };
    }

    // Check account limits if account identifier provided
    if (accountId) {
      const accountCheck = this.checkAccountLimits(accountId, correlationId);
      if (accountCheck.blocked) {
        return { allowed: false, reason: accountCheck.reason, retryAfter: accountCheck.retryAfter };
      }
    }

    return { allowed: true };
  }

  /**
   * Get current statistics for monitoring
   */
  public getStats(): { ipEntries: number; accountEntries: number; activeBlocks: number } {
    const now = Date.now();
    let activeBlocks = 0;

    // Count active IP blocks
    this.ipLimits.forEach((limits) => {
      Object.values(limits).forEach((limit) => {
        if (limit.lockoutUntil && now < limit.lockoutUntil) {
          activeBlocks++;
        }
      });
    });

    // Count active account blocks
    this.accountLimits.forEach((limit) => {
      if (limit.lockoutUntil && now < limit.lockoutUntil) {
        activeBlocks++;
      }
    });

    return {
      ipEntries: this.ipLimits.size,
      accountEntries: this.accountLimits.size,
      activeBlocks
    };
  }

  /**
   * Clean up expired entries (memory management)
   */
  public cleanup(): void {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Clean up old IP entries
    const expiredIPs: string[] = [];
    this.ipLimits.forEach((limits, ip) => {
      const allExpired = Object.values(limits).every(limit => 
        this.isWindowExpired(limit.windowStart, dayMs) && 
        (!limit.lockoutUntil || now > limit.lockoutUntil)
      );
      if (allExpired) {
        expiredIPs.push(ip);
      }
    });
    expiredIPs.forEach(ip => this.ipLimits.delete(ip));

    // Clean up old account entries
    const expiredAccounts: string[] = [];
    this.accountLimits.forEach((limit, accountId) => {
      if (this.isWindowExpired(limit.windowStart, this.ACCOUNT_LIMITS.HOUR.window) && 
          (!limit.lockoutUntil || now > limit.lockoutUntil)) {
        expiredAccounts.push(accountId);
      }
    });
    expiredAccounts.forEach(accountId => this.accountLimits.delete(accountId));
  }
}

// Singleton instance
const rateLimiter = new AuthRateLimiter();

// Cleanup every 15 minutes
setInterval(() => rateLimiter.cleanup(), 15 * 60 * 1000);

/**
 * Middleware for authentication endpoints
 */
export function authRateLimit(req: Request, res: Response, next: NextFunction) {
  const check = rateLimiter.checkLimits(req);
  
  if (!check.allowed) {
    const correlationId = (req as any).correlationId;
    
    secureLogger.warn('Authentication request blocked by rate limiter', {
      correlationId,
      method: req.method,
      path: req.path,
      reason: check.reason,
      retryAfter: check.retryAfter,
      clientIP: req.ip
    });

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': 'Variable based on endpoint and user',
      'X-RateLimit-Remaining': '0',
      'Retry-After': check.retryAfter?.toString() || '60'
    });

    return res.status(429).json({
      message: check.reason || 'Rate limit exceeded',
      correlationId,
      retryAfter: check.retryAfter
    });
  }

  // Store rate limiter instance for success recording
  (req as any).rateLimiter = rateLimiter;
  next();
}

/**
 * Record successful authentication - call this after successful login
 */
export function recordAuthSuccess(req: Request, accountId?: string): void {
  const rateLimiter = (req as any).rateLimiter;
  const ip = req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const correlationId = (req as any).correlationId;
  
  if (rateLimiter) {
    rateLimiter.recordSuccess(ip.toString(), accountId, correlationId);
  }
}

/**
 * Get rate limiter statistics for monitoring
 */
export function getRateLimitStats() {
  return rateLimiter.getStats();
}