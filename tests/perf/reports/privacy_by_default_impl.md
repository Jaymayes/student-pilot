# Privacy-by-Default Implementation

**Version**: 1.0.0  
**Date**: 2026-01-21  
**Compliance**: COPPA, FERPA, CCPA (CPRA)

## Overview

The Privacy-by-Default system automatically protects minors (13-17) and honors user privacy preferences per CCPA/COPPA/FERPA requirements.

## Implementation Components

### 1. Schema Fields

**Users Table:**
```typescript
doNotSell: boolean("do_not_sell").default(false)  // CCPA opt-out
privacyMode: boolean("privacy_mode").default(false) // Enhanced privacy
```

**Providers Table:**
```typescript
doNotSell: boolean("do_not_sell").default(false)
privacyMode: boolean("privacy_mode").default(false)
```

### 2. Privacy Middleware

**File:** `server/middleware/privacyByDefault.ts`

**Detection:**
- GPC header: `Sec-GPC: 1`
- DNT header: `DNT: 1`
- Age from birthdate in user profile

**Age-Based Restrictions:**
| Age | Restrictions |
|-----|-------------|
| <13 | All tracking disabled, parental consent required |
| 13-15 | Marketing pixels disabled, third-party sharing blocked |
| 16-17 | Cross-site tracking blocked, location tracking blocked |
| 18+ | Standard privacy controls |

### 3. Tracking Restrictions

```typescript
type TrackingRestriction = 
  | 'analytics_tracking'
  | 'marketing_pixels'
  | 'third_party_sharing'
  | 'behavioral_advertising'
  | 'cross_site_tracking'
  | 'location_tracking';
```

### 4. Response Headers

Privacy middleware sets:
```
Permissions-Policy: interest-cohort=(), browsing-topics=()
X-Privacy-Mode: true (if enabled)
```

## DataService Integration

### API Response Filtering

Routes check privacy flags before returning data:
```typescript
if (user.doNotSell || user.privacyMode) {
  // Filter out personal identifiers
  // Mask email addresses
  // Omit behavioral data
}
```

### Audit Logging

All privacy-related accesses logged:
```json
{
  "action": "READ",
  "entity_type": "user",
  "privacy_mode": true,
  "gpc_enabled": true,
  "dnt_enabled": false
}
```

## BFF/UI Integration

### Client Headers

Privacy status communicated via headers:
- `X-Privacy-Mode: true|false`
- `X-Minor-Status: true|false`
- `X-Tracking-Restrictions: comma,separated,list`

### Telemetry Tagging

Events include privacy context:
```json
{
  "event_type": "page_view",
  "privacy_mode": true,
  "gpc_enabled": true,
  "restrictions": ["marketing_pixels", "behavioral_advertising"]
}
```

## Compliance Verification

| Requirement | Status |
|-------------|--------|
| CCPA doNotSell | ✅ Implemented |
| COPPA <13 protection | ✅ Implemented |
| COPPA 13-16 restrictions | ✅ Implemented |
| GPC header honor | ✅ Implemented |
| DNT header honor | ✅ Implemented |
| FERPA education records | ✅ Guard middleware |
| Permissions-Policy | ✅ Set on responses |
