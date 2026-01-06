# Risk Register
**Scholar Ecosystem Audit**  
**Date:** 2026-01-06T18:55Z  
**Namespace:** simulated_audit

---

## Risk Classification

| Severity | Description | SLA |
|----------|-------------|-----|
| Critical | Revenue/security impact, immediate action | < 4 hours |
| High | Major functionality blocked | < 24 hours |
| Medium | Degraded experience, workarounds exist | < 1 week |
| Low | Minor issues, monitoring only | Backlog |

---

## Active Risks

### RISK-001: B2B Revenue Pathway Blocked
| Field | Value |
|-------|-------|
| **ID** | RISK-001 |
| **Severity** | Critical |
| **Category** | Revenue |
| **Service** | A6 (Provider Register) |
| **Description** | A6 returning 500 on all endpoints, blocking provider registration and B2B revenue |
| **Impact** | $0 B2B revenue; providers cannot onboard |
| **Likelihood** | Confirmed (100%) |
| **Root Cause** | Suspected database connection or env var issue |
| **Mitigation** | Access A6 logs, diagnose, fix configuration |
| **Owner** | TBD |
| **Status** | Open |
| **ETA** | 4 hours after diagnosis |

---

### RISK-002: Revenue Visibility Blindness
| Field | Value |
|-------|-------|
| **ID** | RISK-002 |
| **Severity** | High |
| **Category** | Observability |
| **Service** | A3/A8 |
| **Description** | Finance Tile showing $0; no revenue events reaching A8 |
| **Impact** | Cannot track revenue, make data-driven decisions |
| **Likelihood** | Confirmed (100%) |
| **Root Cause** | A6 down blocks B2B; possible A8 scope issue |
| **Mitigation** | 1) Fix A6; 2) Verify A8 write permissions; 3) Check Stripe webhooks |
| **Owner** | Revenue Team + A8 Team |
| **Status** | Open |
| **ETA** | Dependent on RISK-001 |

---

### RISK-003: Auth Token/Session Issues
| Field | Value |
|-------|-------|
| **ID** | RISK-003 |
| **Severity** | Medium |
| **Category** | Security |
| **Service** | A1 (Scholar Auth) |
| **Description** | Users reporting "Session Expired" and "invalid_request" errors |
| **Impact** | Login failures, user frustration |
| **Likelihood** | Partial (some flows affected) |
| **Root Cause** | Possible: clock skew, client_id mismatch, redirect_uri not in allowlist |
| **Mitigation** | Validate client_id; check redirect_uri allowlist; review session cookie config |
| **Owner** | Auth Team |
| **Status** | Investigation |
| **ETA** | 2 hours |

---

### RISK-004: Health Monitoring Gaps
| Field | Value |
|-------|-------|
| **ID** | RISK-004 |
| **Severity** | Medium |
| **Category** | Reliability |
| **Service** | A2 (Scholarship API) |
| **Description** | Missing /ready endpoint causes A5 to report A2 as unhealthy |
| **Impact** | False negative health status; dependency monitoring unreliable |
| **Likelihood** | Confirmed (100%) |
| **Root Cause** | Endpoint not implemented (Issue A from prior audit) |
| **Mitigation** | Implement /ready endpoint; PR spec exists |
| **Owner** | A2 Team |
| **Status** | PR Ready |
| **ETA** | 1 day |

---

### RISK-005: A7 Not Configured in A5
| Field | Value |
|-------|-------|
| **ID** | RISK-005 |
| **Severity** | Low |
| **Category** | Integration |
| **Service** | A5 |
| **Description** | AUTO_PAGE_MAKER_URL not set; A7 shows as "not_configured" |
| **Impact** | No marketing attribution tracking A7→A5 |
| **Likelihood** | Confirmed (100%) |
| **Root Cause** | Missing environment variable |
| **Mitigation** | Set AUTO_PAGE_MAKER_URL in A5 configuration |
| **Owner** | Ops |
| **Status** | Open |
| **ETA** | 1 hour |

---

### RISK-006: High Memory Alerts
| Field | Value |
|-------|-------|
| **ID** | RISK-006 |
| **Severity** | Low |
| **Category** | Cost/Performance |
| **Service** | A8 |
| **Description** | High Memory Usage alerts every 5 minutes |
| **Impact** | Alert fatigue; potential false positive masking real issues |
| **Likelihood** | Recurring |
| **Root Cause** | Alert threshold too sensitive or actual memory pressure |
| **Mitigation** | Tune alert thresholds; investigate memory usage patterns |
| **Owner** | Ops |
| **Status** | Monitoring |
| **ETA** | 1 week |

---

### RISK-007: Auth Token Leakage
| Field | Value |
|-------|-------|
| **ID** | RISK-007 |
| **Severity** | Medium |
| **Category** | Security |
| **Service** | A1/A5 |
| **Description** | Session cookies use SameSite=none (required for cross-domain OIDC) |
| **Impact** | Theoretical CSRF risk if httpOnly not set |
| **Likelihood** | Low (httpOnly=true mitigates) |
| **Root Cause** | Cross-domain OIDC requires SameSite=none |
| **Mitigation** | Ensure httpOnly=true; verify Secure attribute; implement CSRF tokens |
| **Owner** | A1 Team |
| **Status** | Mitigated |
| **ETA** | N/A |

---

## Risk Matrix

```
                    LIKELIHOOD
              Low    Medium    High    Confirmed
         ┌─────────┬─────────┬─────────┬─────────┐
Critical │         │         │         │ RISK-001│
         ├─────────┼─────────┼─────────┼─────────┤
    High │         │         │         │ RISK-002│
         ├─────────┼─────────┼─────────┼─────────┤
  Medium │ RISK-007│         │ RISK-003│ RISK-004│
         ├─────────┼─────────┼─────────┼─────────┤
     Low │         │ RISK-006│         │ RISK-005│
         └─────────┴─────────┴─────────┴─────────┘
```

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | Open |
| High | 1 | Open |
| Medium | 3 | Mixed |
| Low | 2 | Monitoring |
| **Total** | **7** | |

---

*Risk register maintained as part of audit process. Review and update after each remediation cycle.*
