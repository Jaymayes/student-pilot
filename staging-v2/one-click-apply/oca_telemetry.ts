/**
 * One-Click Apply Telemetry Configuration
 * 
 * Required A8 events (no PII)
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const OCA_TELEMETRY_CONFIG = {
  campaign_ids: {
    student: 'oca_canary_student_v1',
    provider: 'oca_canary_provider_v1'
  },
  
  required_events: [
    {
      event: 'oca_email_sent',
      description: 'Email dispatched to student',
      required_fields: ['email_id', 'variant_id', 'cohort_id']
    },
    {
      event: 'oca_email_open',
      description: 'Student opened email',
      required_fields: ['email_id', 'variant_id']
    },
    {
      event: 'oca_email_click',
      description: 'Student clicked CTA in email',
      required_fields: ['email_id', 'variant_id', 'cta_type']
    },
    {
      event: 'oca_modal_viewed',
      description: 'Student viewed OCA modal',
      required_fields: ['scholarship_id', 'variant_id']
    },
    {
      event: 'oca_doc_selected',
      description: 'Student selected/uploaded document',
      required_fields: ['scholarship_id', 'doc_type']
    },
    {
      event: 'oca_consent_checked',
      description: 'Student checked consent checkbox',
      required_fields: ['scholarship_id']
    },
    {
      event: 'oca_integrity_checked',
      description: 'Student checked integrity checkbox',
      required_fields: ['scholarship_id']
    },
    {
      event: 'oca_submit_clicked',
      description: 'Student clicked submit button',
      required_fields: ['scholarship_id']
    },
    {
      event: 'oca_submit_result',
      description: 'Submission outcome',
      required_fields: ['scholarship_id', 'result'],
      result_values: ['success', 'blocked_rate_limit', 'blocked_missing_doc', 'blocked_validation', 'error']
    },
    {
      event: 'provider_issue_reported',
      description: 'Provider reported issue with OCA submission',
      required_fields: ['scholarship_id', 'reason']
    },
    {
      event: 'oca_feature_killed',
      description: 'OCA feature auto-disabled',
      required_fields: ['trigger', 'reason']
    }
  ],
  
  pii_rules: {
    never_log: ['email', 'name', 'dob', 'ssn', 'address', 'phone'],
    allowed: ['scholarship_id', 'provider_id', 'event_id', 'timestamp', 'outcome', 'variant_id', 'cohort_id']
  }
};

export interface OcaEmailEvent {
  email_id: string;
  variant_id: 'A' | 'B';
  cohort_id: string;
}

export interface OcaModalEvent {
  scholarship_id: string;
  variant_id: 'A' | 'B';
  step?: string;
}

export interface OcaSubmitResult {
  scholarship_id: string;
  result: 'success' | 'blocked_rate_limit' | 'blocked_missing_doc' | 'blocked_validation' | 'error';
  blocked_reason?: string;
}

export interface ProviderIssueEvent {
  scholarship_id: string;
  reason: string;
}

export interface OcaKillEvent {
  trigger: 'provider_complaint' | 'integrity_violation' | 'refund_spike' | 'manual';
  reason: string;
}

async function emitToA8(event_type: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const response = await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type,
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data
      })
    });
    return response.ok;
  } catch {
    console.log(`[OCA Telemetry] Failed to emit ${event_type}`);
    return false;
  }
}

export async function trackEmailSent(event: OcaEmailEvent): Promise<void> {
  await emitToA8('oca_email_sent', event);
}

export async function trackEmailOpen(event: OcaEmailEvent): Promise<void> {
  await emitToA8('oca_email_open', event);
}

export async function trackEmailClick(event: OcaEmailEvent & { cta_type: string }): Promise<void> {
  await emitToA8('oca_email_click', event);
}

export async function trackModalViewed(event: OcaModalEvent): Promise<void> {
  await emitToA8('oca_modal_viewed', event);
}

export async function trackDocSelected(event: OcaModalEvent & { doc_type: string }): Promise<void> {
  await emitToA8('oca_doc_selected', event);
}

export async function trackConsentChecked(event: OcaModalEvent): Promise<void> {
  await emitToA8('oca_consent_checked', event);
}

export async function trackIntegrityChecked(event: OcaModalEvent): Promise<void> {
  await emitToA8('oca_integrity_checked', event);
}

export async function trackSubmitClicked(event: OcaModalEvent): Promise<void> {
  await emitToA8('oca_submit_clicked', event);
}

export async function trackSubmitResult(event: OcaSubmitResult): Promise<void> {
  await emitToA8('oca_submit_result', event);
}

export async function trackProviderIssue(event: ProviderIssueEvent): Promise<void> {
  await emitToA8('provider_issue_reported', event);
}

export async function trackFeatureKilled(event: OcaKillEvent): Promise<void> {
  await emitToA8('oca_feature_killed', event);
}

export function generateEventId(): string {
  return `oca_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateCohortId(userId: string, experimentId: string): string {
  const hash = Buffer.from(`${userId}:${experimentId}`).toString('base64').slice(0, 8);
  return `cohort_${hash}`;
}

export function assignVariant(userId: string): 'A' | 'B' {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'A' : 'B';
}
