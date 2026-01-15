import { env } from '../../server/environment';

const A8_BASE_URL = env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';

export interface MaintenanceCommsConfig {
  incidentId: string;
  triggerTime: string;
  nextUpdateTime: string;
  errorRate: number;
  p95Ms: number;
  rollbackBuildId: string;
  uptimeTarget: string;
}

export interface CommsPayload {
  channel: 'banner' | 'status_page' | 'email' | 'cs_talk_track';
  content: string;
  metadata: Record<string, unknown>;
}

const INCIDENT_ID = 'A6-PRV-2026-01-15';
const TRIGGER_TIME = '2026-01-15T09:21:13Z';
const UPTIME_TARGET = '99.9%';

export function generateBannerCopy(config: MaintenanceCommsConfig): CommsPayload {
  const nextUpdate = new Date(new Date(config.triggerTime).getTime() + 30 * 60 * 1000).toISOString();
  
  return {
    channel: 'banner',
    content: `Provider onboarding is temporarily unavailable while we complete reliability maintenance. Student services remain fully available. Incident ID: ${config.incidentId}. Next update: ${nextUpdate.slice(11, 16)} UTC.`,
    metadata: {
      incidentId: config.incidentId,
      nextUpdate,
      studentServicesStatus: 'available',
      providerServicesStatus: 'degraded'
    }
  };
}

export function generateStatusPageIncident(config: MaintenanceCommsConfig): CommsPayload {
  return {
    channel: 'status_page',
    content: JSON.stringify({
      title: 'A6 Provider onboarding degraded',
      impact: 'Provider sign-ups and credential verification unavailable; existing provider dashboards unaffected.',
      metrics: {
        uptimeTarget: config.uptimeTarget,
        currentErrorRate: `${(config.errorRate * 100).toFixed(2)}%`,
        currentP95: `${config.p95Ms}ms`,
        rollbackBuildId: config.rollbackBuildId
      },
      eta: 'Restoration targeted within current gate; next checkpoint 10:11:13Z.',
      incidentId: config.incidentId
    }, null, 2),
    metadata: {
      incidentId: config.incidentId,
      severity: 'degraded',
      affectedServices: ['provider_onboarding', 'credential_verification'],
      unaffectedServices: ['provider_dashboards', 'student_services']
    }
  };
}

export function generatePartnerEmail(config: MaintenanceCommsConfig): CommsPayload {
  return {
    channel: 'email',
    content: `Subject: Action required: temporary pause on provider onboarding (A6)

Dear Partner,

We are pausing new provider onboarding while we complete a reliability rollback on the A6 Provider App. Student services are unaffected.

Our standard is ${config.uptimeTarget} availability; today's regression tripped our automatic safeguards.

We will reopen onboarding after 30 minutes of clean health (P95 <1.25s, error <0.5%).

You'll receive an all-clear or next ETA at 10:11:13Z.

Incident ID: ${config.incidentId}

If you have pilot timelines, reply and we will prioritize a white-glove onboarding session once services resume.

Best regards,
ScholarLink Operations`,
    metadata: {
      incidentId: config.incidentId,
      template: 'partner_maintenance',
      sla: '5min_from_trigger',
      updateFrequency: '30min'
    }
  };
}

export function generateCSTalkTrack(): CommsPayload {
  return {
    channel: 'cs_talk_track',
    content: `Safety interlock engaged; no data loss; onboarding resumes after sustained green. We can provision sandboxes without production writes if needed.`,
    metadata: {
      useCases: ['customer_inquiry', 'sales_call', 'support_ticket'],
      escalationPath: 'partnerships_lead'
    }
  };
}

export interface StagedComms {
  staged: boolean;
  triggerAt: string;
  autoSendEnabled: boolean;
  comms: CommsPayload[];
  config: MaintenanceCommsConfig;
}

let stagedComms: StagedComms | null = null;
let autoSendTimer: NodeJS.Timeout | null = null;

export function stageMaintenanceComms(config: MaintenanceCommsConfig): StagedComms {
  const comms: CommsPayload[] = [
    generateBannerCopy(config),
    generateStatusPageIncident(config),
    generatePartnerEmail(config),
    generateCSTalkTrack()
  ];

  stagedComms = {
    staged: true,
    triggerAt: config.triggerTime,
    autoSendEnabled: true,
    comms,
    config
  };

  return stagedComms;
}

export function onRecoveryOrStaging(): void {
  console.log('📋 Recovery or staging event triggered, starting stabilization window');
  startStabilizationWindow();
}

let stabilizationWindowStart: Date | null = null;
let stabilizationCheckInterval: NodeJS.Timeout | null = null;

export async function checkA6Health(): Promise<{ healthy: boolean; p95_ms: number; error_rate: number }> {
  try {
    const response = await fetch(`${A8_BASE_URL}/api/health/a6`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      return { healthy: false, p95_ms: 9999, error_rate: 1.0 };
    }

    const health = await response.json();
    const isHealthy = health.status === 'green' && 
                      health.p95_ms < 1250 && 
                      health.error_rate < 0.005;

    return { 
      healthy: isHealthy, 
      p95_ms: health.p95_ms || 0, 
      error_rate: health.error_rate || 0 
    };
  } catch (error) {
    console.error('❌ Failed to check A6 health:', error);
    return { healthy: false, p95_ms: 9999, error_rate: 1.0 };
  }
}

export async function checkA6HealthAndTrigger(): Promise<{ healthy: boolean; shouldTrigger: boolean }> {
  const health = await checkA6Health();
  return { healthy: health.healthy, shouldTrigger: !health.healthy };
}

