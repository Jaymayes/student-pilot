/**
 * KPI Telemetry Service for Growth Tracking
 * Emits labeled events with unique trace IDs for $10M ARR business model
 * 
 * Critical KPIs:
 * 1. Profile Completion Rate - onboarding funnel
 * 2. Match Click-Through Rate - discovery engagement
 * 3. Application Start Rate - conversion funnel
 * 4. Credit Spend Rate - monetization
 * 5. ARPU Events - revenue tracking
 */

import * as crypto from 'crypto';
import { agentBridge } from '../agentBridge';
import { telemetryClient } from '../telemetry/telemetryClient';

export interface KPIEvent {
  event_type: string;
  user_id?: string;
  trace_id: string;
  timestamp: string;
  data: Record<string, any>;
  labels: Record<string, string>;
}

class KPITelemetryService {
  private events: KPIEvent[] = [];
  private readonly MAX_EVENTS = 10000; // Prevent memory issues

  /**
   * Track profile completion milestones
   * Critical for onboarding funnel analysis
   */
  async trackProfileCompletion(userId: string, completionPercentage: number, fields: string[]) {
    const traceId = crypto.randomUUID();
    
    const event: KPIEvent = {
      event_type: 'profile_completion',
      user_id: userId,
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      data: {
        completion_percentage: completionPercentage,
        fields_completed: fields.length,
        field_names: fields,
        milestone: this.getProfileMilestone(completionPercentage)
      },
      labels: {
        kpi_category: 'onboarding',
        funnel_stage: 'profile_setup',
        user_segment: this.getUserSegment(completionPercentage)
      }
    };

    this.emitEvent(event);
    console.log(`[KPI] Profile completion: ${userId} → ${completionPercentage}% (trace: ${traceId})`);
  }

  /**
   * Track scholarship match engagement (CTR)
   * Critical for discovery and recommendation quality
   */
  async trackMatchClickThrough(userId: string, matchId: string, matchScore: number, rank: number) {
    const traceId = crypto.randomUUID();
    
    const event: KPIEvent = {
      event_type: 'match_click_through',
      user_id: userId,
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      data: {
        match_id: matchId,
        match_score: matchScore,
        match_rank: rank,
        click_position: rank
      },
      labels: {
        kpi_category: 'discovery',
        funnel_stage: 'match_browse',
        match_quality: matchScore >= 80 ? 'high' : matchScore >= 60 ? 'medium' : 'low'
      }
    };

    this.emitEvent(event);
    console.log(`[KPI] Match CTR: ${userId} → match ${matchId} (score: ${matchScore}, trace: ${traceId})`);
  }

  /**
   * Track application initiation
   * Critical for conversion funnel
   */
  async trackApplicationStart(userId: string, scholarshipId: string, matchScore?: number) {
    const traceId = crypto.randomUUID();
    
    const event: KPIEvent = {
      event_type: 'application_start',
      user_id: userId,
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      data: {
        scholarship_id: scholarshipId,
        match_score: matchScore || null,
        source: matchScore ? 'matched' : 'direct'
      },
      labels: {
        kpi_category: 'conversion',
        funnel_stage: 'application_create',
        source_type: matchScore ? 'ai_match' : 'manual_search'
      }
    };

    this.emitEvent(event);
    console.log(`[KPI] Application start: ${userId} → ${scholarshipId} (trace: ${traceId})`);
  }

  /**
   * Track credit spend (AI usage)
   * Critical for monetization tracking
   */
  async trackCreditSpend(userId: string, millicredits: number, operation: string, costUsd: number) {
    const traceId = crypto.randomUUID();
    
    const event: KPIEvent = {
      event_type: 'credit_spend',
      user_id: userId,
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      data: {
        millicredits_spent: millicredits,
        cost_usd: costUsd,
        operation_type: operation,
        credits_spent: millicredits / 1000
      },
      labels: {
        kpi_category: 'monetization',
        funnel_stage: 'ai_usage',
        operation_category: this.getOperationCategory(operation)
      }
    };

    this.emitEvent(event);
    console.log(`[KPI] Credit spend: ${userId} → ${millicredits}mc for ${operation} (trace: ${traceId})`);
  }

  /**
   * Track ARPU milestone events
   * Critical for revenue modeling
   */
  async trackARPUEvent(userId: string, eventType: string, revenueUsd: number, ltv?: number) {
    const traceId = crypto.randomUUID();
    
    const event: KPIEvent = {
      event_type: 'arpu_event',
      user_id: userId,
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      data: {
        arpu_event_type: eventType,
        revenue_usd: revenueUsd,
        lifetime_value_usd: ltv || null,
        revenue_milestone: this.getRevenueMilestone(revenueUsd)
      },
      labels: {
        kpi_category: 'revenue',
        funnel_stage: 'monetization',
        revenue_tier: this.getRevenueTier(revenueUsd)
      }
    };

    this.emitEvent(event);
    console.log(`[KPI] ARPU event: ${userId} → ${eventType} ($${revenueUsd}, trace: ${traceId})`);
  }

