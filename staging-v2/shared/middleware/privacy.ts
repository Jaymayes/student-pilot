import { Request, Response, NextFunction } from 'express';

export interface PrivacyOptions {
  telemetryEndpoint?: string;
  enableLogging?: boolean;
}

export interface PrivacyContext {
  doNotSell: boolean;
  isMinor: boolean;
  trackingDisabled: boolean;
  privacyEnforced: boolean;
}

export function ageGateMiddleware(options: PrivacyOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const age = parseInt(req.body?.age || req.query?.age as string || '0');
    const declaredMinor = req.body?.is_minor === true || req.query?.is_minor === 'true';
    
    const isMinor = age > 0 && age < 18 || declaredMinor;
    
    const privacyContext: PrivacyContext = {
      doNotSell: isMinor,
      isMinor,
      trackingDisabled: isMinor,
      privacyEnforced: isMinor
    };
    
    (req as any).privacyContext = privacyContext;
    
    if (isMinor) {
      res.setHeader('X-Do-Not-Sell', 'true');
      res.setHeader('X-Privacy-Enforced', 'true');
      
      res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "frame-ancestors 'none'",
        "form-action 'self'"
      ].join('; '));
      
      if (options.enableLogging) {
        console.log(`[Privacy] Enforced for minor user (age: ${age || 'declared'})`);
      }
      
      if (options.telemetryEndpoint) {
        logPrivacyEvent(options.telemetryEndpoint, {
          event_type: 'privacy_enforced',
          reason: 'under_18',
          timestamp: new Date().toISOString()
        }).catch(() => {});
      }
    }
    
    next();
  };
}

async function logPrivacyEvent(endpoint: string, data: any): Promise<void> {
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.error('[Privacy] Failed to log event:', err);
  }
}

export function getPrivacyContext(req: Request): PrivacyContext {
  return (req as any).privacyContext || {
    doNotSell: false,
    isMinor: false,
    trackingDisabled: false,
    privacyEnforced: false
  };
}

export function requireAdult(req: Request, res: Response, next: NextFunction) {
  const context = getPrivacyContext(req);
  if (context.isMinor) {
    return res.status(403).json({
      error: 'This feature requires adult verification',
      code: 'ADULT_REQUIRED'
    });
  }
  next();
}
