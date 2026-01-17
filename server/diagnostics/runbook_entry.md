# Runbook: Hard Filters Tuning Guide

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

## Common Scenarios

### Scenario 1: Valid Scholarships Being Hidden (False Negatives)

**Symptoms:**
- Users complaining they can't see scholarships they know they qualify for
- Low match count for users with good profiles
- Support tickets about "missing scholarships"

**Diagnosis Steps:**
1. Check the `failedFilters` array in the filter report for the user
2. Identify which filter is causing the rejection
3. Review the scholarship's `eligibilityCriteria` for data quality issues

**Resolution Options:**

#### If GPA Filter is too strict:
```typescript
// Check if scholarship has unrealistic minGpa (data entry error)
// e.g., minGpa: "5.0" instead of "3.5"
// Fix: Correct the scholarship data in the database
```

#### If Residency Filter is blocking legitimate matches:
```typescript
// Ensure student location includes full state name
// e.g., "Austin, Texas" not just "Austin"

// If scholarship data uses abbreviations inconsistently:
// The filter handles common abbreviations (CA, TX, NY, etc.)
// If custom abbreviations exist, add to stateAbbreviations map
```

#### If Major Filter is too strict:
```typescript
// Enable field-level fallback (already default)
hardFiltersService.updateConfig({ strictMajorMatch: false });

// If still too strict, check scholarship's allowedMajors array
// Ensure it includes related fields, not just exact names
```

### Scenario 2: Expired Scholarships Still Appearing

**Symptoms:**
- Users seeing past-deadline scholarships
- Apply buttons leading to closed applications

**Resolution:**
- Ensure `enableDeadlineFilter: true`
- Check that scholarship `deadline` field is properly formatted (ISO 8601)
- If timezone issues, set `deadlineBufferDays: 1`

### Scenario 3: Too Many Rejections (Overcorrection)

**Symptoms:**
- Users seeing very few or no matches
- Filter stats show >80% rejection rate

**Diagnosis:**
```typescript
const stats = hardFiltersService.getFilterStats();
console.log(stats);
// Check which filter has highest failure rate
```

**Resolution Options:**
1. Temporarily disable the problem filter for analysis
2. Review data quality in the affected eligibility field
3. Add field-level fallback for major matching

## Configuration API

### View Current Configuration
```typescript
import { hardFiltersService } from './services/hardFilters';
console.log(hardFiltersService.getConfig());
```

### Update Configuration
```typescript
hardFiltersService.updateConfig({
  deadlineBufferDays: 1,  // Add 1-day grace period
  strictMajorMatch: false  // Allow field-level matching
});
```

### Reset Statistics
```typescript
hardFiltersService.resetStats();
```

## Monitoring & Alerting

### Key Metrics to Monitor
1. **Rejection Rate**: Should be 30-60% typically
   - Alert if >80% (over-filtering)
   - Alert if <10% (under-filtering, filters may be disabled)

2. **FPR**: Should be <5%
   - Alert if >10% (trust leak returning)

3. **Latency P95**: Should be <100ms
   - Alert if >200ms (performance regression)

### Telemetry Events
- `hard_filter_applied`: Emitted for each scholarship check
- `hard_filter_rejection`: Emitted when scholarship is rejected
- `hard_filter_stats_snapshot`: Periodic stats export (5-minute intervals)

## Emergency Procedures

### Rollback Hard Filters (Emergency Only)
```typescript
// Disable all hard filters temporarily
hardFiltersService.updateConfig({
  enableGpaFilter: false,
  enableResidencyFilter: false,
  enableDeadlineFilter: false,
  enableMajorFilter: false
});

// NOTE: This will return to pre-fix FPR levels (~34%)
// Only use in emergency while investigating
```

### Re-enable After Investigation
```typescript
hardFiltersService.updateConfig({
  enableGpaFilter: true,
  enableResidencyFilter: true,
  enableDeadlineFilter: true,
  enableMajorFilter: true
});
```

## Contact

- **ML Engineering Lead**: Escalate FPR/FNR issues
- **Data Engineering**: Escalate data quality issues in eligibilityCriteria
- **SRE**: Escalate performance/latency issues

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-01-17 | 2.0.0 | Initial hard filters implementation |
