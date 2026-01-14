/**
 * One-Click Apply Gate Event Payloads
 * 
 * Required A8 events for Auto-GO trigger
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export interface A6HealthWindowEvent {
  p95_ms: number;
  error_rate: number;
  uptime: number;
  provider_register_status: number;
  oca_header_present: boolean;
  window_start: string;
  window_end: string;
}

export interface LegalCopySignedEvent {
  doc_hash: string;
  approver_id: string;
  repo_path: string;
  commit_sha: string;
  signed_at: string;
}

export interface CodeFreezeEvent {
  freeze_start: string;
  freeze_end: string;
  repos: string[];
  scope: string;
}

export interface SeedValidationResult {
  packet_id: string;
  provider_id: string;
  oca_header_present: boolean;
  dashboard_banner_visible: boolean;
  report_issue_functional: boolean;
  timestamp: string;
}

export const GATE_REQUIREMENTS = {
  a6_health_window: {
    p95_max_ms: 200,
    error_rate_max: 0.005,
    uptime_min: 1.0,
    provider_register_status: 200,
    oca_header_present: true,
    window_duration_minutes: 60
  },
  
  legal_copy: {
    required_fields: ['doc_hash', 'approver_id', 'repo_path', 'commit_sha', 'signed_at'],
    approver_id_format: /^GC_\d{4}$/
  },
  
  code_freeze: {
    repos: ['student-pilot', 'scholarship-api', 'auto-com-center'],
    duration_hours: 24
  },
  
  seed_validation: {
    packet_count: 5,
    all_must_pass: true
  }
};

export function validateA6Health(event: A6HealthWindowEvent): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (event.p95_ms >= GATE_REQUIREMENTS.a6_health_window.p95_max_ms) {
    issues.push(`P95 ${event.p95_ms}ms >= ${GATE_REQUIREMENTS.a6_health_window.p95_max_ms}ms`);
  }
  if (event.error_rate >= GATE_REQUIREMENTS.a6_health_window.error_rate_max) {
    issues.push(`Error rate ${event.error_rate} >= ${GATE_REQUIREMENTS.a6_health_window.error_rate_max}`);
  }
  if (event.uptime < GATE_REQUIREMENTS.a6_health_window.uptime_min) {
    issues.push(`Uptime ${event.uptime} < ${GATE_REQUIREMENTS.a6_health_window.uptime_min}`);
  }
  if (event.provider_register_status !== GATE_REQUIREMENTS.a6_health_window.provider_register_status) {
    issues.push(`provider_register status ${event.provider_register_status} != 200`);
  }
  if (!event.oca_header_present) {
    issues.push('OCA header not present');
  }
  
  return { valid: issues.length === 0, issues };
}

export function validateLegalCopy(event: LegalCopySignedEvent): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  for (const field of GATE_REQUIREMENTS.legal_copy.required_fields) {
    if (!event[field as keyof LegalCopySignedEvent]) {
      issues.push(`Missing required field: ${field}`);
    }
  }
  
  if (!GATE_REQUIREMENTS.legal_copy.approver_id_format.test(event.approver_id)) {
    issues.push(`Invalid approver_id format: ${event.approver_id}`);
  }
  
  if (event.doc_hash.length !== 64) {
    issues.push('doc_hash must be SHA256 (64 chars)');
  }
  
  return { valid: issues.length === 0, issues };
}

export function validateSeedPackets(results: SeedValidationResult[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (results.length < GATE_REQUIREMENTS.seed_validation.packet_count) {
    issues.push(`Only ${results.length} of ${GATE_REQUIREMENTS.seed_validation.packet_count} seed packets validated`);
  }
  
  for (const result of results) {
    if (!result.oca_header_present) {
      issues.push(`Packet ${result.packet_id}: OCA header missing`);
    }
    if (!result.dashboard_banner_visible) {
      issues.push(`Packet ${result.packet_id}: Dashboard banner not visible`);
    }
    if (!result.report_issue_functional) {
      issues.push(`Packet ${result.packet_id}: Report Issue not functional`);
    }
  }
  
  return { valid: issues.length === 0, issues };
}

export async function emitA6HealthOk(event: A6HealthWindowEvent): Promise<boolean> {
  const validation = validateA6Health(event);
  if (!validation.valid) {
    console.log('[OCA Gates] A6 validation failed:', validation.issues);
    return false;
  }
  
  try {
    const response = await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'a6_health_window_ok',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: event
      })
    });
    return response.ok;
  } catch {
    console.log('[OCA Gates] Failed to emit a6_health_window_ok');
    return false;
  }
}

export async function emitLegalCopySigned(event: LegalCopySignedEvent): Promise<boolean> {
  const validation = validateLegalCopy(event);
  if (!validation.valid) {
    console.log('[OCA Gates] Legal validation failed:', validation.issues);
    return false;
  }
  
  try {
    const response = await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'legal_copy_signed',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: event
      })
    });
    return response.ok;
  } catch {
    console.log('[OCA Gates] Failed to emit legal_copy_signed');
    return false;
  }
}

export async function emitCodeFreeze(event: CodeFreezeEvent): Promise<boolean> {
  try {
    const response = await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'oca_code_freeze',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: event
      })
    });
    return response.ok;
  } catch {
    console.log('[OCA Gates] Failed to emit code_freeze');
    return false;
  }
}

export async function emitSeedValidation(results: SeedValidationResult[]): Promise<boolean> {
  const validation = validateSeedPackets(results);
  
  try {
    const response = await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'oca_seed_validation',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          results,
          validation,
          packet_count: results.length,
          all_passed: validation.valid
        }
      })
    });
    return response.ok;
  } catch {
    console.log('[OCA Gates] Failed to emit seed_validation');
    return false;
  }
}
