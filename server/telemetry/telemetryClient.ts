import crypto from 'crypto';
import fetch from 'node-fetch';
import { productionMetrics } from '../monitoring/productionMetrics';
import { db } from '../db';
import { businessEvents } from '@shared/schema';

const APP_ID = process.env.APP_NAME || 'student_pilot';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app';
const NODE_ENV = process.env.NODE_ENV || 'development';
const VERSION = process.env.GIT_SHA || process.env.npm_package_version || '1.0.0';

function getEnvValue(): 'prod' | 'staging' | 'dev' {
  if (NODE_ENV === 'production') return 'prod';
  if (NODE_ENV === 'staging') return 'staging';
  return 'dev';
}

const TELEMETRY_WRITE_URL = process.env.TELEMETRY_WRITE_URL || 'https://scholarship-sage-jamarrlmayes.replit.app/api/analytics/events';
const TELEMETRY_FALLBACK_URL = process.env.TELEMETRY_FALLBACK_URL || 'https://scholarship-api-jamarrlmayes.replit.app/api/events';
const FLUSH_INTERVAL_MS = parseInt(process.env.TELEMETRY_FLUSH_INTERVAL_MS || '10000');
const BATCH_MAX = parseInt(process.env.TELEMETRY_BATCH_MAX || '100');

const SALT = process.env.TELEMETRY_SALT || crypto.randomBytes(16).toString('hex');

export interface TelemetryEvent {
  event_id: string;
  event_type: string;
  ts_utc: string;
  app_id: string;
  env: 'prod' | 'staging' | 'dev';
  version: string;
  session_id: string | null;
  user_id_hash: string | null;
  account_id: string | null;
  actor_type: 'student' | 'provider' | 'system' | null;
  request_id: string | null;
  source_ip_masked: string | null;
  coppa_flag: boolean;
  ferpa_flag: boolean;
  properties: Record<string, unknown>;
}

export class TelemetryClient {
  private eventQueue: TelemetryEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private enabled: boolean = process.env.TELEMETRY_ENABLED !== 'false';
  private authToken: string | null = null;
  private failedAttempts: number = 0;
  private maxRetryDelay: number = 5 * 60 * 1000;

  hashUserId(userId: string): string {
    return crypto.createHash('sha256').update(userId + SALT).digest('hex');
  }

  maskIp(ip: string | undefined): string | null {
    if (!ip) return null;
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
    return null;
  }

  createEvent(
    eventType: string,
    properties: Record<string, unknown> = {},
    options: {
      userId?: string;
      sessionId?: string;
      accountId?: string;
      actorType?: 'student' | 'provider' | 'system';
      requestId?: string;
      sourceIp?: string;
      coppaFlag?: boolean;
      ferpaFlag?: boolean;
    } = {}
  ): TelemetryEvent {
    return {
      event_id: crypto.randomUUID(),
      event_type: eventType,
      ts_utc: new Date().toISOString(),
      app_id: APP_ID,
      env: getEnvValue(),
      version: VERSION,
      session_id: options.sessionId || null,
      user_id_hash: options.userId ? this.hashUserId(options.userId) : null,
      account_id: options.accountId || null,
      actor_type: options.actorType || null,
      request_id: options.requestId || null,
      source_ip_masked: this.maskIp(options.sourceIp),
      coppa_flag: options.coppaFlag ?? false,
      ferpa_flag: options.ferpaFlag ?? false,
      properties
    };
  }

