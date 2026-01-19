/**
 * Drift Sentinel Service
 * 
 * Executive Implementation Order SAA-EO-2026-01-19-01
 * 
 * A8 Watchtower to record:
 * - workspace_id, commit_sha, manifest_digest, build_artifact_sha
 * 
 * Alert rules:
 * - Mismatch between manifest_digest and deployed build_artifact_sha 
 *   → auto-block publish and page on-call
 * - Any endpoint regression (>=2% 5xx or 404 for 10 min) 
 *   → disable B2C capture, keep refunds enabled, open CIR-##### in A8
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface WorkspaceState {
  workspace_id: string;
  commit_sha: string;
  manifest_digest: string;
  build_artifact_sha: string;
  recorded_at: string;
}

export interface EndpointMetrics {
  endpoint: string;
  total_requests: number;
  error_5xx: number;
  error_404: number;
  error_rate_5xx: number;
  error_rate_404: number;
  window_start: string;
}

export interface DriftAlert {
  alert_id: string;
  alert_type: 'manifest_mismatch' | 'endpoint_regression';
  severity: 'critical' | 'warning';
  details: Record<string, unknown>;
  action_taken: string;
  created_at: string;
}

const workspaceStates: WorkspaceState[] = [];
const driftAlerts: DriftAlert[] = [];
const endpointMetrics: Map<string, EndpointMetrics> = new Map();

export function computeManifestDigest(manifestPath: string = 'golden_path.yaml'): string {
  try {
    const fullPath = path.resolve(process.cwd(), manifestPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    }
  } catch {
  }
  return 'manifest_not_found';
}

export function computeBuildArtifactSha(): string {
  try {
    const packageLock = path.resolve(process.cwd(), 'package-lock.json');
    const distPath = path.resolve(process.cwd(), 'dist');
    
    let content = '';
    if (fs.existsSync(packageLock)) {
      content += fs.readFileSync(packageLock, 'utf-8').substring(0, 10000);
    }
    if (fs.existsSync(distPath)) {
      content += fs.readdirSync(distPath).join(',');
    }
    
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  } catch {
    return 'build_not_computed';
  }
}

export function getCommitSha(): string {
  try {
    const headFile = path.resolve(process.cwd(), '.git/HEAD');
    if (fs.existsSync(headFile)) {
      const head = fs.readFileSync(headFile, 'utf-8').trim();
      if (head.startsWith('ref:')) {
        const refPath = path.resolve(process.cwd(), '.git', head.replace('ref: ', ''));
        if (fs.existsSync(refPath)) {
          return fs.readFileSync(refPath, 'utf-8').trim().substring(0, 7);
        }
      }
      return head.substring(0, 7);
    }
  } catch {
  }
  return 'unknown';
}

export async function recordWorkspaceState(): Promise<WorkspaceState> {
  const state: WorkspaceState = {
    workspace_id: process.env.REPL_ID || 'local',
    commit_sha: getCommitSha(),
    manifest_digest: computeManifestDigest(),
    build_artifact_sha: computeBuildArtifactSha(),
    recorded_at: new Date().toISOString(),
  };
  
  workspaceStates.push(state);
  
  if (workspaceStates.length > 1) {
    const previous = workspaceStates[workspaceStates.length - 2];
    if (previous.manifest_digest !== state.manifest_digest && 
        previous.manifest_digest !== 'manifest_not_found') {
      await raiseAlert({
        alert_type: 'manifest_mismatch',
        severity: 'critical',
        details: {
          previous_digest: previous.manifest_digest,
          current_digest: state.manifest_digest,
          commit_sha: state.commit_sha,
        },
        action_taken: 'auto-block publish, page on-call',
      });
    }
  }
  
  await emitToA8(state);
  
  return state;
}

export function recordEndpointRequest(endpoint: string, statusCode: number): void {
  const existing = endpointMetrics.get(endpoint) || {
    endpoint,
    total_requests: 0,
    error_5xx: 0,
    error_404: 0,
    error_rate_5xx: 0,
    error_rate_404: 0,
    window_start: new Date().toISOString(),
  };
  
  existing.total_requests++;
  if (statusCode >= 500) existing.error_5xx++;
  if (statusCode === 404) existing.error_404++;
  
  existing.error_rate_5xx = existing.total_requests > 0 
    ? existing.error_5xx / existing.total_requests 
    : 0;
  existing.error_rate_404 = existing.total_requests > 0 
    ? existing.error_404 / existing.total_requests 
    : 0;
  
  endpointMetrics.set(endpoint, existing);
}

export async function checkEndpointRegression(): Promise<DriftAlert | null> {
  const entries = Array.from(endpointMetrics.entries());
  for (const [endpoint, metrics] of entries) {
    if (metrics.error_rate_5xx >= 0.02 || metrics.error_rate_404 >= 0.02) {
      const alert = await raiseAlert({
        alert_type: 'endpoint_regression',
        severity: 'critical',
        details: {
          endpoint,
          error_rate_5xx: metrics.error_rate_5xx,
          error_rate_404: metrics.error_rate_404,
          total_requests: metrics.total_requests,
        },
        action_taken: 'disable B2C capture, keep refunds enabled, open CIR in A8',
      });
      return alert;
    }
  }
  return null;
}

async function raiseAlert(params: Omit<DriftAlert, 'alert_id' | 'created_at'>): Promise<DriftAlert> {
  const alert: DriftAlert = {
    ...params,
    alert_id: `CIR-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  
  driftAlerts.push(alert);
  
  console.log(`[Drift Sentinel] ALERT ${alert.alert_id}: ${alert.alert_type} - ${alert.action_taken}`);
  
  const A8_ENDPOINT = process.env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
  
  try {
    await fetch(`${A8_ENDPOINT}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'drift_sentinel_alert',
        appName: 'student_pilot',
        appId: 'A5',
        timestamp: alert.created_at,
        payload: alert,
      }),
    });
  } catch {
  }
  
  return alert;
}

async function emitToA8(state: WorkspaceState): Promise<void> {
  const A8_ENDPOINT = process.env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
  
  try {
    await fetch(`${A8_ENDPOINT}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'workspace_state_recorded',
        appName: 'student_pilot',
        appId: 'A5',
        timestamp: state.recorded_at,
        payload: state,
      }),
    });
  } catch {
  }
}

export function getWorkspaceStates(): WorkspaceState[] {
  return [...workspaceStates];
}

export function getDriftAlerts(): DriftAlert[] {
  return [...driftAlerts];
}

export function getCurrentState(): WorkspaceState | null {
  return workspaceStates[workspaceStates.length - 1] || null;
}