export function startStabilizationWindow(): void {
  stabilizationWindowStart = new Date();
  console.log(`⏱️ Stabilization window started at ${stabilizationWindowStart.toISOString()}`);

  if (stabilizationCheckInterval) clearInterval(stabilizationCheckInterval);

  stabilizationCheckInterval = setInterval(async () => {
    const health = await checkA6Health();
    
    if (!health.healthy) {
      console.log('🚨 A6 failed during stabilization window, triggering comms');
      
      await fetch(`${A8_BASE_URL}/events`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `stabilization-fail-${Date.now()}`
        },
        body: JSON.stringify({
          event_type: 'oca_stabilization_window_failed',
          app_id: 'A5',
          timestamp: new Date().toISOString(),
          data: {
            p95_ms: health.p95_ms,
            error_rate: health.error_rate,
            window_started: stabilizationWindowStart?.toISOString()
          }
        })
      });

      await sendStagedComms();
      stopStabilizationWindow();
    }
  }, 60 * 1000);
}

export function stopStabilizationWindow(): void {
  if (stabilizationCheckInterval) {
    clearInterval(stabilizationCheckInterval);
    stabilizationCheckInterval = null;
  }
  stabilizationWindowStart = null;
  console.log('⏹️ Stabilization window stopped');
}

export function isInStabilizationWindow(): boolean {
  if (!stabilizationWindowStart) return false;
  const thirtyMinutesMs = 30 * 60 * 1000;
  return Date.now() - stabilizationWindowStart.getTime() < thirtyMinutesMs;
}

export async function sendStagedComms(): Promise<{ sent: boolean; channels: string[] }> {
  if (!stagedComms) {
    return { sent: false, channels: [] };
  }

  const sentChannels: string[] = [];

  for (const comm of stagedComms.comms) {
    try {
      await fetch(`${A8_BASE_URL}/events`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `maint-comm-${comm.channel}-${Date.now()}`
        },
        body: JSON.stringify({
          event_type: 'oca_maintenance_comm_sent',
          app_id: 'A5',
          timestamp: new Date().toISOString(),
          data: {
            channel: comm.channel,
            incidentId: stagedComms.config.incidentId,
            content_preview: comm.content.slice(0, 200),
            metadata: comm.metadata
          }
        })
      });

      sentChannels.push(comm.channel);
      console.log(`📧 Sent maintenance comm: ${comm.channel}`);
    } catch (error) {
      console.error(`❌ Failed to send ${comm.channel} comm:`, error);
    }
  }

  return { sent: sentChannels.length > 0, channels: sentChannels };
}

export function setupAutoSendTrigger(triggerTime: string): void {
  if (autoSendTimer) {
    clearTimeout(autoSendTimer);
  }

  const triggerMs = new Date(triggerTime).getTime();
  const nowMs = Date.now();
  const delayMs = Math.max(0, triggerMs - nowMs);

  autoSendTimer = setTimeout(async () => {
    console.log('⏰ Auto-send trigger reached, checking A6 health...');
    
    const { healthy, shouldTrigger } = await checkA6HealthAndTrigger();
    
    if (shouldTrigger) {
      console.log('🚨 A6 not green, sending maintenance comms...');
      const result = await sendStagedComms();
      
      await fetch(`${A8_BASE_URL}/events`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `maint-auto-triggered-${Date.now()}`
        },
        body: JSON.stringify({
          event_type: 'oca_maintenance_comms_auto_triggered',
          app_id: 'A5',
          timestamp: new Date().toISOString(),
          data: {
            trigger_reason: 'a6_not_green_by_deadline',
            channels_sent: result.channels,
            a6_healthy: healthy
          }
        })
      });
    } else {
      console.log('✅ A6 is green, maintenance comms NOT sent');
      
      await fetch(`${A8_BASE_URL}/events`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `maint-skipped-${Date.now()}`
        },
        body: JSON.stringify({
          event_type: 'oca_maintenance_comms_skipped',
          app_id: 'A5',
          timestamp: new Date().toISOString(),
          data: {
            reason: 'a6_healthy_at_deadline',
            a6_healthy: healthy
          }
        })
      });
    }
  }, delayMs);

  console.log(`⏱️ Auto-send scheduled for ${triggerTime} (in ${delayMs}ms)`);
}

export function cancelAutoSend(): void {
  if (autoSendTimer) {
    clearTimeout(autoSendTimer);
    autoSendTimer = null;
    console.log('🛑 Auto-send cancelled');
  }
}

export function getStagedComms(): StagedComms | null {
  return stagedComms;
}

export async function initializeMaintenanceComms(): Promise<StagedComms> {
  const config: MaintenanceCommsConfig = {
    incidentId: INCIDENT_ID,
    triggerTime: TRIGGER_TIME,
    nextUpdateTime: '2026-01-15T10:11:13Z',
    errorRate: 0.012,
    p95Ms: 1350,
    rollbackBuildId: 'a6-rollback-20260115-001',
    uptimeTarget: UPTIME_TARGET
  };

  const staged = stageMaintenanceComms(config);
  setupAutoSendTrigger(TRIGGER_TIME);
  startStabilizationWindow();

  await fetch(`${A8_BASE_URL}/events`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `maint-comms-staged-${Date.now()}`
    },
    body: JSON.stringify({
      event_type: 'oca_maintenance_comms_staged',
      app_id: 'A5',
      timestamp: new Date().toISOString(),
      data: {
        incidentId: config.incidentId,
        triggerAt: TRIGGER_TIME,
        autoSendEnabled: true,
        channels: staged.comms.map(c => c.channel),
        owner: 'partnerships_cs_lead',
        sla: '5min_from_trigger'
      }
    })
  });

  return staged;
}
