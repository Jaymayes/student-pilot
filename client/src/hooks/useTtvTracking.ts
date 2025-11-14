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
  | "first_application_submitted";

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
    try {
      const sessionId = generateSessionId();
      
      await apiRequest('POST', '/api/analytics/ttv-event', {
        eventType,
        metadata,
        sessionId
      });
      
      console.log(`TTV Event tracked: ${eventType}`, metadata);
    } catch (error) {
      console.error(`Failed to track TTV event ${eventType}:`, error);
      // Don't throw - analytics shouldn't break user experience
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

  return {
    trackEvent,
    trackSignup,
    trackProfileComplete,
    trackFirstDocumentUpload,
    trackFirstMatchViewed,
    trackFirstApplicationStarted,
    trackFirstEssayAssistance,
    trackFirstAiUsage,
    trackFirstCreditPurchase,
    trackFirstApplicationSubmitted,
  };
}