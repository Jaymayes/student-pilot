/**
 * SEV-2 Stabilization Service
 * 
 * Incident: Auth DB Unreachable - Retry Storm
 * CIR ID: CIR-1768837580
 * 
 * Path-to-Green Plan:
 * T+0-10: Containment (A3 scale to 0, secrets audit)
 * T+10-25: A1 stabilization (pooling, breakers)
 * T+25-40: Canary testing
 * T+40-60: Gradual restore with 60-min green clock
 */

import { SEV2_INCIDENT } from '../config/featureFlags';

export interface IncidentStatus {
  cir_id: string;
  phase: 'containment' | 'stabilization' | 'canary' | 'restore' | 'closed';
  start_time: string;
  current_time: string;
  elapsed_minutes: number;
  exit_criteria: ExitCriteria;
  actions_completed: string[];
  actions_pending: string[];
}

export interface ExitCriteria {
  a1_green_60min: boolean;
  db_connected: boolean;
  pool_utilization_under_80: boolean;
  auth_5xx_count: number;
  a3_retry_storm_events: number;
  a3_breaker_normal: boolean;
  a3_queue_stable: boolean;
  p95_core_ms: number;
  p95_aux_ms: number;
  golden_path_compliant: boolean;
  confirmations_3of3: boolean;
}

const incidentState = {
  phase: 'containment' as IncidentStatus['phase'],
  start_time: SEV2_INCIDENT.kill_switch_activated_at,
  actions_completed: [
    'Kill switch activated (TRAFFIC_CAP=0%)',
    'CIR opened in A8',
    'Change freeze enabled',
    'Refunds kept enabled',
  ],
  actions_pending: [
    'A3 containment: scale worker to 0',
    'Secrets audit: verify no DATABASE_URL in A3',
    'A1 stabilization: verify pooling config',
    'Canary: single request to A1',
    'Restore: gradual concurrency increase',
  ],
  exit_criteria: {
    a1_green_60min: false,
    db_connected: false,
    pool_utilization_under_80: false,
    auth_5xx_count: 0,
    a3_retry_storm_events: 0,
    a3_breaker_normal: false,
    a3_queue_stable: false,
    p95_core_ms: 0,
    p95_aux_ms: 0,
    golden_path_compliant: true,
    confirmations_3of3: false,
  },
};

export function getIncidentStatus(): IncidentStatus {
  const now = new Date();
  const start = new Date(incidentState.start_time);
  const elapsedMs = now.getTime() - start.getTime();
  
  return {
    cir_id: SEV2_INCIDENT.cir_id,
    phase: incidentState.phase,
    start_time: incidentState.start_time,
    current_time: now.toISOString(),
    elapsed_minutes: Math.floor(elapsedMs / 60000),
    exit_criteria: incidentState.exit_criteria,
    actions_completed: incidentState.actions_completed,
    actions_pending: incidentState.actions_pending,
  };
}

export function updatePhase(phase: IncidentStatus['phase']): void {
  incidentState.phase = phase;
}

export function markActionCompleted(action: string): void {
  const idx = incidentState.actions_pending.indexOf(action);
  if (idx > -1) {
    incidentState.actions_pending.splice(idx, 1);
  }
  if (!incidentState.actions_completed.includes(action)) {
    incidentState.actions_completed.push(action);
  }
}

export function updateExitCriteria(updates: Partial<ExitCriteria>): void {
  Object.assign(incidentState.exit_criteria, updates);
}

export function checkExitCriteria(): { ready: boolean; blockers: string[] } {
  const criteria = incidentState.exit_criteria;
  const blockers: string[] = [];
  
  if (!criteria.a1_green_60min) blockers.push('A1 not green for 60 min');
  if (!criteria.db_connected) blockers.push('DB not connected');
  if (!criteria.pool_utilization_under_80) blockers.push('Pool utilization >= 80%');
  if (criteria.auth_5xx_count > 0) blockers.push(`Auth 5xx count: ${criteria.auth_5xx_count}`);
  if (criteria.a3_retry_storm_events > 0) blockers.push(`Retry storm events: ${criteria.a3_retry_storm_events}`);
  if (!criteria.a3_breaker_normal) blockers.push('A3 breaker not normal');
  if (!criteria.a3_queue_stable) blockers.push('A3 queue not stable');
  if (criteria.p95_core_ms > 120) blockers.push(`P95 core: ${criteria.p95_core_ms}ms > 120ms`);
  if (criteria.p95_aux_ms > 200) blockers.push(`P95 aux: ${criteria.p95_aux_ms}ms > 200ms`);
  if (!criteria.golden_path_compliant) blockers.push('Golden Path non-compliant');
  if (!criteria.confirmations_3of3) blockers.push('Missing 3-of-3 confirmations');
  
  return { ready: blockers.length === 0, blockers };
}

export async function emitStatusToA8(): Promise<void> {
  const status = getIncidentStatus();
  const exitCheck = checkExitCriteria();
  
  const A8_ENDPOINT = process.env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
  
  try {
    await fetch(`${A8_ENDPOINT}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'sev2_status_update',
        appName: 'student_pilot',
        appId: 'A5',
        timestamp: status.current_time,
        payload: {
          ...status,
          exit_ready: exitCheck.ready,
          blockers: exitCheck.blockers,
        },
      }),
    });
  } catch {
    console.log('[SEV-2] Failed to emit status to A8');
  }
}

export async function generateT30Report(): Promise<string> {
  const status = getIncidentStatus();
  
  return `
## SEV-2 T+30 Brief
**CIR:** ${status.cir_id}
**Phase:** ${status.phase}
**Elapsed:** ${status.elapsed_minutes} minutes

### Actions Completed
${status.actions_completed.map(a => `- ✅ ${a}`).join('\n')}

### Actions Pending
${status.actions_pending.map(a => `- ⏳ ${a}`).join('\n')}

### Exit Criteria
| Metric | Status |
|--------|--------|
| A1 Green 60min | ${status.exit_criteria.a1_green_60min ? '✅' : '❌'} |
| DB Connected | ${status.exit_criteria.db_connected ? '✅' : '❌'} |
| Pool < 80% | ${status.exit_criteria.pool_utilization_under_80 ? '✅' : '❌'} |
| Auth 5xx | ${status.exit_criteria.auth_5xx_count} |
| Retry Storms | ${status.exit_criteria.a3_retry_storm_events} |
| P95 Core | ${status.exit_criteria.p95_core_ms}ms |
| P95 Aux | ${status.exit_criteria.p95_aux_ms}ms |
`;
}
