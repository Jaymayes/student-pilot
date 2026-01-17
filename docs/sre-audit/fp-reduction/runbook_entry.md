# Runbook: Hard Filters Tuning Guide

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-027  
**Last Updated:** 2026-01-17

## Overview

This runbook provides guidance on tuning the Hard Filters system to balance False Positive Rate (FPR) reduction while avoiding False Negatives (valid scholarships being hidden).

## Quick Reference

| Filter | Config Key | Default | Safe Range |
|--------|-----------|---------|------------|
| GPA | `enableGpaFilter` | `true` | Always enabled |
| Residency | `enableResidencyFilter` | `true` | Enable/disable based on data quality |
| Deadline | `enableDeadlineFilter` | `true` | Always enabled |
| Major | `enableMajorFilter` | `true` | Can disable for "open major" orgs |
| Deadline Buffer | `deadlineBufferDays` | `0` | 0-3 days |
| Strict Major Match | `strictMajorMatch` | `false` | `false` recommended |

## Implementation Details

### File Locations
- **Hard Filters Service:** `server/services/hardFilters.ts`
- **Integration Point:** `server/services/recommendationEngine.ts`
- **Configuration:** `docs/sre-audit/fp-reduction/hybrid_search_config.json`

### Filter Order
```
Scholarship List
      ↓
[1] Deadline Filter (expired → reject)
      ↓
[2] GPA Filter (below minimum → reject)
      ↓
[3] Residency Filter (wrong state → reject)
      ↓
[4] Major Filter (incompatible → reject)
      ↓
Eligible Scholarships → Soft Scoring
```

## Common Scenarios

### Scenario 1: Valid Scholarships Being Hidden (False Negatives)

**Symptoms:**
- Users complaining they can't see scholarships they know they qualify for
- Low match count for users with good profiles
- Support tickets about "missing scholarships"

**Resolution:**
1. Check missing data handling (should "pass to soft scoring")
2. Verify `strictMajorMatch: false`
3. Add `deadlineBufferDays: 1-3` if timezone issues

### Scenario 2: Expired Scholarships Still Appearing

**Symptoms:**
- Users seeing past-deadline scholarships
- Apply buttons leading to closed applications

**Resolution:**
- Ensure `enableDeadlineFilter: true`
- Check that scholarship `deadline` field is properly formatted (ISO 8601)

### Scenario 3: Too Many Rejections (Overcorrection)

**Symptoms:**
- Users seeing very few or no matches
- Filter stats show >80% rejection rate

**Resolution:**
1. Check filter statistics via `hardFiltersService.getFilterStats()`
2. Temporarily disable the problem filter for analysis
3. Review data quality in the affected eligibility field

## Configuration API

### View Current Configuration
```typescript
import { hardFiltersService } from './services/hardFilters';
console.log(hardFiltersService.getConfig());
```

### Update Configuration
```typescript
hardFiltersService.updateConfig({
  deadlineBufferDays: 1,
  strictMajorMatch: false
});
```

## Monitoring & Alerting

### Key Metrics
1. **Rejection Rate:** Should be 30-60% typically
2. **FPR:** Should be <5%
3. **Latency P95:** Should be <200ms

### A8 Watchtower Alerts
- Alert on rejection rate >80% (over-filtering)
- Alert on FPR >10% (trust leak returning)

## Emergency Rollback

```typescript
// Disable all hard filters temporarily
hardFiltersService.updateConfig({
  enableGpaFilter: false,
  enableResidencyFilter: false,
  enableDeadlineFilter: false,
  enableMajorFilter: false
});
```

**WARNING:** This returns to pre-fix FPR levels (~34%)

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-01-17 | 2.0.0 | Initial hard filters implementation |
| 2026-01-17 | 2.0.1 | Fixed missing data handling (pass to soft scoring) |
