// Type definitions for ScholarLink Billing Service

import { Request } from 'express';
import { User, LedgerEntry, Purchase, RateCard } from '@prisma/client';
import Decimal from 'decimal.js';

// Extend Express Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// JWT Payload structure
export interface JWTPayload {
  sub: string; // User ID (subject)
  email?: string;
  role?: string;
  iss: string; // Issuer
  aud: string; // Audience
  iat: number; // Issued at
  exp: number; // Expires at
  kid?: string; // Key ID
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  correlationId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
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

// Usage tracking and billing
export interface UsageReconciliation {
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  requestId?: string;
  idempotencyKey: string;
}

export interface UsageResult {
  success?: boolean;
  error?: 'INSUFFICIENT_CREDITS' | 'INVALID_MODEL' | 'DUPLICATE_REQUEST';
  ledgerEntry?: LedgerEntry;
  newBalance?: Decimal;
  debitAmount?: Decimal;
  details?: {
    required?: string;
    available?: string;
    shortfall?: string;
  };
}

// Credit packages
export interface CreditPackage {
  code: string;
  name: string;
  usdCents: number;
  credits: number;
  bonusPercentage?: number;
}

// Ledger operations
export interface LedgerQuery {
  cursor?: string;
  limit: number;
}

export interface LedgerResult {
  entries: LedgerEntry[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface AdjustmentResult {
  ledgerEntry: LedgerEntry;
  newBalance: Decimal;
}

// Database enums
export enum LedgerEntryKind {
  CREDIT = 'credit',
  DEBIT = 'debit',
  ADJUSTMENT = 'adjustment',
  REVERSAL = 'reversal'
}

export enum PurchaseStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed'
}

export enum PurchaseProvider {
  STRIPE = 'stripe',
  MANUAL = 'manual'
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

// Metrics and monitoring
export interface ServiceMetrics {
  requestsTotal: number;
  reconcileDebitsTotal: number;
  reconcileInsufficientFunds: number;
  ledgerWriteFailures: number;
  averageResponseTime: number;
}

// Health check status
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  components?: {
    database: 'healthy' | 'unhealthy';
    rateCard: 'healthy' | 'unhealthy';
  };
}

// Stripe webhook types
export interface StripeWebhookEvent {
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
}

// Configuration validation
export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Export commonly used Prisma types with proper naming
export type {
  User as DatabaseUser,
  LedgerEntry as DatabaseLedgerEntry,
  Purchase as DatabasePurchase,
  RateCard as DatabaseRateCard,
} from '@prisma/client';