  emit(event: TelemetryEvent): void {
    if (!this.enabled) return;
    
    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= BATCH_MAX) {
      this.flush();
    }
  }

  track(
    eventType: string,
    properties: Record<string, unknown> = {},
    options: Parameters<TelemetryClient['createEvent']>[2] = {}
  ): void {
    const event = this.createEvent(eventType, properties, options);
    this.emit(event);
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(TELEMETRY_WRITE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': APP_ID,
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {})
        },
        body: JSON.stringify({ events: eventsToSend })
      });

      if (response.status === 401) {
        await this.refreshAuthToken();
        await this.retryWithFallback(eventsToSend);
        return;
      }

      if (!response.ok) {
        throw new Error(`Primary endpoint failed: ${response.status}`);
      }

      this.failedAttempts = 0;
      console.log(`📊 Telemetry: Flushed ${eventsToSend.length} events to scholarship_sage`);

    } catch (error) {
      console.warn(`⚠️ Telemetry primary failed:`, error);
      await this.retryWithFallback(eventsToSend);
    }
  }

  private async retryWithFallback(events: TelemetryEvent[]): Promise<void> {
    try {
      const response = await fetch(TELEMETRY_FALLBACK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': APP_ID,
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {})
        },
        body: JSON.stringify({ events })
      });

      if (response.ok) {
        this.failedAttempts = 0;
        console.log(`📊 Telemetry: Flushed ${events.length} events to fallback (scholarship_api)`);
        return;
      }

      throw new Error(`Fallback failed: ${response.status}`);
    } catch (error) {
      await this.storeLocally(events);
    }
  }

  private async storeLocally(events: TelemetryEvent[]): Promise<void> {
    try {
      for (const event of events) {
        await db.insert(businessEvents).values({
          requestId: event.request_id || event.event_id,
          app: event.app_id,
          env: event.env === 'prod' ? 'production' : 'development',
          eventName: event.event_type,
          ts: new Date(event.ts_utc),
          actorType: event.actor_type || 'system',
          actorId: event.user_id_hash,
          sessionId: event.session_id,
          properties: event.properties as Record<string, unknown>
        });
      }
      
      this.failedAttempts = 0;
      console.log(`📊 Telemetry: Stored ${events.length} events locally (business_events table)`);
    } catch (dbError) {
      this.failedAttempts++;
      console.error(`❌ Telemetry: Local storage failed:`, dbError);
      
      const backoffMs = Math.min(
        1000 * Math.pow(2, this.failedAttempts),
        this.maxRetryDelay
      );
      
      setTimeout(() => {
        this.eventQueue.unshift(...events);
      }, backoffMs);
    }
  }

  private async refreshAuthToken(): Promise<void> {
    try {
      const authUrl = process.env.AUTH_ISSUER_URL || 'https://scholar-auth-jamarrlmayes.replit.app';
      const response = await fetch(`${authUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: process.env.AUTH_CLIENT_ID || APP_ID,
          client_secret: process.env.AUTH_CLIENT_SECRET,
          scope: 'telemetry:write',
          audience: 'telemetry'
        })
      });

      if (response.ok) {
        const data = await response.json() as { access_token: string };
        this.authToken = data.access_token;
      }
    } catch (error) {
      console.warn('⚠️ Telemetry: Auth token refresh failed', error);
    }
  }

  emitAppStarted(): void {
    const metrics = productionMetrics.getMetricsSnapshot();
    
    this.track('app_started', {
      uptime_sec: 0,
      p95_ms: metrics.latency.overall.p95,
      error_rate_pct: metrics.errors.errorRate,
      queue_depth: this.eventQueue.length,
      db_status: 'connected',
      ws_status: 'active',
      app_base_url: APP_BASE_URL
    }, {
      actorType: 'system'
    });

    console.log(`📊 Telemetry: app_started emitted for ${APP_ID}`);
  }

  emitHeartbeat(): void {
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    const metrics = productionMetrics.getMetricsSnapshot();
    
    this.track('app_heartbeat', {
      uptime_sec: uptimeSec,
      p95_ms: metrics.latency.overall.p95,
      error_rate_pct: metrics.errors.errorRate,
      queue_depth: this.eventQueue.length,
      db_status: 'connected',
      ws_status: 'active',
      requests_per_sec: metrics.volume.requestsPerSecond
    }, {
      actorType: 'system'
    });
  }

  emitSynthetic(): void {
    console.log(`🧪 Telemetry: Emitting synthetic validation events...`);

    this.track('signup_completed', {
      synthetic: true,
      page: '/signup',
      utm_source: 'synthetic_test'
    }, { actorType: 'student' });

    this.track('match_created', {
      synthetic: true,
      scholarship_id: 'synth-scholarship-001',
      match_score: 85,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }, { actorType: 'student' });

    this.track('page_view', {
      synthetic: true,
      page: '/dashboard',
      referrer: 'synthetic'
    }, { actorType: 'student' });

    console.log(`🧪 Telemetry: 3 synthetic events queued`);
  }

  start(): void {
    if (!this.enabled) {
      console.log('📊 Telemetry: Disabled via TELEMETRY_ENABLED=false');
      return;
    }

    console.log(`📊 Telemetry: Starting client for ${APP_ID}`);
    console.log(`   Primary endpoint: ${TELEMETRY_WRITE_URL}`);
    console.log(`   Fallback endpoint: ${TELEMETRY_FALLBACK_URL}`);
    console.log(`   Flush interval: ${FLUSH_INTERVAL_MS}ms, Batch max: ${BATCH_MAX}`);

    this.emitAppStarted();

    setTimeout(() => {
      this.emitHeartbeat();
    }, 5000);

    this.heartbeatInterval = setInterval(() => {
      this.emitHeartbeat();
    }, 60000);

    this.flushInterval = setInterval(() => {
      this.flush();
    }, FLUSH_INTERVAL_MS);

    if (process.env.SYNTHETIC === 'true') {
      this.emitSynthetic();
    }

    console.log(`✅ Telemetry: Client started with heartbeat (60s) and flush (${FLUSH_INTERVAL_MS}ms)`);
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.flush();
    console.log('📊 Telemetry: Client stopped');
  }

  trackPageView(
    page: string,
    options: {
      userId?: string;
      sessionId?: string;
      requestId?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      referrer?: string;
    } = {}
  ): void {
    this.track('page_view', {
      page,
      utm_source: options.utmSource,
      utm_medium: options.utmMedium,
      utm_campaign: options.utmCampaign,
      referrer: options.referrer
    }, {
      userId: options.userId,
      sessionId: options.sessionId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackSignupStarted(userId: string, options: { requestId?: string } = {}): void {
    this.track('signup_started', {
      page: '/signup'
    }, {
      userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackSignupCompleted(userId: string, options: { requestId?: string } = {}): void {
    this.track('signup_completed', {
      page: '/signup'
    }, {
      userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackMatchCreated(
    scholarshipId: string,
    matchScore: number,
    deadline: string,
    options: { userId?: string; requestId?: string } = {}
  ): void {
    this.track('match_created', {
      scholarship_id: scholarshipId,
      match_score: matchScore,
      deadline
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackApplicationStarted(
    scholarshipId: string,
    options: { userId?: string; requestId?: string } = {}
  ): void {
    this.track('application_started', {
      scholarship_id: scholarshipId
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackApplicationSubmitted(
    scholarshipId: string,
    matchScore: number,
    deadline: string,
    options: { userId?: string; requestId?: string } = {}
  ): void {
    this.track('application_submitted', {
      scholarship_id: scholarshipId,
      match_score: matchScore,
      deadline
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackCreditsPurchased(
    amountUsd: number,
    quantity: number,
    sku: string,
    options: { userId?: string; requestId?: string } = {}
  ): void {
    this.track('credits_purchased', {
      amount_usd: amountUsd,
      quantity,
      sku,
      payment_provider: 'stripe'
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackAiTokensConsumed(
    inputTokens: number,
    outputTokens: number,
    model: string,
    options: { userId?: string; requestId?: string } = {}
  ): void {
    this.track('ai_tokens_consumed', {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      model,
      total_tokens: inputTokens + outputTokens
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackCtaClick(
    cta: string,
    page: string,
    options: { userId?: string; requestId?: string } = {}
  ): void {
    this.track('cta_click', {
      cta,
      page
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }
}

export const telemetryClient = new TelemetryClient();
