# V1 Retirement Plan

**Cutover Complete:** 2026-01-14  
**Golden Tag:** ZT3G_GOLDEN_20260114_039

---

## Phase 1: Read-Only Observation (7 Days)

**Start:** T+0 (cutover complete)  
**End:** T+7 days

### Actions

| Day | Action | Owner |
|-----|--------|-------|
| 0 | Disable V1 write endpoints | Agent |
| 0 | Enable read-only mode | Agent |
| 0 | Redirect new traffic to V2 | Complete |
| 1-7 | Monitor V1 access patterns | Agent |
| 7 | Generate access report | Agent |

### Access Controls

| Endpoint Type | Status |
|---------------|--------|
| Write (POST/PUT/DELETE) | DISABLED |
| Read (GET) | ENABLED (logging) |
| Admin | RESTRICTED |

---

## Phase 2: Key Rotation (T+24h)

### API Keys to Rotate

| Key Purpose | Status | New Key Generated | Old Key Invalid |
|-------------|--------|-------------------|-----------------|
| DataService ↔ DocumentHub | PENDING | [TIMESTAMP] | [TIMESTAMP] |
| DataService ↔ Orchestrator | PENDING | [TIMESTAMP] | [TIMESTAMP] |
| DocumentHub ↔ Verifier | PENDING | [TIMESTAMP] | [TIMESTAMP] |
| A5 ↔ A2 | PENDING | [TIMESTAMP] | [TIMESTAMP] |
| A5 ↔ A8 | PENDING | [TIMESTAMP] | [TIMESTAMP] |

### Legacy Keys to Invalidate

| Key ID | Service | Last Used | Invalidated |
|--------|---------|-----------|-------------|
| [KEY_1] | V1 DataService | [TIMESTAMP] | [TIMESTAMP] |
| [KEY_2] | V1 Auth | [TIMESTAMP] | [TIMESTAMP] |
| [KEY_3] | V1 Storage | [TIMESTAMP] | [TIMESTAMP] |

---

## Phase 3: Archival (T+7 days)

### Data Archival

| Dataset | Size | Archive Location | Retention |
|---------|------|------------------|-----------|
| V1 User Data | [SIZE] | Cold Storage | 7 years |
| V1 Application Logs | [SIZE] | Log Archive | 90 days |
| V1 Audit Trail | [SIZE] | Compliance Archive | 7 years |

### Code Archival

| Repository | Branch | Tag | Archive Status |
|------------|--------|-----|----------------|
| A5 V1 | main-v1 | V1_FINAL_20260114 | PENDING |
| V1 Configs | - | - | PENDING |

---

## Phase 4: Decommission (T+14 days)

### Infrastructure Teardown

| Resource | Type | Action | Completed |
|----------|------|--------|-----------|
| V1 Compute | Instances | Terminate | PENDING |
| V1 Database | PostgreSQL | Snapshot + Archive | PENDING |
| V1 Storage | Buckets | Archive to Glacier | PENDING |
| V1 DNS | Records | Remove | PENDING |

### Final Verification

| Check | Status |
|-------|--------|
| No active V1 sessions | PENDING |
| All data migrated | PENDING |
| Audit log complete | PENDING |
| Stakeholder sign-off | PENDING |

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Emergency V1 access needed | Keep read-only snapshot for 30 days |
| Data migration gaps | Run reconciliation before archive |
| Compliance requirements | Maintain audit trail in cold storage |

---

## Rollback Capability

**V1 Restore Time:** <15 minutes (from snapshot)  
**V1 Restore Window:** 30 days post-decommission

---

## Completion Criteria

- [ ] 7-day read-only window complete
- [ ] All API keys rotated
- [ ] Legacy keys invalidated
- [ ] V1 access report generated
- [ ] Data archived to compliance standards
- [ ] Infrastructure decommissioned
- [ ] Final sign-off obtained
