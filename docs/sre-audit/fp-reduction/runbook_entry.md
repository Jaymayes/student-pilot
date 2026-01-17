# Runbook: Hard Filters Tuning Guide

**Run ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-027  
**Last Updated:** 2026-01-17

## Overview

This runbook provides guidance on tuning the Hard Filters system to balance False Positive Rate (FPR) reduction while avoiding False Negatives.

## Quick Reference

| Filter | Config Key | Default | Safe Range |
|--------|-----------|---------|------------|
| GPA | enabled | `true` | Always enabled |
| Residency | enabled | `true` | Enable/disable based on data quality |
| Deadline | enabled | `true` | Always enabled |
| Major | enabled | `true` | Can disable for "open major" orgs |
| Deadline Buffer | `deadline_buffer_days` | `30` | 0-30 days |
| GPA Tolerance | `gpa_tolerance` | `0.1` | 0.0-0.2 |
| Major Fuzzy | `major_fuzzy_threshold` | `0.8` | 0.6-1.0 |
| Strict Major | `strictMajorMatch` | `true` | true/false |

## API Endpoints

### View Configuration
```bash
curl "https://student-pilot-jamarrlmayes.replit.app/api/scholarships/config"
```

### Update Configuration (Admin)
```bash
curl -X PATCH "https://student-pilot-jamarrlmayes.replit.app/api/scholarships/config" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"deadline_buffer_days": 15}'
```

### Check Baseline FPR
```bash
curl "https://student-pilot-jamarrlmayes.replit.app/api/scholarships/fpr/baseline"
```

### Run Verification
```bash
curl -X POST "https://student-pilot-jamarrlmayes.replit.app/api/scholarships/fpr/verify"
```

## Filter Order
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

## Missing Data Handling

- **GPA missing:** Pass to soft scoring (avoid false negatives)
- **Location missing:** Pass to soft scoring
- **Major missing:** Pass to soft scoring

## Common Issues

### Too Many Rejections
- Check rejection rate (should be 30-60%)
- Increase `gpa_tolerance` or `deadline_buffer_days`
- Set `strictMajorMatch: false`

### False Positives Returning
- Verify hard filters are enabled
- Check filter configuration values
- Review scholarship eligibilityCriteria data quality

## Emergency Rollback

```bash
curl -X PATCH "https://student-pilot-jamarrlmayes.replit.app/api/scholarships/config" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{"hard_filters": []}'
```

**WARNING:** This returns to pre-fix FPR levels (~34%)

## A8 Watchtower Alerts

Configure alerts for:
- FPR > 10% → Trust leak returning
- Rejection rate > 80% → Over-filtering

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-01-17 | 2.0.0 | Initial hard filters implementation |
| 2026-01-17 | 2.0.1 | Fixed missing data handling |
| 2026-01-17 | 2.1.0 | Added API endpoints for runtime config |
