# Privacy-by-Default Middleware Documentation

**Run ID:** CEOSPRINT-20260121-EXEC-ZT3G-V2-S1-058  
**Date:** 2026-01-21  
**Phase:** C5 - Privacy-by-Default Implementation  
**Status:** ✅ IMPLEMENTED

---

## Overview

This document describes the Privacy-by-Default middleware implementation for ScholarLink, providing enhanced privacy protections for users aged 13-17 in compliance with COPPA, FERPA, and CCPA requirements.

## Age Detection

### How Age is Detected

1. **Primary Source**: User's `birthdate` field stored in the `users` table
2. **Verification Status**: Checked via `ageVerified` boolean flag
3. **Calculation Method**: Standard age calculation from birthdate to current date

```typescript
const calculateAge = (birthdate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  
  return age;
};
```

### Age Tiers

| Age Range | Tier | Protection Level |
|-----------|------|------------------|
| < 13 | Child | Maximum (COPPA) |
| 13-15 | Young Teen | Enhanced |
| 16-17 | Older Teen | Standard Minor |
| 18+ | Adult | Standard |

## What Gets Disabled for Minors

### For All Minors (< 18)

| Feature | Status | Reason |
|---------|--------|--------|
| `doNotSell` | ✅ Enabled | CCPA minor protections |
| `doNotTrack` | ✅ Enabled | Privacy-by-default |
| `disableTrackingPixels` | ✅ Enabled | Prevent behavioral tracking |
| Behavioral Advertising | ❌ Disabled | Not appropriate for minors |
| Third-Party Sharing | ❌ Disabled | Requires parental consent |
| Cross-Site Tracking | ❌ Disabled | Privacy protection |
| Location Tracking | ❌ Disabled | Safety concern |

### Additional Restrictions for Young Teens (< 16)

| Feature | Status | Reason |
|---------|--------|--------|
| Marketing Pixels | ❌ Disabled | GDPR/CCPA youth protections |

### Maximum Restrictions for Children (< 13)

| Feature | Status | Reason |
|---------|--------|--------|
| Analytics Tracking | ❌ Disabled | COPPA compliance |
| All Marketing | ❌ Disabled | COPPA compliance |
| Data Retention | 30 days max | COPPA requirement |
| Parental Consent | ✅ Required | COPPA mandate |

## GPC Header Handling

### Global Privacy Control (GPC) Support

The middleware fully supports the GPC specification (sec-gpc header):

```typescript
const isGpcEnabled = (req: Request): boolean => {
  const gpcHeader = req.headers['sec-gpc'];
  return gpcHeader === '1' || gpcHeader === 'true';
};
```

### GPC Response Headers

When GPC is detected:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-GPC-Acknowledged` | `1` | Confirms GPC signal received |
| `X-Do-Not-Sell` | `1` | Confirms opt-out of data sale |

### GPC-Triggered Restrictions

When GPC header is present:
- Behavioral advertising disabled
- Cross-site tracking disabled
- Third-party sharing restricted to essential services only

## Do Not Track (DNT) Support

Legacy DNT header support is also included:

```typescript
const isDntEnabled = (req: Request): boolean => {
  const dntHeader = req.headers['dnt'];
  return dntHeader === '1';
};
```

## COPPA Compliance Notes

### Children Under 13

1. **Verifiable Parental Consent (VPC)**: Required before data collection
2. **Data Minimization**: Only essential data collected
3. **Retention Limits**: Maximum 30-day retention for non-essential data
4. **Third-Party Restrictions**: Only educational partners allowed
5. **No Behavioral Advertising**: Completely prohibited

### Implementation Details

```typescript
static getDataRetentionPolicy(req: Request): { 
  maxRetentionDays: number; 
  requiresParentalConsent: boolean 
} {
  if (settings.age < 13) {
    return { maxRetentionDays: 30, requiresParentalConsent: true };
  }
  return { maxRetentionDays: 365, requiresParentalConsent: false };
}
```

## FERPA Compliance Notes

### Educational Records Protection

1. **Student Data Classification**: All academic data treated as educational records
2. **Consent Requirements**: FERPA consent integrated with privacy settings
3. **Disclosure Logging**: All data disclosures logged for audit
4. **Parent/Guardian Access**: Supported for minors under 18

### Integration with ConsentService

The privacy middleware works alongside the existing `consentService` to:
- Track FERPA-regulated consent decisions
- Maintain audit trail of data disclosures
- Enforce retention periods per category

## Middleware Chain

### Recommended Order

```typescript
app.use(correlationIdMiddleware);
app.use(privacyByDefaultMiddleware);    // Base GPC/DNT handling
app.use(minorPrivacyMiddleware);         // Age-based protections
app.use(trackingGuardMiddleware);        // Apply CSP headers
```

## HTTP Headers Set

### Request Processing

| Condition | Header | Value |
|-----------|--------|-------|
| Always | `X-Privacy-Policy-Version` | `1.0.0` |
| GPC detected | `X-GPC-Acknowledged` | `1` |
| Minor detected | `X-Minor-Privacy-Protected` | `1` |
| Minor detected | `X-Privacy-Age-Tier` | `child` or `teen` |
| Do Not Sell | `X-Do-Not-Sell` | `1` |
| Tracking disabled | `X-Tracking-Status` | `disabled` |

### Content Security Policy (Tracking Guard)

When tracking pixels are disabled, a restrictive CSP is applied:

```
img-src 'self' data: https:;
script-src 'self' 'unsafe-inline' 'unsafe-eval';
connect-src 'self' https://api.stripe.com https://api.openai.com;
```

## DataService Policy Propagation

### Policy Attachment

Privacy settings are propagated to DataService requests:

```typescript
{
  ...dataPayload,
  _privacyPolicy: {
    version: '1.0.0',
    isMinor: true,
    doNotSell: true,
    doNotTrack: true,
    restrictions: ['behavioral_advertising', 'third_party_sharing', ...],
    appliedAt: '2026-01-21T12:00:00.000Z',
  }
}
```

### Third-Party Propagation Rules

| User Type | Allowed Third Parties |
|-----------|----------------------|
| Minor | `essential_services`, `educational_partners` only |
| GPC Enabled | `essential_services` only |
| Adult (no GPC) | All third parties |

## Helper Functions

### For Application Code

```typescript
import { 
  shouldAllowTracking,
  shouldAllowThirdPartySharing,
  shouldAllowBehavioralAds,
  shouldAllowAnalytics 
} from './middleware/privacyByDefault';

// Check if specific tracking type is allowed
if (shouldAllowAnalytics(req)) {
  trackAnalyticsEvent(event);
}

// Check if third-party sharing is permitted
if (shouldAllowThirdPartySharing(req)) {
  sendToThirdParty(data);
}
```

## Testing Verification

### Manual Test Cases

1. **Adult User with GPC**: Should see behavioral ads disabled
2. **Teen (13-17)**: Should have all minor protections applied
3. **Child (< 13)**: Should have COPPA protections + parental consent required
4. **No Age Data**: Should default to adult with GPC/DNT respect

### Header Verification

```bash
# Test GPC handling
curl -H "Sec-GPC: 1" https://student-pilot.jamarrlmayes.replit.app/api/health

# Expected headers in response:
# X-GPC-Acknowledged: 1
# X-Do-Not-Sell: 1
```

## Audit Trail

All privacy decisions are logged via `secureLogger`:

- GPC signal detection and acknowledgment
- Minor privacy protections applied
- Age tier classification
- Restriction counts

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-21  
**Author:** Agent3 Engineering  
**Review Status:** Implementation Complete
