# Manual Intervention Manifest (Golden Record - Run 028)

**RUN_ID:** CEOSPRINT-20260113-VERIFY-ZT3G-028

## Cross-Workspace Actions Required

### A4 (scholarship_ai / saa-verifier)

| Item | Action |
|------|--------|
| URL | https://replit.com/@jamarrlmayes/scholarship-ai |
| Issue | HTTP 404 |
| Fix | Deploy + add /health route |
| Template | `app.get('/health', (req, res) => res.json({service:'saa-verifier',status:'healthy'}))` |
| Bind | host 0.0.0.0:$PORT |
| Owner | BizOps |

### A6 (scholarship_admin)

| Item | Action |
|------|--------|
| URL | https://replit.com/@jamarrlmayes/scholarship-admin |
| Issue | HTTP 404 + /api/providers 404 |
| Fix | Deploy + add /health + /api/providers routes |
| Template | `app.get('/api/providers', (req, res) => res.json([]))` |
| Bind | host 0.0.0.0:$PORT |
| Owner | BizOps |

## HITL Actions Pending

| Action | Status |
|--------|--------|
| A4 Deploy | AWAITING |
| A6 Deploy | AWAITING |
| Micro-charge | FORBIDDEN (4/25) |