  /**
   * Track essay AI assistance usage
   * Critical for understanding AI feature adoption
   */
  async trackEssayAssistance(userId: string, essayId: string, assistanceType: string, wordCount: number) {
    const traceId = crypto.randomUUID();
    
    const event: KPIEvent = {
      event_type: 'essay_assistance',
      user_id: userId,
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      data: {
        essay_id: essayId,
        assistance_type: assistanceType,
        word_count: wordCount,
        feature_type: assistanceType
      },
      labels: {
        kpi_category: 'ai_adoption',
        funnel_stage: 'essay_creation',
        assistance_category: this.getAssistanceCategory(assistanceType)
      }
    };

    this.emitEvent(event);
    console.log(`[KPI] Essay assistance: ${userId} → ${assistanceType} (trace: ${traceId})`);
  }

  /**
   * Track scholarship search behavior
   * Critical for understanding discovery patterns
   */
  async trackScholarshipSearch(userId: string | undefined, query: string, resultsCount: number) {
    const traceId = crypto.randomUUID();
    
    const event: KPIEvent = {
      event_type: 'scholarship_search',
      user_id: userId,
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      data: {
        search_query: query,
        results_count: resultsCount,
        has_results: resultsCount > 0,
        query_length: query.length
      },
      labels: {
        kpi_category: 'discovery',
        funnel_stage: 'search',
        user_type: userId ? 'authenticated' : 'anonymous'
      }
    };

    this.emitEvent(event);
    console.log(`[KPI] Search: ${userId || 'anon'} → "${query}" (${resultsCount} results, trace: ${traceId})`);
  }

  /**
   * Get all recent events (for analytics export)
   */
  getRecentEvents(limit: number = 100): KPIEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events by category
   */
  getEventsByCategory(category: string, limit: number = 100): KPIEvent[] {
    return this.events
      .filter(e => e.labels.kpi_category === category)
      .slice(-limit);
  }

  /**
   * Get summary metrics
   */
  getSummaryMetrics() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    const recentEvents = this.events.filter(e => 
      new Date(e.timestamp).getTime() > oneHourAgo
    );

    const dailyEvents = this.events.filter(e => 
      new Date(e.timestamp).getTime() > oneDayAgo
    );

    return {
      total_events: this.events.length,
      hourly_events: recentEvents.length,
      daily_events: dailyEvents.length,
      by_category: this.groupByCategory(this.events),
      by_stage: this.groupByStage(this.events),
      unique_users_hourly: new Set(recentEvents.map(e => e.user_id).filter(Boolean)).size,
      unique_users_daily: new Set(dailyEvents.map(e => e.user_id).filter(Boolean)).size
    };
  }

  // Private helper methods

  private emitEvent(event: KPIEvent) {
    this.events.push(event);
    
    // Prevent memory overflow
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Send via Telemetry Contract v1.1 (primary path to scholarship_sage)
    telemetryClient.track(event.event_type, {
      ...event.data,
      labels: event.labels
    }, {
      userId: event.user_id,
      requestId: event.trace_id,
      actorType: 'student'
    });

    // Attempt to send to Command Center via Agent Bridge (fallback)
    this.sendToCommandCenter(event).catch(err => {
      // Graceful degradation - event is already logged locally
      console.warn(`Failed to send KPI event to Command Center: ${err.message}`);
    });
  }

  private async sendToCommandCenter(event: KPIEvent) {
    try {
      await agentBridge.sendEvent({
        event_id: event.trace_id,
        type: event.event_type,
        source: 'student-pilot',
        data: {
          ...event.data,
          labels: event.labels,
          user_id: event.user_id
        },
        time: event.timestamp,
        trace_id: event.trace_id
      });
    } catch (error) {
      // Graceful degradation - Command Center may not be available
      throw error;
    }
  }

  private getProfileMilestone(percentage: number): string {
    if (percentage >= 100) return 'complete';
    if (percentage >= 75) return 'almost_complete';
    if (percentage >= 50) return 'halfway';
    if (percentage >= 25) return 'started';
    return 'initial';
  }

  private getUserSegment(percentage: number): string {
    if (percentage >= 80) return 'engaged';
    if (percentage >= 40) return 'active';
    return 'new';
  }

  private getOperationCategory(operation: string): string {
    if (operation.includes('match')) return 'matching';
    if (operation.includes('essay') || operation.includes('analyze')) return 'essay';
    if (operation.includes('profile')) return 'profile';
    return 'other';
  }

  private getRevenueMilestone(revenue: number): string {
    if (revenue >= 100) return 'whale';
    if (revenue >= 50) return 'high_value';
    if (revenue >= 10) return 'converted';
    if (revenue > 0) return 'first_purchase';
    return 'free';
  }

  private getRevenueTier(revenue: number): string {
    if (revenue >= 100) return 'tier_4_whale';
    if (revenue >= 50) return 'tier_3_premium';
    if (revenue >= 10) return 'tier_2_paying';
    if (revenue > 0) return 'tier_1_trial';
    return 'tier_0_free';
  }

  private getAssistanceCategory(type: string): string {
    if (type.includes('analyze')) return 'feedback';
    if (type.includes('generate') || type.includes('outline')) return 'generation';
    if (type.includes('improve')) return 'enhancement';
    return 'other';
  }

  private groupByCategory(events: KPIEvent[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const event of events) {
      const cat = event.labels.kpi_category || 'unknown';
      groups[cat] = (groups[cat] || 0) + 1;
    }
    return groups;
  }

  private groupByStage(events: KPIEvent[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const event of events) {
      const stage = event.labels.funnel_stage || 'unknown';
      groups[stage] = (groups[stage] || 0) + 1;
    }
    return groups;
  }
}

// Export singleton instance
export const kpiTelemetry = new KPITelemetryService();
