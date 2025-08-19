// Type definitions for ScholarLink Billing Service

import { Decimal } from 'decimal.js';
import { Request } from 'express';

// User types
export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  balanceCredits: Decimal;
  createdAt: Date;
}

// JWT payload
export interface JWTPayload {
  sub: string;
  email: string;
  role: 'user' | 'admin';
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

// Authenticated request
export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

// Ledger entry types
export type LedgerKind = 'credit' | 'debit' | 'adjustment' | 'reversal';

export interface LedgerEntry {
  id: string;
  userId: string;
  kind: LedgerKind;
  amountCredits: Decimal;
  usdCents?: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  rateVersion: string;
  reason: string;
  requestId?: string;
  idempotencyKey?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// Rate card configuration
export interface RateCardConfig {
  currency: string;
  creditPerDollar: number;
  rounding: 'precise' | 'ceil';
  models: Record<string, ModelRate>;
}

export interface ModelRate {
  inputPer1k: number;
  outputPer1k: number;
}

// Purchase types
export type PurchaseStatus = 'succeeded' | 'pending' | 'failed';
export type PurchaseProvider = 'stripe' | 'manual';

export interface Purchase {
  id: string;
  userId: string;
  packageCode: string;
  usdCents: number;
  creditsGranted: Decimal;
  provider: PurchaseProvider;
  providerRef: string;
  status: PurchaseStatus;
  createdAt: Date;
}

// Package definitions
export interface CreditPackage {
  code: string;
  name: string;
  usdCents: number;
  credits: number;
  bonusPercentage?: number;
}

// API request/response types
export interface UsageReconcileRequest {
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  requestId: string;
  idempotencyKey: string;
}

export interface UsageReconcileResponse {
  success: boolean;
  balanceCredits: string;
  chargedCredits: string;
  ledgerEntryId: string;
}

export interface InsufficientCreditsError {
  error: 'insufficient_credits';
  required: string;
  available: string;
  shortfall: string;
}

export interface PurchaseRequest {
  packageCode: string;
}

export interface PurchaseResponse {
  purchaseId: string;
  paymentUrl: string;
  status: PurchaseStatus;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  role: string;
  balanceCredits: string;
  displayBalance: string;
  createdAt: string;
}

// Stripe webhook types
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

// Admin adjustment request
export interface AdminAdjustmentRequest {
  userId: string;
  amountCredits: string;
  reason: string;
}

// Metrics types
export interface Metrics {
  reconcile_debits_total: number;
  reconcile_insufficient_funds: number;
  ledger_write_failures: number;
  active_users: number;
  total_credits_issued: string;
  total_credits_spent: string;
}