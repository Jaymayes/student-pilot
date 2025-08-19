import { db } from "./db";
import { creditBalance, usageEvents } from "@shared/schema";
import { eq, and, gte, sum, desc } from "drizzle-orm";

// Production guardrails and circuit breakers for billing system
export class ProductionGuardrails {
  
  // Default per-user caps (can be overridden per account)
  static readonly DEFAULT_SINGLE_REQUEST_CAP = 50000; // 50 credits max per request
  static readonly DEFAULT_DAILY_CREDITS_CAP = 500000; // 500 credits per day
  static readonly DEFAULT_SESSION_CREDITS_CAP = 100000; // 100 credits per session
  
  // Anomaly detection thresholds
  static readonly BASELINE_MULTIPLIER_THRESHOLD = 5; // 5x recent baseline
  static readonly SESSION_TIME_WINDOW_MINUTES = 60;
  
  // Shadow billing configuration
  private static shadowBillingEnabled = process.env.SHADOW_BILLING_ENABLED === 'true';
  private static allowedUserIds = new Set(
    (process.env.BILLING_ALLOWLIST || '').split(',').filter(Boolean)
  );
  
  /**
   * Check if user should be charged (real billing) or just logged (shadow billing)
   */
  static shouldChargeUser(userId: string): boolean {
    if (!this.shadowBillingEnabled) {
      return true; // Normal production mode
    }
    
    // During shadow billing phase, only charge allowlisted users
    return this.allowedUserIds.has(userId);
  }
  
  /**
   * Validate single request doesn't exceed per-request caps
   */
  static async validateSingleRequestCap(
    userId: string, 
    requestedCredits: number,
    customCap?: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const cap = customCap || this.DEFAULT_SINGLE_REQUEST_CAP;
    
    if (requestedCredits > cap) {
      return {
        allowed: false,
        reason: `Request exceeds single-request cap (${requestedCredits} > ${cap} credits)`
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check daily spending limits for user
   */
  static async validateDailySpendingCap(
    userId: string,
    requestedCredits: number,
    customCap?: number
  ): Promise<{ allowed: boolean; reason?: string; dailyUsed: number }> {
    const cap = customCap || this.DEFAULT_DAILY_CREDITS_CAP;
    
    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyUsage = await db
      .select({ total: sum(usageEvents.chargedMillicredits) })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.userId, userId),
          gte(usageEvents.createdAt, today)
        )
      );
    
    const dailyUsedMillicredits = Number(dailyUsage[0]?.total || 0);
    const dailyUsed = dailyUsedMillicredits / 1000;
    const projectedTotal = dailyUsed + requestedCredits;
    
    if (projectedTotal > cap) {
      return {
        allowed: false,
        reason: `Daily spending cap exceeded (${projectedTotal.toFixed(2)} > ${cap} credits)`,
        dailyUsed
      };
    }
    
    // Soft warning at 80%
    if (projectedTotal > cap * 0.8) {
      return {
        allowed: true,
        reason: `Daily spending warning: ${(projectedTotal / cap * 100).toFixed(1)}% of daily limit`,
        dailyUsed
      };
    }
    
    return { allowed: true, dailyUsed };
  }
  
