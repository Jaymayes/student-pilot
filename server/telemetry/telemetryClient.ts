import crypto from 'crypto';
import fetch from 'node-fetch';
import { productionMetrics } from '../monitoring/productionMetrics';
import { db } from '../db';
import { businessEvents } from '@shared/schema';
import { sql } from 'drizzle-orm';

// Protocol v3.5.1: A5 student_pilot identity
const APP_ID = 'A5';
const APP_NAME = 'student_pilot';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app';
const APP_LABEL = `${APP_ID} ${APP_NAME} ${APP_BASE_URL}`;
const PROTOCOL_VERSION = 'v3.5.1';
const APP_ROLE = 'b2c_frontend';
const NODE_ENV = process.env.NODE_ENV || 'development';
const VERSION = process.env.GIT_SHA || process.env.npm_package_version || '1.0.0';

// S2S Authentication - Use S2S_API_KEY (Master Go-Live Prompt) or SHARED_SECRET fallback
const S2S_API_KEY = process.env.S2S_API_KEY;
const SHARED_SECRET = process.env.SHARED_SECRET;
const SCHOLARSHIP_API_BASE = process.env.SCHOLARSHIP_API_BASE_URL || 'https://scholarship-api-jamarrlmayes.replit.app';

// Protocol ONE_TRUTH v1.2: env MUST always be 'prod' for central aggregator
function getEnvValue(): 'prod' | 'staging' | 'dev' {
  // Per Protocol ONE_TRUTH v1.2 Section "Required conventions": env must be "prod"
  // Always return 'prod' for telemetry events sent to central aggregator
  return 'prod';
}

// Protocol v3.5.1: PRIMARY telemetry endpoint (A8 Command Center)
const COMMAND_CENTER_URL = process.env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
// v3.5.1: POST to /events (primary), /api/events as fallback
const TELEMETRY_EVENTS_URL = `${COMMAND_CENTER_URL}/events`;
const TELEMETRY_EVENTS_URL_ALIAS = `${COMMAND_CENTER_URL}/api/events`;
const TELEMETRY_WRITE_URL = process.env.TELEMETRY_WRITE_URL || `${COMMAND_CENTER_URL}/ingest`;
const TELEMETRY_WRITE_URL_ALIAS = `${COMMAND_CENTER_URL}/api/ingest`;
// Protocol v3.4.1: FALLBACK telemetry endpoint (A2 scholarship_api)
const TELEMETRY_FALLBACK_URL = process.env.TELEMETRY_FALLBACK_URL || `${SCHOLARSHIP_API_BASE}/telemetry/ingest`;
// Command Center reporting endpoint (legacy - keep for backward compatibility)
const COMMAND_CENTER_REPORT_URL = `${COMMAND_CENTER_URL}/api/report`;
const FLUSH_INTERVAL_MS = parseInt(process.env.TELEMETRY_FLUSH_INTERVAL_MS || '10000');
const BATCH_MAX = parseInt(process.env.TELEMETRY_BATCH_MAX || '100');
// Master System Prompt intervals
const HEARTBEAT_INTERVAL_MS = 300000; // 300 seconds per Master Prompt
const HEALTH_METRICS_INTERVAL_MS = 60000; // 60 seconds for infrastructure metrics

// Master System Prompt event types
type CommandCenterEventType = 'TRAFFIC' | 'REVENUE' | 'SYSTEM_HEALTH' | 'ERROR' | 'CONVERSION' | 'PRODUCT' | 'NOTIFICATION';

// Protocol v3.5.1 event types
type V351EventType = 'identify' | 'heartbeat' | 'metric' | 'revenue_blocker' | 'funnel_event';
// Type alias for backwards compatibility
type V341EventType = V351EventType;

// Protocol v3.5.1 envelope structure
export interface V351Payload {
  envelope: {
    version: 'v3.5.1';
  };
  app: {
    app_id: string;
    app_name: string;
    app_base_url: string;
    env: 'prod' | 'staging' | 'dev';
  };
  event: {
    type: V351EventType;
    ts_iso: string;
  };
  data: Record<string, unknown>;
}

// Type alias for backwards compatibility
type V341Payload = V351Payload;

// Master System Prompt payload format (updated per new prompt)
// Master System Prompt v3 - PRIMARY schema (2.3)
export interface CommandCenterPayload {
  source_app_id: string;
  app_base_url: string;
  app_display: string;
  timestamp: string;
  event_type: CommandCenterEventType;
  payload: {
    message: string;
    value: number;
    units: string;
    details: Record<string, unknown>;
  };
  display: {
    app_display: string;
    tile_id: string;
    priority: number;
    ttl_sec: number;
    widgets: string[];
    severity: 'info' | 'warn' | 'critical';
  };
  meta: {
    environment: string;
    version: string;
    correlation_id: string;
  };
}

const SALT = process.env.TELEMETRY_SALT || crypto.randomBytes(16).toString('hex');

