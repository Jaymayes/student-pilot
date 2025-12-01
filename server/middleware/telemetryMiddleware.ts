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
  transactionId?: string
): void {
  telemetryClient.trackPaymentSucceeded(amountCents, currency, paymentProvider, { 
    userId, 
    requestId, 
    transactionId 
  });
}

export function trackCreditPurchased(
  amountCents: number,
  quantity: number,
  sku: string,
  userId?: string,
  requestId?: string,
  currency?: string
): void {
  telemetryClient.trackCreditPurchased(amountCents, quantity, sku, { 
    userId, 
    requestId, 
    currency 
  });
}
