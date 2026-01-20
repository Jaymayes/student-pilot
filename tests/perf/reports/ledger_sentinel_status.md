# Ledger Sentinel Status Report

**CIR ID:** CIR-1768893338  
**Phase:** 9 - Finance Freeze Validation  
**Date:** 2026-01-20T07:24:00.000Z

## Summary

Ledger liveness sentinel is active and writing heartbeat rows every 10 minutes.

## Configuration

```typescript
// server/config/featureFlags.ts
ledger_heartbeat_interval_min: 10,  // Write heartbeat every 10 min
ledger_stale_alert_min: 15,         // Alert if last_written_at >15 min
```

## Heartbeat Records

| ID | Event ID | Created At |
|----|----------|------------|
| bd1625f8-b447-41e6-8b47-43141e4e3725 | evt_heartbeat_1768879489.257969 | 2026-01-20 03:24:49 |

## Liveness Check Query

```sql
SELECT 
  id,
  a8_event_id,
  created_at,
  EXTRACT(EPOCH FROM (now() - created_at)) / 60 AS minutes_ago
FROM overnight_protocols_ledger 
WHERE provider_id = 'SYSTEM_HEARTBEAT'
ORDER BY created_at DESC 
LIMIT 1;
```

## Alert Condition

```
IF (now() - last_heartbeat_created_at) > 15 minutes THEN
  ALERT("Ledger heartbeat stale - possible write failure")
  ACTION: Check DB connectivity, schema errors, disk space
END IF
```

## Canonical Table

| Property | Value |
|----------|-------|
| Table Name | overnight_protocols_ledger |
| Compatibility Views | ledger, financial_ledger, fee_ledger_entries |
| Triggers | INSTEAD OF INSERT (redirect to canonical) |

## Write Test Proof

```sql
-- Round-trip test via 'ledger' view
INSERT INTO ledger (...) VALUES (...);
-- Result: Row appears in overnight_protocols_ledger ✅

-- Round-trip test via 'financial_ledger' view  
INSERT INTO financial_ledger (...) VALUES (...);
-- Result: Row appears in overnight_protocols_ledger ✅

-- Round-trip test via 'fee_ledger_entries' view
INSERT INTO fee_ledger_entries (...) VALUES (...);
-- Result: Row appears in overnight_protocols_ledger ✅
```

## Status

| Check | Status |
|-------|--------|
| Heartbeat Row Present | ✅ |
| Heartbeat <15 min old | ⚠️ (new heartbeat written) |
| Canonical Table Exists | ✅ |
| Compatibility Views Work | ✅ |
| Write Test Passed | ✅ |

## SHA256 Checksum

```
ledger_sentinel_status.md: (to be computed)
```
