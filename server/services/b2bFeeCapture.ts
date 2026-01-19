/**
 * B2B Fee Capture Service
 * 
 * Executive Implementation Order SAA-EO-2026-01-19-01
 * 
 * Fee capture logic:
 * On AwardDisbursed: platform_fee = round(disbursed_amount * 0.03, 2)
 * Write fee_ledger entry with provider_id, student_id, scholarship_id, 
 * disbursement_id, evidence_uri, checksum
 */

import crypto from 'crypto';
import { B2B_CONFIG } from '../config/featureFlags';

export interface AwardDisbursedEvent {
  event_type: 'AwardDisbursed';
  provider_id: string;
  student_id: string;
  scholarship_id: string;
  disbursement_id: string;
  disbursed_amount_cents: number;
  evidence_uri?: string;
  timestamp: string;
}

export interface FeeLedgerEntry {
  id: string;
  provider_id: string;
  student_id: string;
  scholarship_id: string;
  disbursement_id: string;
  disbursed_amount_cents: number;
  platform_fee_cents: number;
  fee_percent: number;
  evidence_uri: string;
  checksum: string;
  created_at: string;
  status: 'pending' | 'captured' | 'settled' | 'disputed';
}

const feeLedger: FeeLedgerEntry[] = [];

export function calculatePlatformFee(amountCents: number, tierFeePercent?: number): number {
  const feePercent = tierFeePercent ?? B2B_CONFIG.platform_fee_percent;
  const fee = Math.round(amountCents * (feePercent / 100));
  return Math.max(fee, B2B_CONFIG.minimum_fee_cents);
}

export function generateChecksum(entry: Omit<FeeLedgerEntry, 'checksum' | 'id' | 'created_at' | 'status'>): string {
  const payload = JSON.stringify({
    provider_id: entry.provider_id,
    student_id: entry.student_id,
    scholarship_id: entry.scholarship_id,
    disbursement_id: entry.disbursement_id,
    disbursed_amount_cents: entry.disbursed_amount_cents,
    platform_fee_cents: entry.platform_fee_cents,
    fee_percent: entry.fee_percent,
    evidence_uri: entry.evidence_uri,
  });
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
}

export async function captureFeeonAwardDisbursed(event: AwardDisbursedEvent): Promise<FeeLedgerEntry> {
  const platformFeeCents = calculatePlatformFee(event.disbursed_amount_cents);
  
  const entryBase = {
    provider_id: event.provider_id,
    student_id: event.student_id,
    scholarship_id: event.scholarship_id,
    disbursement_id: event.disbursement_id,
    disbursed_amount_cents: event.disbursed_amount_cents,
    platform_fee_cents: platformFeeCents,
    fee_percent: B2B_CONFIG.platform_fee_percent,
    evidence_uri: event.evidence_uri || '',
  };
  
  const checksum = generateChecksum(entryBase);
  
  const entry: FeeLedgerEntry = {
    ...entryBase,
    id: `fee_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    checksum,
    created_at: new Date().toISOString(),
    status: 'captured',
  };
  
  feeLedger.push(entry);
  
  await emitFeeEvent(entry);
  
  console.log(`[B2B Fee] Captured fee: ${entry.platform_fee_cents} cents for disbursement ${entry.disbursement_id}`);
  
  return entry;
}

async function emitFeeEvent(entry: FeeLedgerEntry): Promise<void> {
  const A8_ENDPOINT = process.env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app';
  
  try {
    await fetch(`${A8_ENDPOINT}/api/events`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Trace-Id': `fee_${entry.id}`,
      },
      body: JSON.stringify({
        eventName: 'b2b_fee_captured',
        appName: 'student_pilot',
        appId: 'A5',
        timestamp: entry.created_at,
        payload: {
          run_id: 'ZT3G-056',
          fee_id: entry.id,
          provider_id: entry.provider_id,
          disbursement_id: entry.disbursement_id,
          platform_fee_cents: entry.platform_fee_cents,
          fee_percent: entry.fee_percent,
          checksum: entry.checksum,
          status: entry.status,
        },
      }),
    });
  } catch (error) {
    console.log('[B2B Fee] Failed to emit to A8 (non-blocking)');
  }
}

export function getFeeLedger(): FeeLedgerEntry[] {
  return [...feeLedger];
}

export function getFeeLedgerByProvider(providerId: string): FeeLedgerEntry[] {
  return feeLedger.filter(e => e.provider_id === providerId);
}

export function getFeeMetrics(): {
  total_fees_captured_cents: number;
  total_entries: number;
  capture_rate: number;
} {
  const captured = feeLedger.filter(e => e.status === 'captured' || e.status === 'settled');
  return {
    total_fees_captured_cents: captured.reduce((sum, e) => sum + e.platform_fee_cents, 0),
    total_entries: feeLedger.length,
    capture_rate: feeLedger.length > 0 ? captured.length / feeLedger.length : 1,
  };
}
