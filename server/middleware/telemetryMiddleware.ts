import type { Request, Response, NextFunction } from 'express';
import { telemetryClient } from '../telemetry/telemetryClient';

export function telemetryMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    if (req.path.startsWith('/src/') || 
        req.path.startsWith('/@') || 
        req.path.startsWith('/node_modules/') ||
        req.path.includes('.')) {
      return next();
    }

    const user = (req as any).user;
    const sessionId = (req as any).sessionID;
    
    telemetryClient.trackPageView(req.path, {
      userId: user?.id,
      sessionId,
      requestId: (req as any).correlationId,
      utmSource: req.query.utm_source as string,
      utmMedium: req.query.utm_medium as string,
      utmCampaign: req.query.utm_campaign as string,
      referrer: req.get('referer')
    });

    next();
  };
}

export function trackUserSignup(userId: string, requestId?: string): void {
  telemetryClient.trackSignupCompleted(userId, { requestId });
}

export function trackMatchCreated(
  scholarshipId: string,
  matchScore: number,
  deadline: string,
  userId?: string,
  requestId?: string
): void {
  telemetryClient.trackMatchCreated(scholarshipId, matchScore, deadline, { userId, requestId });
}

export function trackApplicationStarted(
  scholarshipId: string,
  userId?: string,
  requestId?: string
): void {
  telemetryClient.trackApplicationStarted(scholarshipId, { userId, requestId });
}

export function trackApplicationSubmitted(
  scholarshipId: string,
  matchScore: number,
  deadline: string,
  userId?: string,
  requestId?: string
): void {
  telemetryClient.trackApplicationSubmitted(scholarshipId, matchScore, deadline, { userId, requestId });
}

export function trackCreditsPurchased(
  amountUsd: number,
  quantity: number,
  sku: string,
  userId?: string,
  requestId?: string
): void {
  telemetryClient.trackCreditsPurchased(amountUsd, quantity, sku, { userId, requestId });
}

export function trackAiTokensConsumed(
  inputTokens: number,
  outputTokens: number,
  model: string,
  userId?: string,
  requestId?: string
): void {
  telemetryClient.trackAiTokensConsumed(inputTokens, outputTokens, model, { userId, requestId });
}

export function trackCtaClick(
  cta: string,
  page: string,
  userId?: string,
  requestId?: string
): void {
  telemetryClient.trackCtaClick(cta, page, { userId, requestId });
}

export function trackPaymentSucceeded(
  amountCents: number,
  currency: string,
  paymentProvider: string,
  userId?: string,
  requestId?: string,
  transactionId?: string,
  product?: string,
  credits?: number,
  intentId?: string
): void {
  // A5 spec: payment_succeeded {user_id_hash, amount_cents, product, credits, intent_id}
  telemetryClient.trackPaymentSucceeded(amountCents, currency, paymentProvider, { 
    userId, 
    requestId, 
    transactionId,
    product,
    credits,
    intentId
  });
}

export function trackCreditPurchased(
  amountCents: number,
  credits: number,
  source: string,
  userId?: string,
  requestId?: string,
  currency?: string,
  sku?: string
): void {
  // A5 spec: credit_purchased {user_id_hash, credits, amount_cents, source}
  telemetryClient.trackCreditPurchased(amountCents, credits, source, { 
    userId, 
    requestId, 
    currency,
    sku
  });
}

export function trackPaymentFailed(
  reason: string,
  paymentProvider: string,
  userId?: string,
  requestId?: string,
  orderId?: string,
  amountCents?: number,
  intentId?: string
): void {
  // A5 spec: payment_failed {reason, amount_cents?, intent_id?}
  telemetryClient.trackPaymentFailed(reason, paymentProvider, { 
    userId, 
    requestId, 
    orderId,
    amountCents,
    intentId
  });
}

export function trackDocumentUploaded(
  documentType: string,
  userId?: string,
  requestId?: string,
  documentId?: string,
  isFirst?: boolean
): void {
  // A5 spec: document_uploaded {document_type, document_id, is_first}
  telemetryClient.trackDocumentUploaded(documentType, { 
    userId, 
    requestId, 
    documentId,
    isFirst 
  });
}

export function trackAiAssistUsed(
  tool: string,
  op: string,
  tokensIn: number,
  tokensOut: number,
  userId?: string,
  requestId?: string,
  durationMs?: number,
  creditsCost?: number
): void {
  // A5 spec: ai_assist_used {tool, op, tokens_in, tokens_out}
  telemetryClient.trackAiAssistUsed(tool, op, tokensIn, tokensOut, { 
    userId, 
    requestId, 
    durationMs,
    creditsCost 
  });
}

// Legacy alias for backward compatibility
export function trackAiUsage(
  model: string,
  operation: string,
  inputTokens: number,
  outputTokens: number,
  userId?: string,
  requestId?: string,
  durationMs?: number,
  creditsCost?: number
): void {
  trackAiAssistUsed(model, operation, inputTokens, outputTokens, userId, requestId, durationMs, creditsCost);
}