  /**
   * Detect anomalous usage patterns and trip circuit breaker
   */
  static async detectAnomalousUsage(
    userId: string,
    requestedCredits: number
  ): Promise<{ allowed: boolean; reason?: string; shouldReview: boolean }> {
    
    // Check recent baseline (last 7 days average)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentUsage = await db
      .select({ 
        total: sum(usageEvents.chargedMillicredits),
        count: sum(usageEvents.chargedMillicredits) // This is a hack to count rows
      })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.userId, userId),
          gte(usageEvents.createdAt, weekAgo)
        )
      );
    
    const weeklyTotalMillicredits = Number(recentUsage[0]?.total || 0);
    const dailyAverage = (weeklyTotalMillicredits / 1000) / 7;
    
    // If requesting > 5x daily average, flag for review
    if (requestedCredits > dailyAverage * this.BASELINE_MULTIPLIER_THRESHOLD) {
      return {
        allowed: false,
        reason: `Anomalous usage detected: ${requestedCredits} credits (${(requestedCredits / dailyAverage).toFixed(1)}x baseline)`,
        shouldReview: true
      };
    }
    
    // Check session-based usage (last hour)
    const hourAgo = new Date();
    hourAgo.setMinutes(hourAgo.getMinutes() - this.SESSION_TIME_WINDOW_MINUTES);
    
    const sessionUsage = await db
      .select({ total: sum(usageEvents.chargedMillicredits) })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.userId, userId),
          gte(usageEvents.createdAt, hourAgo)
        )
      );
    
    const sessionCredits = Number(sessionUsage[0]?.total || 0) / 1000;
    const projectedSessionTotal = sessionCredits + requestedCredits;
    
    if (projectedSessionTotal > this.DEFAULT_SESSION_CREDITS_CAP) {
      return {
        allowed: false,
        reason: `Session spending cap exceeded (${projectedSessionTotal.toFixed(2)} > ${this.DEFAULT_SESSION_CREDITS_CAP} credits in ${this.SESSION_TIME_WINDOW_MINUTES}min)`,
        shouldReview: true
      };
    }
    
    return { allowed: true, shouldReview: false };
  }
  
  /**
   * Comprehensive pre-charge validation
   */
  static async validateChargeRequest(
    userId: string,
    requestedCredits: number,
    options: {
      singleRequestCap?: number;
      dailyCap?: number;
      bypassAnomalyDetection?: boolean;
    } = {}
  ): Promise<{
    allowed: boolean;
    reason?: string;
    shouldReview?: boolean;
    warnings?: string[];
    metadata?: Record<string, any>;
  }> {
    const warnings: string[] = [];
    const metadata: Record<string, any> = {};
    
    // 1. Single request cap
    const singleRequestCheck = await this.validateSingleRequestCap(
      userId, 
      requestedCredits, 
      options.singleRequestCap
    );
    
    if (!singleRequestCheck.allowed) {
      return {
        allowed: false,
        reason: singleRequestCheck.reason,
        warnings,
        metadata
      };
    }
    
    // 2. Daily spending cap
    const dailyCapCheck = await this.validateDailySpendingCap(
      userId,
      requestedCredits,
      options.dailyCap
    );
    
    metadata.dailyUsed = dailyCapCheck.dailyUsed;
    
    if (!dailyCapCheck.allowed) {
      return {
        allowed: false,
        reason: dailyCapCheck.reason,
        warnings,
        metadata
      };
    }
    
    if (dailyCapCheck.reason) {
      warnings.push(dailyCapCheck.reason);
    }
    
    // 3. Anomaly detection (unless bypassed)
    if (!options.bypassAnomalyDetection) {
      const anomalyCheck = await this.detectAnomalousUsage(userId, requestedCredits);
      
      if (!anomalyCheck.allowed) {
        return {
          allowed: false,
          reason: anomalyCheck.reason,
          shouldReview: anomalyCheck.shouldReview,
          warnings,
          metadata
        };
      }
    }
    
    return {
      allowed: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata
    };
  }
  
  /**
   * Create shadow billing log entry (for comparison with real billing)
   */
  static async logShadowBilling(
    userId: string,
    requestedCredits: number,
    model: string,
    metadata: Record<string, any>
  ): Promise<void> {
    // Log to a shadow billing table or external logging system
    console.log('SHADOW_BILLING_LOG', {
      userId,
      requestedCredits,
      model,
      timestamp: new Date().toISOString(),
      metadata
    });
    
    // In production, you might want to store this in a separate table:
    // await db.insert(shadowBillingLog).values({
    //   userId,
    //   creditsRequested: requestedCredits,
    //   model,
    //   metadata,
    //   createdAt: new Date()
    // });
  }
}