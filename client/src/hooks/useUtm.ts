import { useEffect, useCallback } from 'react';

const UTM_STORAGE_KEY = 'scholarlink_utm';
const UTM_EXPIRY_DAYS = 30;

export interface UtmParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  capturedAt?: string;
}

function getStoredUtm(): UtmParams | null {
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as UtmParams;
    
    if (parsed.capturedAt) {
      const capturedDate = new Date(parsed.capturedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - capturedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > UTM_EXPIRY_DAYS) {
        sessionStorage.removeItem(UTM_STORAGE_KEY);
        return null;
      }
    }
    
    return parsed;
  } catch {
    return null;
  }
}

function storeUtm(params: UtmParams): void {
  try {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify({
      ...params,
      capturedAt: new Date().toISOString()
    }));
  } catch {
  }
}

export function captureUtmFromUrl(): UtmParams {
  if (typeof window === 'undefined') return {};
  
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source') || undefined;
  const utmMedium = urlParams.get('utm_medium') || undefined;
  const utmCampaign = urlParams.get('utm_campaign') || undefined;
  
  if (utmSource || utmMedium || utmCampaign) {
    const params: UtmParams = { utmSource, utmMedium, utmCampaign };
    storeUtm(params);
    return params;
  }
  
  return getStoredUtm() || {};
}

export function useUtm() {
  useEffect(() => {
    captureUtmFromUrl();
  }, []);
  
  const getUtmParams = useCallback((): UtmParams => {
    return captureUtmFromUrl();
  }, []);
  
  const clearUtm = useCallback(() => {
    sessionStorage.removeItem(UTM_STORAGE_KEY);
  }, []);
  
  return { getUtmParams, clearUtm };
}

export function getUtmForCheckout(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  const params = captureUtmFromUrl();
  return {
    utmSource: params.utmSource,
    utmMedium: params.utmMedium,
    utmCampaign: params.utmCampaign
  };
}
