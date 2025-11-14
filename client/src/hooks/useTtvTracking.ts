import { useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

export type TtvEventType = 
  | "signup"
  | "profile_complete" 
  | "first_document_upload"
  | "first_match_generated"
  | "first_match_viewed"
  | "first_application_started"
  | "first_essay_assistance"
  | "first_ai_usage"
  | "first_credit_purchase"
  | "first_application_submitted"
  | "application_submitted"
  | "application_status_viewed";

interface TtvEventMetadata {
  [key: string]: any;
}

export function useTtvTracking() {
  const generateSessionId = useCallback(() => {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('ttv-session-id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('ttv-session-id', sessionId);
      }
      return sessionId;
    }
    return undefined;
  }, []);

  const trackEvent = useCallback(async (
    eventType: TtvEventType, 
    metadata: TtvEventMetadata = {}
  ) => {
    const sessionId = generateSessionId();
    const eventPayload = { eventType, metadata, sessionId };
    
    // Network resilience: Retry with exponential backoff
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await apiRequest('POST', '/api/analytics/ttv-event', eventPayload);
        console.log(`TTV Event tracked: ${eventType}`, metadata);
        return; // Success - exit retry loop
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        
        if (isLastAttempt) {
          console.error(`Failed to track TTV event ${eventType} after ${maxRetries + 1} attempts:`, error);
          
          // Queue event in localStorage for later retry (network resilience)
          try {
            const queueKey = 'ttv-event-queue';
            const existingQueue = JSON.parse(localStorage.getItem(queueKey) || '[]');
            const queueItem = {
              ...eventPayload,
              timestamp: Date.now(),
              attempts: maxRetries + 1
            };
            localStorage.setItem(queueKey, JSON.stringify([...existingQueue, queueItem]));
            console.log(`Queued ${eventType} event for retry`);
          } catch (storageError) {
            console.error('Failed to queue event in localStorage:', storageError);
          }
        } else {
          // Exponential backoff: 1s, 2s, 4s
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`Retry ${attempt + 1}/${maxRetries} for ${eventType} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }, [generateSessionId]);

  // Specific tracking methods for common events
  const trackSignup = useCallback(() => {
    trackEvent('signup');
  }, [trackEvent]);

  const trackProfileComplete = useCallback((completionPercentage: number) => {
    trackEvent('profile_complete', { completionPercentage });
  }, [trackEvent]);

  const trackFirstMatchViewed = useCallback((matchId: string, matchScore?: number) => {
    trackEvent('first_match_viewed', { matchId, matchScore });
  }, [trackEvent]);

  const trackFirstApplicationStarted = useCallback((scholarshipId: string, scholarshipTitle: string) => {
    trackEvent('first_application_started', { scholarshipId, scholarshipTitle });
  }, [trackEvent]);

  const trackFirstEssayAssistance = useCallback((essayId: string, essayType: string) => {
    trackEvent('first_essay_assistance', { essayId, essayType });
  }, [trackEvent]);

  const trackFirstAiUsage = useCallback((serviceType: string, model: string) => {
    trackEvent('first_ai_usage', { serviceType, model });
  }, [trackEvent]);

  const trackFirstCreditPurchase = useCallback((packageCode: string, amount: number) => {
    trackEvent('first_credit_purchase', { packageCode, amount });
  }, [trackEvent]);

  const trackFirstApplicationSubmitted = useCallback((applicationId: string, scholarshipId: string) => {
    trackEvent('first_application_submitted', { applicationId, scholarshipId });
  }, [trackEvent]);

  const trackFirstDocumentUpload = useCallback((documentType: string, documentId: string, fileSize: number) => {
    trackEvent('first_document_upload', { documentType, documentId, fileSize });
  }, [trackEvent]);

  const trackApplicationSubmitted = useCallback((applicationId: string, scholarshipId: string, scholarshipTitle: string) => {
    trackEvent('application_submitted', { applicationId, scholarshipId, scholarshipTitle });
  }, [trackEvent]);

  const trackApplicationStatusViewed = useCallback((applicationId: string, status: string, scholarshipId?: string) => {
    trackEvent('application_status_viewed', { applicationId, status, scholarshipId });
  }, [trackEvent]);

  return {
    trackEvent,
    trackSignup,
    trackProfileComplete,
    trackFirstDocumentUpload,
    trackApplicationSubmitted,
    trackApplicationStatusViewed,
    trackFirstMatchViewed,
    trackFirstApplicationStarted,
    trackFirstEssayAssistance,
    trackFirstAiUsage,
    trackFirstCreditPurchase,
    trackFirstApplicationSubmitted,
  };
}