import type { Request, Response, NextFunction } from 'express';
import { secureLogger } from '../logging/secureLogger';
import { storage } from '../storage';

export interface PrivacySettings {
  isMinor: boolean;
  age: number | null;
  doNotSell: boolean;
  doNotTrack: boolean;
  disableTrackingPixels: boolean;
  gpcEnabled: boolean;
  trackingRestrictions: TrackingRestriction[];
  policyVersion: string;
}

export type TrackingRestriction = 
  | 'analytics_tracking'
  | 'marketing_pixels'
  | 'third_party_sharing'
  | 'behavioral_advertising'
  | 'cross_site_tracking'
  | 'location_tracking';

declare global {
  namespace Express {
    interface Request {
      privacySettings?: PrivacySettings;
    }
  }
}

const PRIVACY_POLICY_VERSION = '1.0.0';

const calculateAge = (birthdate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  
  return age;
};

const isGpcEnabled = (req: Request): boolean => {
  const gpcHeader = req.headers['sec-gpc'];
  return gpcHeader === '1' || gpcHeader === 'true';
};

const isDntEnabled = (req: Request): boolean => {
  const dntHeader = req.headers['dnt'];
  return dntHeader === '1';
};

const getTrackingRestrictionsForMinor = (age: number): TrackingRestriction[] => {
  const restrictions: TrackingRestriction[] = [
    'behavioral_advertising',
    'third_party_sharing',
    'cross_site_tracking',
    'location_tracking',
  ];
  
  if (age < 16) {
    restrictions.push('marketing_pixels');
  }
  
  if (age < 13) {
    restrictions.push('analytics_tracking');
  }
  
  return restrictions;
};

const createDefaultPrivacySettings = (gpcEnabled: boolean, dntEnabled: boolean): PrivacySettings => {
  return {
    isMinor: false,
    age: null,
    doNotSell: gpcEnabled || dntEnabled,
    doNotTrack: dntEnabled,
    disableTrackingPixels: gpcEnabled,
    gpcEnabled,
    trackingRestrictions: gpcEnabled ? ['behavioral_advertising', 'cross_site_tracking'] : [],
    policyVersion: PRIVACY_POLICY_VERSION,
  };
};

const createMinorPrivacySettings = (age: number, gpcEnabled: boolean): PrivacySettings => {
  return {
    isMinor: true,
    age,
    doNotSell: true,
    doNotTrack: true,
    disableTrackingPixels: true,
    gpcEnabled,
    trackingRestrictions: getTrackingRestrictionsForMinor(age),
    policyVersion: PRIVACY_POLICY_VERSION,
  };
};

export function privacyByDefaultMiddleware(req: Request, res: Response, next: NextFunction) {
  const gpcEnabled = isGpcEnabled(req);
  const dntEnabled = isDntEnabled(req);
  
  req.privacySettings = createDefaultPrivacySettings(gpcEnabled, dntEnabled);
  
  res.setHeader('X-Privacy-Policy-Version', PRIVACY_POLICY_VERSION);
  
  if (gpcEnabled) {
    res.setHeader('X-GPC-Acknowledged', '1');
    secureLogger.info('GPC header detected and acknowledged', {
      correlationId: (req as any).correlationId,
      path: req.path,
    });
  }
  
  next();
}

