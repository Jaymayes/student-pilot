# Manual Intervention Manifest (Run 021 - Protocol v29)

**RUN_ID:** CEOSPRINT-20260113-EXEC-ZT3G-FIX-021  
**Generated:** 2026-01-12T20:51:30Z  
**Protocol:** AGENT3_HANDSHAKE v29 (Strict + Scorched Earth)

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

### A5 (student_pilot) — Deployment Needed

| Item | Action | Owner |
|------|--------|-------|
| Status | Local server HEALTHY, deployed URL returns 404 | - |
| Action | Publish/deploy this workspace | User/BizOps |
| Verification | `curl -vL https://scholarlink-student-pilot-jamarrlmayes.replit.app/health` | User |

### A6 (scholarship_admin) — HTTP 404 (13th consecutive)

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

## A5 Local Status (This Workspace)

| Component | Status | Evidence |
|-----------|--------|----------|
| Health endpoint | HEALTHY | `{"status":"ok"}` |
| Session Cookie | COMPLIANT | SameSite/Secure configured |
| Security Headers | COMPLIANT | HSTS + CSP + X-Frame-Options |
| Stripe.js | ALLOWED | CSP includes js.stripe.com |

**A5 code is compliant. Deployment/publishing is the only action needed.**

---

## HITL Approvals Pending

| Action | Status | Blocker |
|--------|--------|---------|
| A4 Republish | AWAITING | BizOps cross-workspace access |
| A5 Publish | AWAITING | User action to publish |
| A6 Republish | AWAITING | BizOps cross-workspace access |
| Micro-charge | FORBIDDEN | Stripe 4/25, needs CEO explicit override |

---

*Status: AWAITING DEPLOYMENT ACTIONS*  
*RUN_ID: CEOSPRINT-20260113-EXEC-ZT3G-FIX-021*
