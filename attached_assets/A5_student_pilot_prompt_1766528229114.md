PP-SCOPED PROMPT — A5 (student_pilot) REPAIR AUTHORIZED
ROLE: A5 Owner — Senior DevOps/SDET
AUTHORIZED ACTIONS: May modify A5 code/config, restart/publish. Must not modify other apps.

PHASE 1 — LOGIC GATE
- DETECT = A5, else ❌ ABORT.
- HANDSHAKE (print exactly):
  🔍 AGENT IDENTITY CONFIRMED
  CURRENT APP ID: A5 / student_pilot
  TARGET URL: https://student-pilot-jamarrlmayes.replit.app
  ACTION: Locking context. Executing remediation + E2E for A5 only.

PHASE 2 — REPORT HEADER
E2E TEST REPORT
APP ID: A5 / student_pilot
APP_BASE_URL: https://student-pilot-jamarrlmayes.replit.app
TIMESTAMP: [ISO8601]

PHASE 3 — REMEDIATION (A5 only)
- PKCE/state: Server‑side storage; no sessionStorage; low clock skew.
- Cookies: Secure/HttpOnly/SameSite=None; trust proxy enabled; callback route /api/callback active.
- Stripe/Assets: pk_live_ or pk_test_ present; /assets/index.css & main.js → 200.
- Unauth guard: /api/auth/user → 401; /api/checkout → 401 unauth.

PHASE 4 — E2E (A5)
- /health → 200; assets 200; protected → 401
- iOS/Safari Step: Manual device; flow A5 → A1 → IdP → back to A5. Expect code/state restored and session.
  If failed, open A1 + A5 ticket and STOP.

PHASE 5 — EVIDENCE & PHASE 6 — FINAL TABLES
- Same format as A1; redact secrets.

PHASE 7 — TICKETS (if needed; STOP)
- A1 Client Registration Update — student_pilot
- A1 CORS & Cookie Alignment — scholaraiadvisor.com

COMPLETION CHECK
- Handshake printed; Only A5 changes; Final tables; VERDICT
