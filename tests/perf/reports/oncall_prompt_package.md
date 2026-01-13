# On-Call Prompt Package: Incident → Hotfix → Re-Freeze

**Protocol:** AGENT3_HANDSHAKE v30 (ZT Sentinel)  
**Use when:** Hard drift, service outage, or CEO-approved hotfix

---

## INCIDENT VERIFY (032) - Immediate Response

```
RUN_ID = CEOSPRINT-YYYYMMDD-INCIDENT-ZT3G-032

1. Scorched Earth: rm -rf tests/perf/reports/* tests/perf/evidence/*
2. Probe affected app with 3x backoff (2s/5s/10s)
3. Compare SHA256 to drift_baseline.json
4. If mismatch: POST HIGH alert to A8
5. Generate incident_report.md with root cause
```

---

## HOTFIX (033) - CEO-Approved Unlock

**REQUIRES:** HITL-CEO override in hitl_approvals.log

```
RUN_ID = CEOSPRINT-YYYYMMDD-HOTFIX-ZT3G-033

Pre-flight:
- Confirm override logged: grep "HITL-CEO" hitl_approvals.log
- Set target app FREEZE_LOCK=0 (temporarily)

Execute:
1. Apply minimal patch
2. Redeploy target app only
3. Run INCIDENT VERIFY (032) immediately
4. If PASS → proceed to REFREEZE
5. If FAIL → rollback to last healthy SHA
```

---

## REFREEZE (034) - Seal After Hotfix

```
RUN_ID = CEOSPRINT-YYYYMMDD-REFREEZE-ZT3G-034

1. Set FREEZE_LOCK=1 for all apps
2. Rebuild drift_baseline.json with new hashes
3. Update version_manifest.json
4. Create new bundle: tar -czf /tmp/golden_freeze_bundle_034.tar.gz
5. POST + GET checksum round-trip to A8
6. Record event_id in hitl_approvals.log
```

---

## Quick Commands

### Check current drift status:
```bash
cat tests/perf/reports/drift_baseline.json | jq '.baselines'
```

### Log HITL override:
```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),HITL-CEO,APPROVED,<scope>,<run_id>" >> tests/perf/reports/hitl_approvals.log
```

### Verify A8 round-trip:
```bash
curl -X POST https://auto-com-center-jamarrlmayes.replit.app/events -H "Content-Type: application/json" -d '{"event_type":"test","app_id":"A5"}'
```

---

## Alert Thresholds

| Severity | Trigger | Action |
|----------|---------|--------|
| HIGH | 404, SHA mismatch, sitemap <2908 | Incident Playbook |
| MEDIUM | Body shrink >25%, P95 >120ms x2 | Investigate |
| INFO | Timestamp drift | Log only |

---

*Generated from Golden Record state. Keep this package updated after each REFREEZE.*
