import crypto from 'crypto';
import fetch from 'node-fetch';
import { productionMetrics } from '../monitoring/productionMetrics';
import { db } from '../db';
import { businessEvents } from '@shared/schema';
import { sql } from 'drizzle-orm';

// Protocol ONE_TRUTH v1.2: app_id is ALWAYS 'student_pilot'
const APP_ID = 'student_pilot';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app';
const NODE_ENV = process.env.NODE_ENV || 'development';
const VERSION = process.env.GIT_SHA || process.env.npm_package_version || '1.0.0';

// S2S Authentication - Use SHARED_SECRET for service-to-service calls
const SHARED_SECRET = process.env.SHARED_SECRET;
const SCHOLARSHIP_API_BASE = process.env.SCHOLARSHIP_API_BASE_URL || 'https://scholarship-api-jamarrlmayes.replit.app';

// Protocol ONE_TRUTH v1.2: env MUST always be 'prod' for central aggregator
function getEnvValue(): 'prod' | 'staging' | 'dev' {
  // Per Protocol ONE_TRUTH v1.2 Section "Required conventions": env must be "prod"
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

// Protocol ONE_TRUTH v1.2 compliant event envelope
// Note: Deployed endpoints still use legacy field names (app_id, event_type, ts)
// Master Prompt specifies (app, event_name, ts_iso) but migration is pending
export interface TelemetryEvent {
  event_id: string;
  event_type: string; // Legacy: endpoints still expect "event_type"
  ts: string; // Legacy: endpoints still expect "ts" (ISO-8601)
  app_id: string; // Legacy: endpoints still expect "app_id"
  app_base_url: string; // v1.2: Required at root level
  env: 'prod' | 'staging' | 'dev';
  properties: Record<string, unknown>;
  _meta: {
    protocol: 'ONE_TRUTH';
    version: '1.2'; // Deployed endpoints accept "1.2"
  };
  // Extended fields for internal use
  version?: string;
  session_id?: string | null;
  user_id_hash?: string | null;
  account_id?: string | null;
  actor_type?: 'student' | 'provider' | 'system' | null;
  request_id?: string | null;
  source_ip_masked?: string | null;
  coppa_flag?: boolean;
  ferpa_flag?: boolean;
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
    // Protocol ONE_TRUTH v1.2: Include app_base_url in properties AND at root
    const enrichedProperties: Record<string, unknown> = {
      ...properties,
      app_base_url: APP_BASE_URL
    };

    // Protocol ONE_TRUTH v1.2 compliant envelope (legacy field names for deployed endpoints)
    return {
      event_id: crypto.randomUUID(),
      event_type: eventType, // Legacy: endpoints expect "event_type"
      ts: new Date().toISOString(), // Legacy: endpoints expect "ts" (ISO-8601)
      app_id: APP_ID, // Legacy: endpoints expect "app_id" - always 'student_pilot'
      app_base_url: APP_BASE_URL, // v1.2: Required at root level
      env: getEnvValue(), // Protocol ONE_TRUTH v1.2: Always 'prod'
      properties: enrichedProperties,
      _meta: {
        protocol: 'ONE_TRUTH',
        version: '1.2' // Deployed endpoints accept "1.2"
      },
      // Extended fields
      version: VERSION,
      session_id: options.sessionId || null,
      user_id_hash: options.userId ? this.hashUserId(options.userId) : null,
      account_id: options.accountId || null,
      actor_type: options.actorType || null,
      request_id: options.requestId || null,
      source_ip_masked: this.maskIp(options.sourceIp),
      coppa_flag: options.coppaFlag ?? false,
      ferpa_flag: options.ferpaFlag ?? false
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
    
    // S2S Authentication Priority:
    // 1. M2M JWT token (preferred - short-lived, rotatable)
    // 2. SHARED_SECRET as fallback (static, for bootstrap)
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (SHARED_SECRET) {
      headers['Authorization'] = `Bearer ${SHARED_SECRET}`;
    }
    
    return headers;
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    // Protocol ONE_TRUTH v1.2: Validate all events before sending
    const eventsToSend = this.eventQueue.filter(event => {
      if (!event.app_id) {
        console.error(`🚨 Telemetry: Dropping event ${event.event_type} - missing app_id`);
        return false;
      }
      if (!event.app_base_url) {
        console.error(`🚨 Telemetry: Dropping event ${event.event_type} - missing app_base_url`);
        return false;
      }
      if (!event.event_type) {
        console.error(`🚨 Telemetry: Dropping event - missing event_type`);
        return false;
      }
      if (!event.ts) {
        console.error(`🚨 Telemetry: Dropping event ${event.event_type} - missing ts`);
        return false;
      }
      if (!event._meta || event._meta.protocol !== 'ONE_TRUTH' || event._meta.version !== '1.2') {
        console.error(`🚨 Telemetry: Dropping event ${event.event_type} - invalid _meta block`);
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
    
    // DEBUG: Log event structure for troubleshooting validation issues
    if (eventsToSend.length > 0) {
      console.log(`📊 DEBUG: First event structure: ${JSON.stringify({
        app_id: eventsToSend[0].app_id,
        event_type: eventsToSend[0].event_type,
        has_ts: !!eventsToSend[0].ts,
        has_meta: !!eventsToSend[0]._meta,
        meta_version: eventsToSend[0]._meta?.version
      })}`);
    }

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
          ts: new Date(event.ts),
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
    // Try scholarship_api M2M endpoint first (preferred for telemetry)
    const endpoints = [
      `${SCHOLARSHIP_API_BASE}/api/auth/token`,
      `${process.env.AUTH_ISSUER_URL || 'https://scholar-auth-jamarrlmayes.replit.app'}/oauth/token`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Source-App': APP_ID
          },
          body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: process.env.AUTH_CLIENT_ID || APP_ID,
            client_secret: process.env.AUTH_CLIENT_SECRET || SHARED_SECRET,
            scope: 'telemetry:write',
            audience: 'telemetry'
          })
        });

        if (response.ok) {
          const data = await response.json() as { access_token: string; expires_in?: number };
          this.authToken = data.access_token;
          console.log(`✅ Telemetry: M2M token acquired from ${endpoint}`);
          
          // Schedule token refresh before expiry (default 1 hour, refresh at 50 minutes)
          const expiresIn = data.expires_in || 3600;
          setTimeout(() => this.refreshAuthToken(), (expiresIn - 600) * 1000);
          return;
        }
      } catch (error) {
        // Try next endpoint
        continue;
      }
    }
    
    console.warn('⚠️ Telemetry: M2M token refresh failed, falling back to SHARED_SECRET');
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

    // Try to acquire M2M token on startup
    this.refreshAuthToken().catch(() => {});

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

    // Start backfill process for locally stored events (every 5 minutes)
    setTimeout(() => {
      this.backfillLocalEvents();
    }, 30000); // First backfill after 30 seconds
    
    setInterval(() => {
      this.backfillLocalEvents();
    }, 5 * 60 * 1000); // Then every 5 minutes

    if (process.env.SYNTHETIC === 'true') {
      this.emitSynthetic();
    }

    console.log(`✅ Telemetry: Client started with heartbeat (60s) and flush (${FLUSH_INTERVAL_MS}ms)`);
  }
  
  private async backfillLocalEvents(): Promise<void> {
    try {
      // Query business_events table for events that need to be synced
      const localEvents = await db
        .select()
        .from(businessEvents)
        .where(sql`app = ${APP_ID} AND created_at > NOW() - INTERVAL '24 hours'`)
        .limit(50);
      
      if (localEvents.length === 0) return;
      
      console.log(`📊 Telemetry: Attempting to backfill ${localEvents.length} locally stored events`);
      
      // Convert to Protocol ONE_TRUTH v1.2 compliant format (legacy field names)
      const eventsToSync: TelemetryEvent[] = localEvents.map(evt => ({
        event_id: evt.requestId || crypto.randomUUID(),
        event_type: evt.eventName, // Legacy: endpoints expect "event_type"
        ts: evt.ts?.toISOString() || new Date().toISOString(), // Legacy: endpoints expect "ts"
        app_id: APP_ID, // Legacy: endpoints expect "app_id"
        app_base_url: APP_BASE_URL, // v1.2: Required at root level
        env: getEnvValue(),
        properties: {
          ...(evt.properties as Record<string, unknown> || {}),
          app_base_url: APP_BASE_URL,
          backfilled: true,
          original_ts: evt.ts?.toISOString()
        },
        _meta: {
          protocol: 'ONE_TRUTH' as const,
          version: '1.2' as const // Deployed endpoints accept "1.2"
        },
        // Extended fields
        version: VERSION,
        session_id: evt.sessionId || null,
        user_id_hash: evt.actorId || null,
        account_id: null,
        actor_type: (evt.actorType as 'student' | 'provider' | 'system') || 'system',
        request_id: evt.requestId || null,
        source_ip_masked: null,
        coppa_flag: false,
        ferpa_flag: false
      }));
      
      // Try to send to central aggregator
      const response = await fetch(TELEMETRY_WRITE_URL, {
        method: 'POST',
        headers: this.getS2SHeaders(),
        body: JSON.stringify({ 
          events: eventsToSync,
          source: APP_ID,
          timestamp: new Date().toISOString(),
          backfill: true
        })
      });
      
      if (response.ok) {
        // Delete successfully synced events from local storage
        const eventIds = localEvents.map(e => e.id);
        await db.delete(businessEvents).where(sql`id = ANY(${eventIds})`);
        console.log(`✅ Telemetry: Backfilled ${localEvents.length} events to central aggregator`);
      }
    } catch (error) {
      // Backfill is best-effort, don't spam logs
      if (this.failedAttempts === 0) {
        console.warn(`⚠️ Telemetry: Backfill attempt failed (will retry silently)`);
      }
    }
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

  // Legacy alias - redirects to A5-compliant credit_purchased
  trackCreditsPurchased(
    amountUsd: number,
    quantity: number,
    sku: string,
    options: { userId?: string; requestId?: string } = {}
  ): void {
    // A5 spec uses credit_purchased (singular), redirect for consistency
    this.trackCreditPurchased(
      Math.round(amountUsd * 100), // Convert USD to cents
      quantity, // credits
      'legacy_api', // source
      { ...options, sku, currency: 'USD' }
    );
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
    options: { userId?: string; requestId?: string; transactionId?: string; product?: string; credits?: number; intentId?: string } = {}
  ): void {
    // A5 spec: payment_succeeded {user_id_hash, amount_cents, product, credits, intent_id}
    this.track('payment_succeeded', {
      amount_cents: amountCents,
      product: options.product || 'credits',
      credits: options.credits,
      intent_id: options.intentId || options.transactionId,
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
    credits: number,
    source: string,
    options: { userId?: string; requestId?: string; currency?: string; sku?: string } = {}
  ): void {
    // A5 spec: credit_purchased {user_id_hash, credits, amount_cents, source}
    this.track('credit_purchased', {
      credits,
      amount_cents: amountCents,
      source,
      sku: options.sku,
      currency: options.currency || 'USD',
      payment_provider: 'stripe'
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackPaymentFailed(
    reason: string,
    paymentProvider: string,
    options: { userId?: string; requestId?: string; orderId?: string; amountCents?: number; intentId?: string } = {}
  ): void {
    // A5 spec: payment_failed {reason, amount_cents?, intent_id?}
    this.track('payment_failed', {
      reason,
      amount_cents: options.amountCents,
      intent_id: options.intentId || options.orderId,
      payment_provider: paymentProvider
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackDocumentUploaded(
    documentType: string,
    options: { userId?: string; requestId?: string; documentId?: string; isFirst?: boolean } = {}
  ): void {
    // A5 spec: document_uploaded {document_type, document_id, is_first}
    this.track('document_uploaded', {
      document_type: documentType,
      document_id: options.documentId,
      is_first: options.isFirst || false
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  trackAiAssistUsed(
    tool: string,
    op: string,
    tokensIn: number,
    tokensOut: number,
    options: { userId?: string; requestId?: string; durationMs?: number; creditsCost?: number } = {}
  ): void {
    // A5 spec: ai_assist_used {tool, op, tokens_in, tokens_out}
    this.track('ai_assist_used', {
      tool,
      op,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      total_tokens: tokensIn + tokensOut,
      duration_ms: options.durationMs,
      credits_cost: options.creditsCost
    }, {
      userId: options.userId,
      requestId: options.requestId,
      actorType: 'student'
    });
  }

  // Legacy alias for backward compatibility
  trackAiUsage(
    model: string,
    operation: string,
    inputTokens: number,
    outputTokens: number,
    options: { userId?: string; requestId?: string; durationMs?: number; creditsCost?: number } = {}
  ): void {
    this.trackAiAssistUsed(model, operation, inputTokens, outputTokens, options);
  }
}

export const telemetryClient = new TelemetryClient();
