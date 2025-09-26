import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import type { RecruitmentEvent } from '@shared/types/partner';
// Note: Using Web Crypto API for browser environment

/**
 * Configuration for partner event tracking
 */
interface PartnerTrackingConfig {
  enabled: boolean;
  batchSize: number;
  batchTimeout: number; // milliseconds
  retryAttempts: number;
}

const defaultConfig: PartnerTrackingConfig = {
  enabled: true,
  batchSize: 10,
  batchTimeout: 5000, // 5 seconds
  retryAttempts: 3
};

/**
 * Hook for tracking partner recruitment events
 * Handles anonymization, batching, and reliable delivery
 */
export function usePartnerTracking(config: Partial<PartnerTrackingConfig> = {}) {
  const { user } = useAuth();
  const configRef = useRef({ ...defaultConfig, ...config });
  const eventQueueRef = useRef<RecruitmentEvent[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>('');

  // Generate session ID on mount
  useEffect(() => {
    sessionIdRef.current = self.crypto.randomUUID();
  }, []);

  /**
   * Generate anonymized student hash
   * Uses SHA-256 of user ID for privacy protection
   */
  const generateStudentHash = useCallback(async (userId: string): Promise<string> => {
    // In browser environment, use Web Crypto API
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(userId + (import.meta.env.VITE_HASH_SALT || 'scholarlink-salt'));
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback for server-side or environments without Web Crypto
    // This is a simple hash - in production, use proper server-side hashing
    let hash = 0;
    const str = userId + (import.meta.env.VITE_HASH_SALT || 'scholarlink-salt');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, '0').repeat(4).substring(0, 64);
  }, []);

  /**
   * Flush event queue to server
   */
  const flushEvents = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return;

    const events = [...eventQueueRef.current];
    eventQueueRef.current = [];

    try {
      await apiRequest('POST', '/api/partner-events/batch', { events });
    } catch (error) {
      console.error('Failed to send partner events:', error);
      // Re-queue events for retry (up to retry limit)
      eventQueueRef.current.unshift(...events);
    }
  }, []);

  /**
   * Schedule batch flush
   */
  const scheduleBatchFlush = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    batchTimeoutRef.current = setTimeout(() => {
      flushEvents();
      batchTimeoutRef.current = null;
    }, configRef.current.batchTimeout);
  }, [flushEvents]);

  /**
   * Add event to queue and handle batching
   */
  const queueEvent = useCallback((event: RecruitmentEvent) => {
    if (!configRef.current.enabled) return;

    eventQueueRef.current.push(event);

    // Flush immediately if batch size reached
    if (eventQueueRef.current.length >= configRef.current.batchSize) {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      flushEvents();
    } else {
      // Schedule batch flush
      scheduleBatchFlush();
    }
  }, [flushEvents, scheduleBatchFlush]);

  /**
   * Track partner promotion view event
   */
  const trackPromotionView = useCallback(async (
    scholarshipId: string,
    partnerId: string,
    promotionLevel: string,
    rankingPosition?: number
  ) => {
    if (!user?.id) return;

    try {
      const studentHash = await generateStudentHash(user.id);
      const event: RecruitmentEvent = {
        eventId: self.crypto.randomUUID(),
        eventType: 'view',
        scholarshipId,
        partnerId,
        studentHash,
        timestamp: new Date().toISOString(),
        sessionId: sessionIdRef.current,
        correlationId: (window as any).__correlationId,
        metadata: {
          pageUrl: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
          promotionLevel,
          rankingPosition
        }
      };

      queueEvent(event);
    } catch (error) {
      console.error('Failed to track promotion view:', error);
    }
  }, [user?.id, generateStudentHash, queueEvent]);

  /**
   * Track partner promotion click event
   */
  const trackPromotionClick = useCallback(async (
    scholarshipId: string,
    partnerId: string,
    clickTarget: 'scholarship_detail' | 'partner_dashboard' | 'apply_button',
    metadata?: Record<string, any>
  ) => {
    if (!user?.id) return;

    try {
      const studentHash = await generateStudentHash(user.id);
      const event: RecruitmentEvent = {
        eventId: self.crypto.randomUUID(),
        eventType: 'click',
        scholarshipId,
        partnerId,
        studentHash,
        timestamp: new Date().toISOString(),
        sessionId: sessionIdRef.current,
        correlationId: (window as any).__correlationId,
        metadata: {
          pageUrl: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
          clickTarget,
          ...metadata
        }
      };

      queueEvent(event);
    } catch (error) {
      console.error('Failed to track promotion click:', error);
    }
  }, [user?.id, generateStudentHash, queueEvent]);

  /**
   * Track application submission to partner scholarship
   */
  const trackApplicationSubmit = useCallback(async (
    scholarshipId: string,
    partnerId: string,
    conversionValue?: number
  ) => {
    if (!user?.id) return;

    try {
      const studentHash = await generateStudentHash(user.id);
      const event: RecruitmentEvent = {
        eventId: self.crypto.randomUUID(),
        eventType: 'apply',
        scholarshipId,
        partnerId,
        studentHash,
        timestamp: new Date().toISOString(),
        sessionId: sessionIdRef.current,
        correlationId: (window as any).__correlationId,
        metadata: {
          pageUrl: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
          conversionValue
        }
      };

      queueEvent(event);
    } catch (error) {
      console.error('Failed to track application submit:', error);
    }
  }, [user?.id, generateStudentHash, queueEvent]);

  /**
   * Track final conversion (scholarship awarded)
   */
  const trackConversion = useCallback(async (
    scholarshipId: string,
    partnerId: string,
    conversionValue: number
  ) => {
    if (!user?.id) return;

    try {
      const studentHash = await generateStudentHash(user.id);
      const event: RecruitmentEvent = {
        eventId: self.crypto.randomUUID(),
        eventType: 'conversion',
        scholarshipId,
        partnerId,
        studentHash,
        timestamp: new Date().toISOString(),
        sessionId: sessionIdRef.current,
        correlationId: (window as any).__correlationId,
        metadata: {
          pageUrl: window.location.href,
          conversionValue
        }
      };

      // Send conversion events immediately (don't batch)
      try {
        await apiRequest('POST', '/api/partner-events', event);
      } catch (error) {
        console.error('Failed to send conversion event:', error);
        queueEvent(event); // Fallback to queue
      }
    } catch (error) {
      console.error('Failed to track conversion:', error);
    }
  }, [user?.id, generateStudentHash, queueEvent]);

  /**
   * Get current session analytics
   */
  const getSessionAnalytics = useCallback(() => {
    return {
      sessionId: sessionIdRef.current,
      queuedEvents: eventQueueRef.current.length,
      isTrackingEnabled: configRef.current.enabled
    };
  }, []);

  // Cleanup: flush events on unmount
  useEffect(() => {
    return () => {
      if (eventQueueRef.current.length > 0) {
        flushEvents();
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [flushEvents]);

  // Flush events on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (eventQueueRef.current.length > 0) {
        // Use sendBeacon for reliable delivery on page unload
        if ('navigator' in window && 'sendBeacon' in navigator) {
          const events = eventQueueRef.current;
          navigator.sendBeacon(
            '/api/partner-events/batch',
            JSON.stringify({ events })
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    trackPromotionView,
    trackPromotionClick,
    trackApplicationSubmit,
    trackConversion,
    getSessionAnalytics,
    isEnabled: configRef.current.enabled
  };
}