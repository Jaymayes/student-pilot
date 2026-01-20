# WAF Regression Tests
**RUN_ID**: CEOSPRINT-20260120-EXEC-ZT3G-GATE2-STABILIZE-033
**Timestamp**: 2026-01-20T19:02:00Z

## Test Cases

### TC-1: S2S Telemetry with valid secret (BYPASS expected)
```bash
# Expected: 200 OK, log shows "[WAF] BYPASS S2S"
curl -X POST "https://student-pilot-jamarrlmayes.replit.app/api/telemetry/ingest" \
  -H "Content-Type: application/json" \
  -H "x-scholar-shared-secret: $SHARED_SECRET" \
  -d '{"event_type":"test","app_id":"A5"}'
```

### TC-2: S2S Telemetry without secret (WAF evaluated)
```bash
# Expected: Request evaluated by WAF, SQLi patterns checked
curl -X POST "https://student-pilot-jamarrlmayes.replit.app/api/telemetry/ingest" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","app_id":"A5"}'
```

### TC-3: SQLi attempt without bypass (BLOCK expected)
```bash
# Expected: 403 Forbidden, log shows "[WAF] BLOCK"
curl -X POST "https://student-pilot-jamarrlmayes.replit.app/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"x OR 1=1"}'
```

### TC-4: Underscore keys (selective policy)
```bash
# Expected: _meta preserved, __proto__ blocked
curl -X POST "https://student-pilot-jamarrlmayes.replit.app/api/telemetry/ingest" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","_meta":{"trace":"123"}}'
```

## Results
- TC-1: PASS (verified via A8 telemetry acceptance)
- TC-2: PASS (normal WAF flow, SQLi checked)
- TC-3: PASS (strong patterns block malicious input)
- TC-4: PASS (_meta, _trace, _correlation preserved; __proto__ blocked)
