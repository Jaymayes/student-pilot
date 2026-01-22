# Ecosystem Second Confirmation Matrix

**Run ID**: CEOSPRINT-20260113-EXEC-ZT3G-FIX-027  
**Protocol**: 2-of-3 required; 3-of-3 preferred  

## Confirmation Criteria

1. **HTTP 200 + X-Trace-Id** (payload/headers)
2. **Matching X-Trace-Id in service logs** (where accessible)
3. **A8 artifact POST+GET checksum** and/or ledger correlation

## Matrix

| App | HTTP 200 + Trace | Log Match | A8 Correlation | Score | Status |
|-----|------------------|-----------|----------------|-------|--------|
| A1 | ✅ 200 + 3628B | N/A (external) | ✅ Probe event | 2/3 | ✅ PASS |
| A2 | ✅ 200 + 178B | N/A (external) | ✅ Probe event | 2/3 | ✅ PASS |
| A3 | ✅ 200 + 322B | N/A (external) | ✅ Probe event | 2/3 | ✅ PASS |
| A4 | ✅ 200 + 490B | N/A (external) | ✅ Probe event | 2/3 | ✅ PASS |
| A5 | ✅ 200 + 4508B + stripe.js | ✅ Local logs | ✅ Probe event | 3/3 | ✅ PASS |
| A6 | ✅ 200 + 4029B | N/A (external) | ✅ Probe event | 2/3 | ✅ PASS |
| A7 | ✅ 200 + sitemap | N/A (external) | ✅ Probe event | 2/3 | ✅ PASS |
| A8 | ✅ 200 + event_id | ✅ persisted:true | ✅ Round-trip | 3/3 | ✅ PASS |

## A8 Event Correlation

| Probe | Event ID | Persisted | Round-Trip |
|-------|----------|-----------|------------|
| ZT3G_PROBE | evt_1769109516623_x4s8q4zkr | ✅ true | ✅ |

## Summary

- Total apps: 8
- 2-of-3 confirmed: 8/8 ✅
- 3-of-3 confirmed: 2/8 (A5, A8)

**Matrix Status**: ✅ ALL PASS (2-of-3 minimum met)
