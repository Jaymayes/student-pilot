# CEO Directive: Universal Prompt v1.1 Adoption

**Issued**: October 28, 2025  
**Timeline**: 72 hours  
**Status**: ✅ Deployed and Operational

## Executive Summary

Adopt the Universal Prompt v1.1 (Agent3 Router) across all apps within 72 hours. Agent3 must detect the active overlay, operate only within that overlay's boundaries, emit required events, meet SLOs, and uphold our finance rules (4x AI services markup and 3% provider fee must cover costs and drive profit).

## Success Criteria

### 1. Telemetry ✅
- ✅ `overlay_selected` emitted for every session
- ✅ Revenue events complete (credit_purchase_succeeded, fee_accrued)
- ✅ No PII in events
- ✅ fee_usd computed server-side only

### 2. SLOs
- ⏱️ uptime ≥ 99.9%
- ⏱️ P95 ≤ 120ms
- ⏱️ No sustained slo_at_risk events

### 3. Finance
- 💰 Evidence that 4x AI markup drives positive unit economics
- 💰 3% provider fee covers costs and drives profit

### 4. Governance ✅
- ✅ Guardrails enforced (no essays, no PII, no secrets)
- ✅ Zero security incidents
- ✅ FERPA/COPPA compliance

### 5. ARR Progress
- 📊 First kpi_brief_generated shows non-zero arr_usd and fee_revenue_usd by T+72h

## Rollout Timeline

### T+24h: scholarship_api, scholarship_agent
- Verify overlay_selected events
- Confirm P95 ≤ 120ms
- Check event completeness

### T+48h: student_pilot, provider_register
- Validate revenue events flowing
- Confirm server-side fee calc (variance < $0.01)
- Check B2C/B2B revenue separation

### T+72h: All 8 apps operational
- First kpi_brief_generated with real revenue
- Full overlay isolation verified
- SLO monitoring active

## Per-App Quick Start

### 1. executive_command_center
```bash
APP_OVERLAY=executive_command_center
```
- Produce KPI brief
- Emit: `kpi_brief_generated`

### 2. auto_page_maker
```bash
APP_OVERLAY=auto_page_maker
```
- Create page plans
- Emit: `page_plan_created`, `page_published`

### 3. student_pilot (B2C)
```bash
APP_OVERLAY=student_pilot
```
- Enforce no-essay rule
- On purchase emit: `credit_purchase_succeeded`

### 4. provider_register (B2B)
```bash
APP_OVERLAY=provider_register
```
- Do NOT compute fee client-side
- Backend emits: `fee_accrued` (server-calculated)

### 5. scholarship_api
```bash
APP_OVERLAY=scholarship_api
```
- Serve safe docs
- Emit: `api_doc_viewed`

### 6. scholarship_agent
```bash
APP_OVERLAY=scholarship_agent
```
- Define experiments
- Emit: `experiment_defined`, `campaign_plan_created`

### 7. scholar_auth
```bash
APP_OVERLAY=scholar_auth
```
- Educate, never ask for secrets
- Emit: `auth_doc_viewed`

### 8. scholarship_sage
```bash
APP_OVERLAY=scholarship_sage
```
- Provide safe policy guidance
- Emit: `guidance_provided`

## Validation Commands

### Check Overlay Detection
```bash
curl http://localhost:5000/api/prompts/verify
```

### Test Specific Overlay
```bash
curl "http://localhost:5000/api/prompts/overlay/student_pilot"
```

### Verify Revenue Events (B2C)
```sql
SELECT COUNT(*), SUM((properties->>'revenue_usd')::decimal) 
FROM business_events 
WHERE event_name = 'credit_purchase_succeeded';
```

### Validate B2B Fee Calculation
```sql
SELECT scholarship_id, 
       (properties->>'award_amount')::decimal as award,
       (properties->>'fee_usd')::decimal as fee,
       ABS((properties->>'fee_usd')::decimal - (properties->>'award_amount')::decimal * 0.03) as variance
FROM business_events 
WHERE event_name = 'fee_accrued'
HAVING ABS((properties->>'fee_usd')::decimal - (properties->>'award_amount')::decimal * 0.03) > 0.01;
```

### PII Safety Scan
```sql
SELECT * FROM business_events 
WHERE properties::text ~* 'email|ssn|phone|password';
-- Should return 0 rows
```

## Instant Rollback

If issues arise:
```bash
PROMPT_MODE=separate
```
No code changes required.

## Contact

For issues or questions, contact the platform team immediately.