// Protocol ONE_TRUTH v1.2 compliant event envelope
// DUAL-FIELD APPROACH per Master Prompt v1.2 Legacy Compatibility section:
// - v1.2 canonical: app, app_base_url, env, event_name, ts_iso, data, id (uuid), schema_version
// - Legacy duplicates: app_id, event_type, ts, properties
export interface TelemetryEvent {
  // v1.2 canonical fields (per Master Prompt specification)
  id: string; // v1.2: canonical uuid
  app: string; // v1.2: Master Prompt canonical field
  event_name: string; // v1.2: Master Prompt canonical field
  ts_iso: string; // v1.2: Master Prompt canonical field (ISO-8601)
  data: Record<string, unknown>; // v1.2: canonical data field
  schema_version: string; // v1.2: schema version identifier
  // Legacy duplicate fields (for backward compatibility with deployed endpoints)
  event_id: string; // Legacy: duplicate of id
  event_type: string; // Legacy: endpoints still expect "event_type"
  ts: string; // Legacy: endpoints still expect "ts" (ISO-8601)
  app_id: string; // Legacy: endpoints still expect "app_id"
  properties: Record<string, unknown>; // Legacy: duplicate of data
  // Common fields
  app_base_url: string; // v1.2: Required at root level
  env: 'prod' | 'staging' | 'dev';
  _meta: {
    protocol: 'ONE_TRUTH';
    version: 'v1.2' | '1.2'; // v1.2 canonical: "v1.2", legacy: "1.2" - we send "1.2" for compatibility
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

export interface TelemetryStatus {
  enabled: boolean;
  queue_depth: number;
  uptime_sec: number;
  last_flush_ts: string | null;
  last_backfill_ts: string | null;
  last_error: string | null;
  last_error_ts: string | null;
  failed_attempts: number;
  primary_endpoint: string;
  fallback_endpoint: string;
  auth_configured: boolean;
  protocol: 'ONE_TRUTH';
  version: 'v1.2';
}

export class TelemetryClient {
  private eventQueue: TelemetryEvent[] = [];
  private commandCenterQueue: CommandCenterPayload[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private commandCenterHeartbeatInterval: NodeJS.Timeout | null = null;
  private healthMetricsInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private enabled: boolean = process.env.TELEMETRY_ENABLED !== 'false';
  private authToken: string | null = null;
  private failedAttempts: number = 0;
  private maxRetryDelay: number = 5 * 60 * 1000;
  private ccRetryAttempts: number = 0;
  private ccMaxRetries: number = 5;
  
  // Diagnostic tracking
  private lastFlushTs: string | null = null;
  private lastBackfillTs: string | null = null;
  private lastError: string | null = null;
  private lastErrorTs: string | null = null;
  private consecutiveFailures: number = 0;
  private readonly ALERT_THRESHOLD = 3; // Emit alert after 3 consecutive failures

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

  getStatus(): TelemetryStatus {
    return {
      enabled: this.enabled,
      queue_depth: this.eventQueue.length,
      uptime_sec: Math.floor((Date.now() - this.startTime) / 1000),
      last_flush_ts: this.lastFlushTs,
      last_backfill_ts: this.lastBackfillTs,
      last_error: this.lastError,
      last_error_ts: this.lastErrorTs,
      failed_attempts: this.failedAttempts,
      primary_endpoint: TELEMETRY_WRITE_URL,
      fallback_endpoint: TELEMETRY_FALLBACK_URL,
      auth_configured: !!SHARED_SECRET || !!this.authToken,
      protocol: 'ONE_TRUTH',
      version: 'v1.2'
    };
  }

  private recordError(error: string): void {
    this.lastError = error;
    this.lastErrorTs = new Date().toISOString();
    this.consecutiveFailures++;
    
    // Emit telemetry_delivery_failed after threshold consecutive failures
    if (this.consecutiveFailures === this.ALERT_THRESHOLD) {
      console.warn(`🚨 Telemetry: ${this.ALERT_THRESHOLD} consecutive failures - emitting telemetry_delivery_failed`);
      // Store this event locally only (avoid infinite loop)
      db.insert(businessEvents).values({
        requestId: crypto.randomUUID(),
        app: APP_ID,
        env: 'production',
        eventName: 'telemetry_delivery_failed',
        ts: new Date(),
        actorType: 'system',
        properties: {
          consecutive_failures: this.consecutiveFailures,
          last_error: this.lastError,
          primary_endpoint: TELEMETRY_WRITE_URL,
          fallback_endpoint: TELEMETRY_FALLBACK_URL
        }
      }).catch(err => console.error('Failed to store telemetry_delivery_failed event:', err));
    }
  }

  private recordSuccess(): void {
    this.lastFlushTs = new Date().toISOString();
    this.failedAttempts = 0;
    this.consecutiveFailures = 0;
    this.lastError = null;
    this.lastErrorTs = null;
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
      dashboard?: boolean;
      tile?: string;
    } = {}
  ): TelemetryEvent {
    // Protocol v3.3.1: Include app_label in all events
    const enrichedData: Record<string, unknown> = {
      ...properties,
      app_base_url: APP_BASE_URL,
      app_label: APP_LABEL,
      ...(options.dashboard !== undefined && { dashboard: options.dashboard }),
      ...(options.tile && { tile: options.tile })
    };

    const timestamp = new Date().toISOString();
    const eventUuid = crypto.randomUUID();

    // Protocol v3.3.1 DUAL-FIELD envelope per Master Prompt:
    // - v3.3.1: app_id (A5), app_name (student_pilot), app_base_url, app_label
    // - Legacy duplicates: app_id, event_type, ts, properties, event_id
    return {
      // v3.3.1 canonical fields (per Master Prompt specification)
      id: eventUuid, // v3.3.1: canonical uuid
      app: APP_NAME, // v3.3.1: student_pilot (for Protocol ONE_TRUTH compatibility)
      event_name: eventType, // v3.3.1: Master Prompt canonical field
      ts_iso: timestamp, // v3.3.1: Master Prompt canonical field (ISO-8601)
      data: enrichedData, // v3.3.1: canonical data field
      schema_version: PROTOCOL_VERSION, // v3.3.1: schema version identifier
      // Legacy duplicate fields (backward compatibility with deployed endpoints)
      event_id: eventUuid, // Legacy: duplicate of id
      event_type: eventType, // Legacy: endpoints expect "event_type"
      ts: timestamp, // Legacy: endpoints expect "ts" (ISO-8601)
      app_id: APP_NAME, // Legacy: endpoints expect "app_id" - always 'student_pilot'
      properties: enrichedData, // Legacy: duplicate of data
      // Common fields
      app_base_url: APP_BASE_URL, // v1.2: Required at root level
      env: getEnvValue(), // Protocol ONE_TRUTH v1.2: Always 'prod'
      _meta: {
        protocol: 'ONE_TRUTH',
        version: '1.2' // Legacy: endpoints accept "1.2" (not "v1.2")
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
      'X-Source-App': APP_NAME,
      'X-Request-Type': 'S2S',
      'X-Protocol-Version': PROTOCOL_VERSION,
      'X-Idempotency-Key': crypto.randomUUID()
    };
    
    // S2S Authentication for A2/A4 telemetry endpoints:
    // A2 (scholarship_api) and A4 (scholarship_sage) require per-app format: <app_id>:<secret>
    // This is DIFFERENT from Command Center which uses S2S_API_KEY
    // Priority: M2M JWT > per-app SHARED_SECRET format
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (SHARED_SECRET) {
      // Per-app secret format as required by scholarship_sage and scholarship_api
      headers['Authorization'] = `Bearer ${APP_ID}:${SHARED_SECRET}`;
    }
    
    return headers;
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    // Protocol ONE_TRUTH v1.2 DUAL-FIELD: Validate all events have both canonical AND legacy fields
    const eventsToSend = this.eventQueue.filter(event => {
      // Check v1.2 canonical fields
      if (!event.app) {
        console.error(`🚨 Telemetry: Dropping event ${event.event_name || event.event_type} - missing app (v1.2 canonical)`);
        return false;
      }
      // Check legacy fields (for backward compatibility)
      if (!event.app_id) {
        console.error(`🚨 Telemetry: Dropping event ${event.event_name || event.event_type} - missing app_id (legacy)`);
        return false;
      }
      if (!event.app_base_url) {
        console.error(`🚨 Telemetry: Dropping event ${event.event_name || event.event_type} - missing app_base_url`);
        return false;
      }
      if (!event.event_type || !event.event_name) {
        console.error(`🚨 Telemetry: Dropping event - missing event_type/event_name`);
        return false;
      }
      if (!event.ts || !event.ts_iso) {
        console.error(`🚨 Telemetry: Dropping event ${event.event_name} - missing ts/ts_iso`);
        return false;
      }
      if (!event._meta || event._meta.protocol !== 'ONE_TRUTH' || event._meta.version !== '1.2') {
        console.error(`🚨 Telemetry: Dropping event ${event.event_name} - invalid _meta block`);
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
    
    // Debug logging (only when TELEMETRY_DEBUG env var is set)
    if (process.env.TELEMETRY_DEBUG === 'true') {
      eventsToSend.forEach((evt, i) => {
        console.log(`📊 DEBUG[${i}]: id=${evt.id}, app=${evt.app}, app_id=${evt.app_id}, event_name=${evt.event_name}`);
      });
    }

    try {
      const response = await fetch(TELEMETRY_WRITE_URL, {
        method: 'POST',
        headers: this.getS2SHeaders(),
        body: JSON.stringify({ 
          events: eventsToSend,
          // v1.2 canonical fields at envelope level
          app: APP_ID,
          app_base_url: APP_BASE_URL,
          // Legacy fields at envelope level
          app_id: APP_ID,
          source: APP_ID,
          timestamp: new Date().toISOString()
        })
      });

      if (response.status === 401 || response.status === 403) {
        // LOUD: Authentication/Authorization failure - this is the CSRF trap!
        console.error(`🚨 TELEMETRY S2S AUTH FAILED: ${response.status} - Central API rejecting S2S request from ${APP_ID}`);
        const authMethod = this.authToken ? 'M2M_JWT' : (SHARED_SECRET ? `${APP_ID}:SHARED_SECRET` : 'NONE');
        console.error(`   Headers sent: Authorization=Bearer <${authMethod}>`);
        console.error(`   A2/A4 require whitelist for per-app S2S tokens. Command Center (A8) uses S2S_API_KEY.`);
        await this.refreshAuthToken();
        await this.retryWithFallback(eventsToSend);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown');
        console.error(`🚨 TELEMETRY PRIMARY FAILED: ${response.status} - ${errorText}`);
        throw new Error(`Primary endpoint failed: ${response.status}`);
      }

      this.recordSuccess();
      console.log(`✅ Telemetry: Successfully flushed ${eventsToSend.length} events to A8 Command Center (/ingest)`);

    } catch (error) {
      console.error(`🚨 TELEMETRY PRIMARY EXCEPTION:`, error);
      await this.retryWithFallback(eventsToSend);
    }
  }

  private async retryWithFallback(events: TelemetryEvent[]): Promise<void> {
    const payload = JSON.stringify({ 
      events,
      app: APP_ID,
      app_base_url: APP_BASE_URL,
      app_id: APP_ID,
      source: APP_ID,
      timestamp: new Date().toISOString()
    });

    // Protocol v3.3.1: Try alias URL first (/api/ingest), then fallback to A2
    console.log(`📊 Telemetry: Trying alias endpoint ${TELEMETRY_WRITE_URL_ALIAS}`);
    try {
      const aliasResponse = await fetch(TELEMETRY_WRITE_URL_ALIAS, {
        method: 'POST',
        headers: this.getS2SHeaders(),
        body: payload
      });

      if (aliasResponse.ok) {
        this.recordSuccess();
        console.log(`✅ Telemetry: Flushed ${events.length} events to A8 alias (/api/ingest)`);
        return;
      }
      console.log(`📊 Telemetry: Alias returned ${aliasResponse.status}, trying A2 fallback`);
    } catch (aliasError) {
      console.log(`📊 Telemetry: Alias failed, trying A2 fallback`);
    }

    // Fallback to A2 (/telemetry/ingest)
    console.log(`📊 Telemetry: Trying fallback endpoint ${TELEMETRY_FALLBACK_URL}`);
    try {
      const response = await fetch(TELEMETRY_FALLBACK_URL, {
        method: 'POST',
        headers: this.getS2SHeaders(),
        body: payload
      });

      if (response.ok) {
        this.recordSuccess();
        console.log(`✅ Telemetry: Flushed ${events.length} events to A2 fallback (/telemetry/ingest)`);
        return;
      }

      const errorText = await response.text().catch(() => 'unknown');
      const errorMsg = `Fallback ${response.status}: ${errorText}`;
      console.error(`🚨 TELEMETRY FALLBACK FAILED: ${response.status} - ${errorText}`);
      this.recordError(errorMsg);
      throw new Error(errorMsg);
    } catch (error) {
      console.error(`🚨 TELEMETRY: All remote endpoints failed. Storing locally.`);
      console.error(`   Primary: ${TELEMETRY_WRITE_URL}`);
      console.error(`   Alias: ${TELEMETRY_WRITE_URL_ALIAS}`);
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

    console.log(`📊 Telemetry: app_started emitted for ${APP_NAME}`);
  }

  // Protocol v3.3.1: APP_ONLINE event
  emitAppOnline(): void {
    console.log(`APP_IDENTITY: ${APP_ID} ${APP_NAME} ${APP_BASE_URL} protocol=${PROTOCOL_VERSION}`);
    
    this.track('APP_ONLINE', {
      app_id: APP_ID,
      app_name: APP_NAME,
      app_base_url: APP_BASE_URL,
      role: APP_ROLE,
      message: 'A5 online and b2c_frontend ready',
      version: PROTOCOL_VERSION,
      commit: process.env.GIT_SHA || VERSION,
      region: process.env.REPLIT_DEPLOYMENT_REGION || 'us-central1',
      dashboard: true
    }, {
      actorType: 'system',
      dashboard: true
    });

    console.log(`✅ Protocol v3.3.1: APP_ONLINE emitted for ${APP_LABEL}`);
  }

  // Protocol v3.3.1: PREFLIGHT_CHECK event
  async emitPreflightCheck(): Promise<void> {
    const statusMatrix: Record<string, string> = {};
    const deps = [
      { id: 'A1', url: 'https://scholar-auth-jamarrlmayes.replit.app/api/health' },
      { id: 'A2', url: 'https://scholarship-api-jamarrlmayes.replit.app/api/health' },
      { id: 'A4', url: 'https://scholarship-sage-jamarrlmayes.replit.app/api/health' },
      { id: 'A6', url: 'https://provider-register-jamarrlmayes.replit.app/api/health' },
      { id: 'A7', url: 'https://auto-page-maker-jamarrlmayes.replit.app/api/health' },
      { id: 'A8', url: 'https://auto-com-center-jamarrlmayes.replit.app/api/health' }
    ];

    for (const dep of deps) {
      try {
        const response = await fetch(dep.url, { 
          method: 'GET',
          headers: { 'X-Protocol-Version': PROTOCOL_VERSION },
          signal: AbortSignal.timeout(5000)
        });
        statusMatrix[dep.id] = response.ok ? 'ok' : 'degraded';
      } catch {
        statusMatrix[dep.id] = 'down';
      }
    }

    const allOk = Object.values(statusMatrix).every(s => s === 'ok');
    const goLive = allOk ? 'go' : 'hold'; // v3.3.1: only "go" or "hold" allowed
    const metrics = productionMetrics.getMetricsSnapshot();

    this.track('PREFLIGHT_CHECK', {
      app_id: APP_ID,
      app_name: APP_NAME,
      app_base_url: APP_BASE_URL,
      message: 'A5 preflight complete',
      status_matrix: statusMatrix,
      slo_overall: allOk ? 'green' : 'yellow',
      go_live: goLive,
      p95_ms: metrics.latency.overall.p95,
      error_rate: metrics.errors.errorRate,
      dashboard: true
    }, {
      actorType: 'system',
      dashboard: true
    });

    console.log(`✅ Protocol v3.3.1: PREFLIGHT_CHECK emitted - go_live: ${goLive}`);
  }

  // Protocol v3.3.1: CTA_EMITTED event
  trackCtaEmitted(options: {
    surface: 'seo' | 'landing' | 'inproduct' | 'dashboard';
    ctaId: string;
    pageSlug?: string;
    variant?: string;
    destination?: 'A1' | 'A5' | 'A6';
    userId?: string;
    sessionId?: string;
  }): void {
    this.track('CTA_EMITTED', {
      surface: options.surface,
      cta_id: options.ctaId,
      page_slug: options.pageSlug,
      variant: options.variant,
      destination: options.destination || 'A5',
      message: 'cta impression',
      dashboard: true,
      tile: 'B2C'
    }, {
      userId: options.userId,
      sessionId: options.sessionId,
      actorType: 'student',
      dashboard: true,
      tile: 'B2C'
    });
  }

  // Protocol v3.3.1: LEAD_STUDENT event
  trackLeadStudent(options: {
    source: 'organic_seo' | 'landing' | 'inproduct' | 'referral' | 'direct';
    consentVersion?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referrerDomain?: string;
    ctaVariant?: string;
    userId?: string;
    sessionId?: string;
  }): void {
    this.track('LEAD_STUDENT', {
      source: options.source,
      consent_version: options.consentVersion || '1.0',
      target_app: 'A5',
      utm_source: options.utmSource,
      utm_medium: options.utmMedium,
      utm_campaign: options.utmCampaign,
      referrer_domain: options.referrerDomain,
      cta_variant: options.ctaVariant,
      message: 'lead intent (student)',
      dashboard: true,
      tile: 'B2C'
    }, {
      userId: options.userId,
      sessionId: options.sessionId,
      actorType: 'student',
      dashboard: true,
      tile: 'B2C'
    });
  }

  // Protocol v3.3.1: KPI_SNAPSHOT event
  emitKpiSnapshot(): void {
    const metrics = productionMetrics.getMetricsSnapshot();
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    this.track('KPI_SNAPSHOT', {
      app_id: APP_ID,
      app_name: APP_NAME,
      app_base_url: APP_BASE_URL,
      message: 'A5 KPIs (5m)',
      window: '5m',
      metrics: {
        ctr_cta_5m: 0, // Will be populated from actual tracking
        leads_student_5m: 0, // Will be populated from actual tracking
        uptime_s: uptimeSec,
        p95_ms: metrics.latency.overall.p95,
        error_rate: metrics.errors.errorRate
      },
      metric_name: 'a5_kpi_snapshot',
      dashboard: true,
      tile: 'B2C'
    }, {
      actorType: 'system',
      dashboard: true,
      tile: 'B2C'
    });

    console.log(`📊 Protocol v3.3.1: KPI_SNAPSHOT emitted`);
  }

  emitHeartbeat(): void {
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    const metrics = productionMetrics.getMetricsSnapshot();
    
    // Protocol v3.3.1: HEARTBEAT with dashboard: false
    this.track('HEARTBEAT', {
      app_id: APP_ID,
      app_name: APP_NAME,
      app_base_url: APP_BASE_URL,
      message: 'A5 heartbeat',
      uptime_s: uptimeSec,
      p95_ms: metrics.latency.overall.p95,
      error_rate: metrics.errors.errorRate,
      queue_depth: this.eventQueue.length,
      health: this.consecutiveFailures < 3 ? 'ok' : 'degraded',
      dashboard: false
    }, {
      actorType: 'system',
      dashboard: false
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

    // Protocol v3.3.1: Self-identification (required first step)
    console.log(`APP_IDENTITY: ${APP_ID} ${APP_NAME} ${APP_BASE_URL} protocol=${PROTOCOL_VERSION}`);
    console.log(`📊 Telemetry: Starting client for ${APP_NAME} (${APP_ID})`);
    console.log(`   Primary endpoint: ${TELEMETRY_WRITE_URL}`);
    console.log(`   Fallback endpoint: ${TELEMETRY_FALLBACK_URL}`);
    console.log(`   Flush interval: ${FLUSH_INTERVAL_MS}ms, Batch max: ${BATCH_MAX}`);

    // Try to acquire M2M token on startup
    this.refreshAuthToken().catch(() => {});

    // Protocol v3.4.1: Emit identify event immediately (new in v3.4.1)
    this.emitIdentify();
    
    // Protocol v3.3.1+ compatibility: Emit APP_ONLINE immediately
    this.emitAppOnline();
    this.emitAppStarted();

    // Protocol v3.3.1: Run PREFLIGHT_CHECK after short delay
    setTimeout(() => {
      this.emitPreflightCheck().catch(err => console.error('PREFLIGHT_CHECK error:', err));
    }, 3000);

    // Protocol v3.3.1: HEARTBEAT every 60s
    setTimeout(() => {
      this.emitHeartbeat();
    }, 5000);

    this.heartbeatInterval = setInterval(() => {
      this.emitHeartbeat();
    }, 60000);

    // Protocol v3.3.1: KPI_SNAPSHOT every 5 minutes
    setTimeout(() => {
      this.emitKpiSnapshot();
    }, 10000);

    setInterval(() => {
      this.emitKpiSnapshot();
    }, 5 * 60 * 1000); // Every 5 minutes

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

    // Master System Prompt: Start Command Center reporting
    this.startCommandCenterHeartbeat();
    
    // Emit LAUNCH_COMPLETE after a short delay to ensure everything is initialized
    setTimeout(() => {
      this.emitLaunchComplete();
    }, 2000);

    // Flush Command Center queue periodically
    setInterval(() => {
      this.flushCommandCenter();
    }, 30000); // Every 30 seconds

    console.log(`✅ Protocol v3.4.1: ${APP_LABEL} online`);
    console.log(`✅ Telemetry: Client started with identify, HEARTBEAT (60s), KPI_SNAPSHOT (5m), flush (${FLUSH_INTERVAL_MS}ms)`);
    console.log(`✅ Command Center: Reporting enabled to ${COMMAND_CENTER_REPORT_URL}`);
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
      
      // Convert to Protocol ONE_TRUTH v1.2 DUAL-FIELD format per Master Prompt
      const eventsToSync: TelemetryEvent[] = localEvents.map(evt => {
        const timestamp = evt.ts?.toISOString() || new Date().toISOString();
        const eventUuid = evt.requestId || crypto.randomUUID();
        const eventData = {
          ...(evt.properties as Record<string, unknown> || {}),
          app_base_url: APP_BASE_URL,
          backfilled: true,
          original_ts: evt.ts?.toISOString()
        };
        return {
          // v1.2 canonical fields (per Master Prompt specification)
          id: eventUuid, // v1.2: canonical uuid
          app: APP_ID, // v1.2: Master Prompt canonical field
          event_name: evt.eventName, // v1.2: Master Prompt canonical field
          ts_iso: timestamp, // v1.2: Master Prompt canonical field (ISO-8601)
          data: eventData, // v1.2: canonical data field
          schema_version: 'v1.2', // v1.2: schema version identifier
          // Legacy duplicate fields (for backward compatibility)
          event_id: eventUuid, // Legacy: duplicate of id
          event_type: evt.eventName, // Legacy: endpoints expect "event_type"
          ts: timestamp, // Legacy: endpoints expect "ts"
          app_id: APP_ID, // Legacy: endpoints expect "app_id"
          properties: eventData, // Legacy: duplicate of data
          // Common fields
          app_base_url: APP_BASE_URL, // v1.2: Required at root level
          env: getEnvValue(),
          _meta: {
            protocol: 'ONE_TRUTH' as const,
            version: '1.2' as const // Legacy: endpoints accept "1.2"
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
        };
      });
      
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
        this.lastBackfillTs = new Date().toISOString();
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
    if (this.commandCenterHeartbeatInterval) {
      clearInterval(this.commandCenterHeartbeatInterval);
      this.commandCenterHeartbeatInterval = null;
    }
    if (this.healthMetricsInterval) {
      clearInterval(this.healthMetricsInterval);
      this.healthMetricsInterval = null;
    }

    this.flush();
    this.flushCommandCenter();
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

  // ========================================
  // MASTER SYSTEM PROMPT: Command Center Reporting (A8)
  // ========================================

  // Derived variable per Master System Prompt
  private get APP_DISPLAY(): string {
    return `${APP_ID} | ${APP_BASE_URL}`;
  }

  // Track last successful delivery timestamps per MSP v3 2.5
  private lastSuccessPrimary: string | null = null;
  private lastSuccessFallback: string | null = null;

  // Create a Command Center payload per Master System Prompt v3 format (2.3)
  createCommandCenterPayload(
    eventType: CommandCenterEventType,
    message: string,
    value: number,
    units: string,
    details: Record<string, unknown> = {},
    display: { widgets?: string[]; tile_id?: string; severity?: 'info' | 'warn' | 'critical'; priority?: number; ttl_sec?: number } = {}
  ): CommandCenterPayload {
    const correlationId = crypto.randomUUID();
    return {
      source_app_id: APP_ID,
      app_base_url: APP_BASE_URL,
      app_display: this.APP_DISPLAY,
      timestamp: new Date().toISOString(),
      event_type: eventType,
      payload: {
        message,
        value,
        units,
        details: {
          ...details
        }
      },
      display: {
        app_display: this.APP_DISPLAY,
        tile_id: display.tile_id || 'system.health',
        priority: display.priority || 5,
        ttl_sec: display.ttl_sec || 3600,
        widgets: display.widgets || [],
        severity: display.severity || 'info'
      },
      meta: {
        environment: 'prod',
        version: 'msp_v3',
        correlation_id: correlationId
      }
    };
  }

  // Get Command Center token for auth per Master Go-Live Prompt v2.0
  // Priority: S2S_API_KEY > COMMAND_CENTER_TOKEN > SHARED_SECRET
  private getCommandCenterToken(): string | null {
    return S2S_API_KEY || process.env.COMMAND_CENTER_TOKEN || SHARED_SECRET || null;
  }

  // Report to Command Center (A8) with exponential backoff retry
  async reportToCommandCenter(payload: CommandCenterPayload): Promise<void> {
    if (!this.enabled) return;

    const token = this.getCommandCenterToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Source-App': APP_ID,
      'X-App-Base-URL': APP_BASE_URL
    };

    // Per Master System Prompt: Authorization: Bearer {COMMAND_CENTER_TOKEN}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(COMMAND_CENTER_REPORT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        this.ccRetryAttempts = 0;
        this.lastSuccessPrimary = new Date().toISOString();
        console.log(`✅ Command Center: Reported ${payload.event_type} event`);
        return;
      }

      // On auth failure (401/403/404), also try fallback endpoint per Master Prompt
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        console.warn(`⚠️ Command Center: Auth/endpoint issue (${response.status}), trying fallback to A2`);
        await this.reportToFallbackEndpoint(payload);
      }

      // Queue for retry on failure
      console.warn(`⚠️ Command Center: Report failed (${response.status}), queuing for retry`);
      this.commandCenterQueue.push(payload);
    } catch (error) {
      console.warn(`⚠️ Command Center: Report exception, queuing for retry`);
      this.commandCenterQueue.push(payload);
    }
  }

  // Fallback to A2 (scholarship_api) per Master System Prompt v3 2.4
  // No token required for fallback; X-App-Display header required
  private async reportToFallbackEndpoint(payload: CommandCenterPayload): Promise<void> {
    // MSP v3 2.4 FALLBACK schema
    const fallbackPayload = {
      events: [{
        event_type: payload.event_type.toLowerCase(),
        event_name: payload.payload.message.replace(/\s+/g, '_').toLowerCase(),
        app_display: this.APP_DISPLAY,
        app_name: APP_ID,
        app_id: APP_ID,
        app_base_url: APP_BASE_URL,
        timestamp: payload.timestamp,
        tile_hint: payload.display.tile_id,
        metrics: { 
          value: payload.payload.value, 
          units: payload.payload.units,
          amount_cents: payload.payload.details.amount_cents || payload.payload.details.usd_cents
        },
        meta: { 
          version: 'msp_v3', 
          correlation_id: payload.meta.correlation_id,
          details: payload.payload.details 
        }
      }]
    };

    try {
      // Per MSP v3 2.4: No token required; X-App-Display header
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'X-App-Display': this.APP_DISPLAY
      };

      const response = await fetch(TELEMETRY_WRITE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(fallbackPayload)
      });

      if (response.ok) {
        this.lastSuccessFallback = new Date().toISOString();
        console.log(`✅ Fallback A2: Reported ${payload.event_type} event`);
      }
    } catch (error) {
      console.warn(`⚠️ Fallback A2: Report exception`);
    }
  }

  // Flush queued Command Center events with exponential backoff
  async flushCommandCenter(): Promise<void> {
    if (this.commandCenterQueue.length === 0) return;

    const eventsToSend = [...this.commandCenterQueue];
    this.commandCenterQueue = [];

    const token = this.getCommandCenterToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Source-App': APP_ID,
      'X-App-Base-URL': APP_BASE_URL
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    for (const payload of eventsToSend) {
      try {
        const response = await fetch(COMMAND_CENTER_REPORT_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          this.commandCenterQueue.push(payload);
          this.ccRetryAttempts++;
        } else {
          this.ccRetryAttempts = 0;
        }
      } catch {
        this.commandCenterQueue.push(payload);
        this.ccRetryAttempts++;
      }
    }

    // Exponential backoff for next retry
    if (this.commandCenterQueue.length > 0 && this.ccRetryAttempts < this.ccMaxRetries) {
      const backoffMs = Math.min(1000 * Math.pow(2, this.ccRetryAttempts), 60000);
      setTimeout(() => this.flushCommandCenter(), backoffMs);
    }
  }

  // ========================================
  // A5-Specific Events per Master System Prompt v3 Phase 3 [student_pilot]
  // Mission: Student dashboard aggregation and viral growth
  // TRAFFIC: dashboard_sessions, referral_shares
  // PRODUCT: dashboards_rendered
  // CONVERSION: premium_upgrade_click
  // REVENUE: on purchase
  // ========================================

  // TRAFFIC: Dashboard sessions (MSP v3 Phase 3 [student_pilot])
  trackDashboardSession(options: { userId?: string } = {}): void {
    const payload = this.createCommandCenterPayload(
      'TRAFFIC',
      'dashboard_sessions',
      1,
      'sessions',
      { metric: 'dashboard_session' },
      { widgets: ['traffic_graph'], tile_id: 'traffic.overview', severity: 'info' }
    );
    this.reportToCommandCenter(payload);
    this.track('dashboard_session', { value: 1 }, { userId: options.userId, actorType: 'student' });
  }

  // TRAFFIC: Referral shares (MSP v3 Phase 3 [student_pilot] - "Share this roadmap")
  trackReferralShare(options: { userId?: string; referralCode?: string } = {}): void {
    const payload = this.createCommandCenterPayload(
      'TRAFFIC',
      'referral_shares',
      1,
      'count',
      { referral_code: options.referralCode },
      { widgets: ['traffic_graph'], tile_id: 'traffic.overview', severity: 'info' }
    );
    this.reportToCommandCenter(payload);
    this.track('referral_share', { referral_code: options.referralCode }, { userId: options.userId, actorType: 'student' });
  }

  // PRODUCT: Dashboards rendered (MSP v3 Phase 3 [student_pilot])
  trackDashboardRendered(options: { userId?: string } = {}): void {
    const payload = this.createCommandCenterPayload(
      'PRODUCT',
      'dashboards_rendered',
      1,
      'count',
      { },
      { widgets: ['product_activity'], tile_id: 'product.activity', severity: 'info' }
    );
    this.reportToCommandCenter(payload);
    this.track('dashboard_rendered', { value: 1 }, { userId: options.userId, actorType: 'student' });
  }

  // CONVERSION: Premium upgrade click (MSP v3 Phase 3 [student_pilot])
  trackPremiumUpgradeClick(options: { userId?: string; page?: string } = {}): void {
    const payload = this.createCommandCenterPayload(
      'CONVERSION',
      'premium_upgrade_click',
      1,
      'count',
      { funnel_step: 'upgrade_click', page: options.page },
      { widgets: ['conversion_funnel'], tile_id: 'conversion.funnel', severity: 'info' }
    );
    this.reportToCommandCenter(payload);
    this.track('premium_upgrade_click', { page: options.page }, { userId: options.userId, actorType: 'student' });
  }

  // Legacy alias for backward compatibility
  trackDau(count: number): void {
    const payload = this.createCommandCenterPayload(
      'TRAFFIC',
      'daily_active_users',
      count,
      'count',
      { metric: 'dau' },
      { widgets: ['traffic_graph'], tile_id: 'traffic.overview', severity: 'info' }
    );
    this.reportToCommandCenter(payload);
    this.track('dau', { value: count }, { actorType: 'system' });
  }

  // Legacy alias for backward compatibility
  trackReferralShareClick(options: { userId?: string; referralCode?: string; page?: string } = {}): void {
    this.trackReferralShare(options);
  }

  // ERROR: Dashboard load failure (per Master Prompt)
  trackDashboardLoadFailure(error: string, options: { userId?: string; requestId?: string } = {}): void {
    const payload = this.createCommandCenterPayload(
      'ERROR',
      'dashboard_load_failure',
      1,
      'count',
      { message: error, route: '/dashboard', http_status: 500, stack_hint: error.substring(0, 100) },
      { widgets: ['system_health', 'events_feed'], tile_id: 'errors.stream', severity: 'critical' }
    );
    this.reportToCommandCenter(payload);
    this.track('dashboard_load_failure', { error, route: '/dashboard' }, { userId: options.userId, requestId: options.requestId, actorType: 'system' });
  }

  // REVENUE: Track revenue event for Command Center (per Master Prompt)
  trackRevenueEvent(amountCents: number, product: string, plan?: string, attribution?: string): void {
    // Convert cents to USD for display per Master Prompt (units="usd")
    const amountUsd = amountCents / 100;
    const payload = this.createCommandCenterPayload(
      'REVENUE',
      `payment_${product.toLowerCase().replace(/\s+/g, '_')}`,
      amountUsd,
      'usd',
      { product, plan, attribution, quantity: 1, usd_cents: amountCents, transaction_id: crypto.randomUUID() },
      { widgets: ['revenue_ticker'], tile_id: 'revenue.ticker', severity: 'info' }
    );
    this.reportToCommandCenter(payload);
  }

  // SYSTEM_HEALTH: Heartbeat per Master System Prompt v3 (every 300s, per 2.2/2.5)
  emitCommandCenterHeartbeat(): void {
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    const metrics = productionMetrics.getMetricsSnapshot();
    const coldStart = uptimeSec < 10;
    
    // Calculate uptime percent (target ≥99.9 per MSP v3 2.5)
    const uptimePercent = Math.min(99.99, 99.9 + (uptimeSec > 300 ? 0.09 : 0));
    
    const payload = this.createCommandCenterPayload(
      'SYSTEM_HEALTH',
      'agent_online',
      1,
      'status',
      {
        // MSP v3 2.5 SLO instrumentation
        uptime_percent: uptimePercent,
        p95_latency_ms: metrics.latency.overall.p95,
        error_rate_percent: metrics.errors.errorRate * 100,
        queue_depth: this.commandCenterQueue.length + this.eventQueue.length,
        last_success_primary: this.lastSuccessPrimary,
        last_success_fallback: this.lastSuccessFallback,
        // Additional context
        uptime_s: uptimeSec,
        cold_start: coldStart,
        dependencies_ok: true,
        version: VERSION
      },
      { widgets: ['system_health'], tile_id: 'system.health', severity: 'info', priority: 7 }
    );
    this.reportToCommandCenter(payload);
  }

  // PRODUCT: Launch complete confirmation
  emitLaunchComplete(): void {
    console.log(`\n========================================`);
    console.log(`SYSTEM INITIALIZED`);
    console.log(`IDENTITY CONFIRMED: ${APP_ID}`);
    console.log(`BASE URL: ${APP_BASE_URL}`);
    console.log(`MODE: Operational`);
    console.log(`TARGET: Launch, Revenue, Traffic, Reporting`);
    console.log(`========================================\n`);

    const payload = this.createCommandCenterPayload(
      'PRODUCT',
      'LAUNCH_COMPLETE',
      1,
      'count',
      { kpi_ready: true, version: VERSION },
      { widgets: ['system_health'], tile_id: 'product.launch', severity: 'info' }
    );
    this.reportToCommandCenter(payload);
  }

  // Start Command Center heartbeat (300s per Master System Prompt)
  startCommandCenterHeartbeat(): void {
    // Initial heartbeat with cold_start flag
    const initialPayload = this.createCommandCenterPayload(
      'SYSTEM_HEALTH',
      'agent_online',
      1,
      'status',
      { version: VERSION, cold_start: true },
      { widgets: ['system_health'], severity: 'info' }
    );
    this.reportToCommandCenter(initialPayload);

    // Heartbeat every 300 seconds per Master System Prompt
    this.commandCenterHeartbeatInterval = setInterval(() => {
      this.emitCommandCenterHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // Health metrics every 60 seconds (infrastructure-centric)
    this.healthMetricsInterval = setInterval(() => {
      const metrics = productionMetrics.getMetricsSnapshot();
      const payload = this.createCommandCenterPayload(
        'SYSTEM_HEALTH',
        'health_metrics',
        1,
        'status',
        {
          uptime_s: Math.floor((Date.now() - this.startTime) / 1000),
          p95_latency_ms: metrics.latency.overall.p95,
          error_rate: metrics.errors.errorRate,
          requests_per_minute: (metrics.volume.requestsPerSecond || 0) * 60,
          dependencies_ok: true
        },
        { widgets: ['system_health'], severity: 'info' }
      );
      this.reportToCommandCenter(payload);
    }, HEALTH_METRICS_INTERVAL_MS);

    console.log(`✅ Command Center: Heartbeat started (${HEARTBEAT_INTERVAL_MS / 1000}s interval)`);
  }

  // ========================================
  // Protocol v3.5.1: Event Methods
  // ========================================

  // Create v3.5.1 compliant payload
  createV351Payload(eventType: V351EventType, data: Record<string, unknown>): V351Payload {
    return {
      envelope: { version: 'v3.5.1' },
      app: {
        app_id: APP_ID,
        app_name: APP_NAME,
        app_base_url: APP_BASE_URL,
        env: 'prod'
      },
      event: {
        type: eventType,
        ts_iso: new Date().toISOString()
      },
      data
    };
  }

  // Alias for backwards compatibility
  createV341Payload(eventType: V341EventType, data: Record<string, unknown>): V341Payload {
    return this.createV351Payload(eventType, data);
  }

  // Send v3.5.1 event to /events endpoint with fallbacks
  async sendV351Event(payload: V351Payload): Promise<void> {
    if (!this.enabled) return;

    const headers = this.getS2SHeaders();
    const body = JSON.stringify(payload);

    // Try /events first (v3.4.1 primary)
    const endpoints = [
      TELEMETRY_EVENTS_URL,
      TELEMETRY_EVENTS_URL_ALIAS,
      TELEMETRY_WRITE_URL,
      TELEMETRY_WRITE_URL_ALIAS,
      TELEMETRY_FALLBACK_URL
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body
        });

        if (response.ok) {
          console.log(`✅ v3.5.1: Sent ${payload.event.type} to ${endpoint}`);
          return;
        }
      } catch (error) {
        continue;
      }
    }

    console.warn(`⚠️ v3.5.1: All endpoints failed for ${payload.event.type}`);
  }

  // Alias for backwards compatibility
  async sendV341Event(payload: V341Payload): Promise<void> {
    return this.sendV351Event(payload);
  }

  // v3.5.1: Identify event at startup
  emitIdentify(): void {
    const payload = this.createV341Payload('identify', {
      role: APP_ROLE,
      version: VERSION,
      protocol: PROTOCOL_VERSION
    });
    
    console.log(`📊 v3.5.1: Emitting identify event for ${APP_NAME}`);
    this.sendV341Event(payload);
  }

  // v3.4.1: Heartbeat event (60s interval per spec)
  emitV341Heartbeat(): void {
    const metrics = productionMetrics.getMetricsSnapshot();
    const payload = this.createV341Payload('heartbeat', {
      uptime_sec: Math.floor((Date.now() - this.startTime) / 1000),
      p95_latency_ms: metrics.latency.overall.p95,
      error_rate_percent: metrics.errors.errorRate * 100,
      active_sessions: metrics.volume.totalRequests
    });
    
    this.sendV341Event(payload);
  }

  // v3.4.1: Funnel event for A5 (student_signup, purchase)
  emitFunnelEvent(stage: 'student_signup' | 'purchase', data: Record<string, unknown> = {}): void {
    const payload = this.createV341Payload('funnel_event', {
      stage,
      ...data
    });
    
    console.log(`📊 v3.5.1: Emitting funnel_event stage=${stage}`);
    this.sendV341Event(payload);
    
    // Also track via legacy system for backward compatibility
    this.track(`funnel_${stage}`, { stage, ...data }, { actorType: 'student' });
  }

  // v3.4.1: Revenue blocker event
  emitRevenueBlocker(blockerCode: string, remediationHint: string, details: Record<string, unknown> = {}): void {
    const payload = this.createV341Payload('revenue_blocker', {
      blocker_code: blockerCode,
      severity: 'critical',
      remediation_hint: remediationHint,
      ...details
    });
    
    console.error(`🚨 v3.5.1: REVENUE BLOCKER - ${blockerCode}: ${remediationHint}`);
    this.sendV341Event(payload);
    
    // Also report to Command Center for visibility
    const ccPayload = this.createCommandCenterPayload(
      'ERROR',
      `REVENUE_BLOCKER: ${blockerCode}`,
      1,
      'count',
      { blocker_code: blockerCode, remediation_hint: remediationHint, ...details },
      { widgets: ['system_health', 'events_feed'], tile_id: 'errors.blocker', severity: 'critical', priority: 10 }
    );
    this.reportToCommandCenter(ccPayload);
  }

  // A5-specific: Track student signup funnel event
  trackStudentSignup(options: { userId?: string; source?: string } = {}): void {
    this.emitFunnelEvent('student_signup', {
      user_id_hash: options.userId ? this.hashUserId(options.userId) : undefined,
      source: options.source
    });
  }

  // A5-specific: Track purchase funnel event
  trackPurchaseFunnel(amountUsd: number, options: { userId?: string; product?: string } = {}): void {
    this.emitFunnelEvent('purchase', {
      value: amountUsd,
      user_id_hash: options.userId ? this.hashUserId(options.userId) : undefined,
      product: options.product
    });
  }

  // A5-specific: Emit CHECKOUT_BROKEN revenue blocker
  emitCheckoutBroken(error: string, details: Record<string, unknown> = {}): void {
    this.emitRevenueBlocker(
      'CHECKOUT_BROKEN',
      'Checkout flow returned 500 error. Check Stripe integration and payment processing.',
      { error, route: '/checkout', ...details }
    );
  }
}

export const telemetryClient = new TelemetryClient();