export async function minorPrivacyMiddleware(req: Request, res: Response, next: NextFunction) {
  const gpcEnabled = isGpcEnabled(req);
  const dntEnabled = isDntEnabled(req);
  
  if (!req.privacySettings) {
    req.privacySettings = createDefaultPrivacySettings(gpcEnabled, dntEnabled);
  }
  
  const userId = (req.user as any)?.claims?.sub;
  if (!userId) {
    return next();
  }
  
  try {
    const user = await storage.getUser(userId);
    
    if (!user?.birthdate) {
      return next();
    }
    
    const age = calculateAge(user.birthdate);
    
    if (age < 18) {
      req.privacySettings = createMinorPrivacySettings(age, gpcEnabled);
      
      res.setHeader('X-Minor-Privacy-Protected', '1');
      res.setHeader('X-Privacy-Age-Tier', age < 13 ? 'child' : 'teen');
      
      secureLogger.info('Minor privacy protections applied', {
        correlationId: (req as any).correlationId,
        path: req.path,
        ageTier: age < 13 ? 'child' : 'teen',
        restrictionsCount: req.privacySettings.trackingRestrictions.length,
      });
    }
    
    next();
  } catch (error) {
    secureLogger.error('Failed to apply minor privacy protections', error as Error, {
      correlationId: (req as any).correlationId,
      path: req.path,
      userId,
    });
    next();
  }
}

export function trackingGuardMiddleware(req: Request, res: Response, next: NextFunction) {
  const settings = req.privacySettings;
  
  if (!settings) {
    return next();
  }
  
  if (settings.disableTrackingPixels) {
    res.setHeader('Content-Security-Policy', 
      "img-src 'self' data: https:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "connect-src 'self' https://api.stripe.com https://api.openai.com;"
    );
  }
  
  if (settings.doNotSell) {
    res.setHeader('X-Do-Not-Sell', '1');
  }
  
  if (settings.doNotTrack) {
    res.setHeader('X-Tracking-Status', 'disabled');
  }
  
  next();
}

export function shouldAllowTracking(req: Request, trackingType: TrackingRestriction): boolean {
  const settings = req.privacySettings;
  
  if (!settings) {
    return true;
  }
  
  return !settings.trackingRestrictions.includes(trackingType);
}

export function shouldAllowThirdPartySharing(req: Request): boolean {
  return shouldAllowTracking(req, 'third_party_sharing');
}

export function shouldAllowBehavioralAds(req: Request): boolean {
  return shouldAllowTracking(req, 'behavioral_advertising');
}

export function shouldAllowAnalytics(req: Request): boolean {
  return shouldAllowTracking(req, 'analytics_tracking');
}

export class DataServicePrivacyPolicy {
  static applyToDataRequest(req: Request, dataPayload: any): any {
    const settings = req.privacySettings;
    
    if (!settings || !settings.isMinor) {
      return dataPayload;
    }
    
    return {
      ...dataPayload,
      _privacyPolicy: {
        version: settings.policyVersion,
        isMinor: settings.isMinor,
        doNotSell: settings.doNotSell,
        doNotTrack: settings.doNotTrack,
        restrictions: settings.trackingRestrictions,
        appliedAt: new Date().toISOString(),
      },
    };
  }
  
  static shouldPropagateToThirdParty(req: Request, thirdPartyType: string): boolean {
    const settings = req.privacySettings;
    
    if (!settings) {
      return true;
    }
    
    if (settings.isMinor) {
      const allowedForMinors = ['essential_services', 'educational_partners'];
      return allowedForMinors.includes(thirdPartyType);
    }
    
    if (settings.trackingRestrictions.includes('third_party_sharing')) {
      const gpcAllowed = ['essential_services'];
      return gpcAllowed.includes(thirdPartyType);
    }
    
    return true;
  }
  
  static getDataRetentionPolicy(req: Request): { maxRetentionDays: number; requiresParentalConsent: boolean } {
    const settings = req.privacySettings;
    
    if (!settings || !settings.isMinor || settings.age === null) {
      return { maxRetentionDays: 365 * 7, requiresParentalConsent: false };
    }
    
    if (settings.age < 13) {
      return { maxRetentionDays: 30, requiresParentalConsent: true };
    }
    
    return { maxRetentionDays: 365, requiresParentalConsent: false };
  }
}

export const privacyMiddleware = {
  base: privacyByDefaultMiddleware,
  minor: minorPrivacyMiddleware,
  trackingGuard: trackingGuardMiddleware,
};
