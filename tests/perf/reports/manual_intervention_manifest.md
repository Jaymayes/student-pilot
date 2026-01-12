# Manual Intervention Manifest (Run 017 - Protocol v28)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-017  
**Generated:** 2026-01-12T19:06:05Z  
**Protocol:** AGENT3_HANDSHAKE v28 (Strict Mode)

---

## Cross-Workspace Actions Required

### A4 (scholarship_ai) — HTTP 404

| Item | Action | Owner |
|------|--------|-------|
| Replit URL | https://replit.com/@jamarrlmayes/scholarship-ai | BizOps |
| Start Command | `node server.js` or `npm start` binding `0.0.0.0:$PORT` | DevTeam |
| Health Route | Add `/health` returning JSON with marker | DevTeam |
| Port Binding | `app.listen(process.env.PORT || 3000, "0.0.0.0")` | DevTeam |
| Verification | `curl -vL https://scholarship-ai-jamarrlmayes.replit.app/health?t=$(date +%s%3N)` | BizOps |

### A6 (scholarship_admin) — HTTP 404 (12th consecutive)

| Item | Action | Owner |
|------|--------|-------|
| Replit URL | https://replit.com/@jamarrlmayes/scholarship-admin | BizOps |
| Start Command | `node server.js` or `npm start` binding `0.0.0.0:$PORT` | DevTeam |
| Health Route | Add `/health` returning JSON with marker | DevTeam |
| Port Binding | `app.listen(process.env.PORT || 3000, "0.0.0.0")` | DevTeam |
| EADDRINUSE | Single start process, kill conflicting PIDs | DevTeam |
| Verification | `curl -vL https://scholarship-admin-jamarrlmayes.replit.app/health?t=$(date +%s%3N)` | BizOps |

---

## Health Route Template

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    system_identity: 'APP_NAME',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});
```

---

## A5 Status (This Workspace)

| Component | Status | Evidence |
|-----------|--------|----------|
| Session Cookie | COMPLIANT | sameSite='none', secure=true, httpOnly=true |
| Security Headers | COMPLIANT | Helmet + CSP + HSTS |
| Port Binding | COMPLIANT | 0.0.0.0:PORT |
| Stripe Integration | COMPLIANT | Keys configured, js.stripe.com verified |
| Content Marker | VERIFIED | `status:ok` in /health (Protocol v28) |

**A5 requires no fixes.**

---

## Remediation Summary

| App | Status | Content Verified | Action Required |
|-----|--------|------------------|-----------------|
| A1 | 200 | Yes | None (healthy) |
| A2 | 200 | Yes | None (healthy) |
| A3 | 200 | Yes | None (healthy) |
| A4 | 404 | No | **DEPLOY** |
| A5 | 200 | Yes | None (compliant) |
| A6 | 404 | No | **DEPLOY** |
| A7 | 200 | Yes | None (healthy) |
| A8 | 200 | Yes | None (healthy) |

---

## HITL Approvals Pending

| Action | Status | Blocker |
|--------|--------|---------|
| A4 Republish | AWAITING | BizOps cross-workspace access |
| A6 Republish | AWAITING | BizOps cross-workspace access |
| Micro-charge | FORBIDDEN | Stripe 4/25, needs CEO explicit override |

---

*Status: AWAITING BIZOPS ACTION*  
*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-017*
