import crypto from 'crypto';
import fetch from 'node-fetch';
import { productionMetrics } from '../monitoring/productionMetrics';
import { db } from '../db';
import { businessEvents } from '@shared/schema';

// Protocol ONE TRUTH v1.0: app_id is ALWAYS 'student_pilot'
const APP_ID = 'student_pilot';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app';
const NODE_ENV = process.env.NODE_ENV || 'development';
const VERSION = process.env.GIT_SHA || process.env.npm_package_version || '1.0.0';

// S2S Authentication - Use SHARED_SECRET for service-to-service calls
const SHARED_SECRET = process.env.SHARED_SECRET;
const SCHOLARSHIP_API_BASE = process.env.SCHOLARSHIP_API_BASE_URL || 'https://scholarship-api-jamarrlmayes.replit.app';

// Protocol ONE TRUTH v1.0: env MUST always be 'prod' for central aggregator
function getEnvValue(): 'prod' | 'staging' | 'dev' {
  // Per Protocol ONE TRUTH v1.0 Section "Required conventions": env must be "prod"
  // Always return 'prod' for telemetry events sent to central aggregator
  return 'prod';
}

// PRIMARY: Central aggregator (scholarship_api) - where Command Center reads from
const TELEMETRY_WRITE_URL = process.env.TELEMETRY_WRITE_URL || `${SCHOLARSHIP_API_BASE}/api/analytics/events`;
// FALLBACK: scholarship_sage (if available)
const TELEMETRY_FALLBACK_URL = process.env.TELEMETRY_FALLBACK_URL || 'https://scholarship-sage-jamarrlmayes.replit.app/api/analytics/events';
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
    // Protocol ONE TRUTH v1.0: Include app_base_url in properties
    const enrichedProperties: Record<string, unknown> = {
      ...properties,
      app_base_url: APP_BASE_URL
    };

    return {
      event_id: crypto.randomUUID(),
      event_type: eventType,
      ts_utc: new Date().toISOString(),
      app_id: APP_ID, // Protocol ONE TRUTH: Always 'student_pilot'
      env: getEnvValue(), // Protocol ONE TRUTH: Always 'prod'
      version: VERSION,
      session_id: options.sessionId || null,
      user_id_hash: options.userId ? this.hashUserId(options.userId) : null,
      account_id: options.accountId || null,
      actor_type: options.actorType || null,
      request_id: options.requestId || null,
      source_ip_masked: this.maskIp(options.sourceIp),
      coppa_flag: options.coppaFlag ?? false,
      ferpa_flag: options.ferpaFlag ?? false,
      properties: enrichedProperties
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

  private getS2SHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-App-Id': APP_ID,
      'X-Source-App': APP_ID,
      'X-Request-Type': 'S2S'
    };
    
    // S2S Authentication: Use SHARED_SECRET as Bearer token for service-to-service calls
    // This bypasses CSRF protection on the receiving end
    if (SHARED_SECRET) {
      headers['Authorization'] = `Bearer ${SHARED_SECRET}`;
    } else if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    // Protocol ONE TRUTH v1.0: Validate all events before sending
    const eventsToSend = this.eventQueue.filter(event => {
      if (!event.app_id) {
        console.error(`🚨 Telemetry: Dropping event ${event.event_type} - missing app_id`);
        return false;
      }
      if (!event.event_type) {
        console.error(`🚨 Telemetry: Dropping event - missing event_type`);
        return false;
      }
      return true;
    });
    this.eventQueue = [];

    if (eventsToSend.length === 0) {
      console.log(`📊 Telemetry: No valid events to flush`);
      return;
    }

    // LOUD LOGGING: Make S2S failures visible for debugging
    console.log(`📊 Telemetry: Attempting to flush ${eventsToSend.length} events to ${TELEMETRY_WRITE_URL}`);

    try {
      const response = await fetch(TELEMETRY_WRITE_URL, {
        method: 'POST',
        headers: this.getS2SHeaders(),
        body: JSON.stringify({ 
          events: eventsToSend,
          source: APP_ID,
          timestamp: new Date().toISOString()
        })
      });

      if (response.status === 401 || response.status === 403) {
        // LOUD: Authentication/Authorization failure - this is the CSRF trap!
        console.error(`🚨 TELEMETRY S2S AUTH FAILED: ${response.status} - Central API rejecting S2S request from ${APP_ID}`);
        console.error(`   Headers sent: Authorization=${SHARED_SECRET ? 'Bearer <SHARED_SECRET>' : 'NONE'}`);
        console.error(`   This indicates the central API needs to whitelist S2S Bearer tokens`);
        await this.refreshAuthToken();
        await this.retryWithFallback(eventsToSend);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown');
        console.error(`🚨 TELEMETRY PRIMARY FAILED: ${response.status} - ${errorText}`);
        throw new Error(`Primary endpoint failed: ${response.status}`);
      }

      this.failedAttempts = 0;
      console.log(`✅ Telemetry: Successfully flushed ${eventsToSend.length} events to central aggregator (scholarship_api)`);

    } catch (error) {
      console.error(`🚨 TELEMETRY PRIMARY EXCEPTION:`, error);
      await this.retryWithFallback(eventsToSend);
    }
  }

  private async retryWithFallback(events: TelemetryEvent[]): Promise<void> {
    console.log(`📊 Telemetry: Trying fallback endpoint ${TELEMETRY_FALLBACK_URL}`);
    
    try {
      const response = await fetch(TELEMETRY_FALLBACK_URL, {
        method: 'POST',
        headers: this.getS2SHeaders(),
        body: JSON.stringify({ 
          events,
          source: APP_ID,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        this.failedAttempts = 0;
        console.log(`✅ Telemetry: Flushed ${events.length} events to fallback (scholarship_sage)`);
        return;
      }

      const errorText = await response.text().catch(() => 'unknown');
      console.error(`🚨 TELEMETRY FALLBACK FAILED: ${response.status} - ${errorText}`);
      throw new Error(`Fallback failed: ${response.status}`);
    } catch (error) {
      console.error(`🚨 TELEMETRY: Both remote endpoints failed. Storing locally.`);
      console.error(`   Primary: ${TELEMETRY_WRITE_URL}`);
      console.error(`   Fallback: ${TELEMETRY_FALLBACK_URL}`);
      console.error(`   SHARED_SECRET configured: ${SHARED_SECRET ? 'YES' : 'NO'}`);
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
      console.log(`📊 Telemetry: Stored ${events.length} events locally (business_events table) - DATA IS SILOED`);
      console.log(`   ⚠️  Command Center will NOT see this data until central aggregation is fixed`);
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

  trackPaymentSucceeded(
    amountCents: number,
    currency: string,
    paymentProvider: string,
    options: { userId?: string; requestId?: string; transactionId?: string } = {}
  ): void {
    this.track('payment_succeeded', {
      amount_cents: amountCents,
      currency,
      payment_provider: paymentProvider,
      transaction_id: options.transactionId
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackCreditPurchased(
    amountCents: number,
    quantity: number,
    sku: string,
    options: { userId?: string; requestId?: string; currency?: string } = {}
  ): void {
    this.track('credit_purchased', {
      amount_cents: amountCents,
      quantity,
      sku,
      currency: options.currency || 'USD',
      payment_provider: 'stripe'
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }
}

export const telemetryClient = new TelemetryClient();
