# 🔒 Security Notice - OAuth Client Secret

## ⚠️ IMPORTANT: Secret Management

The OAuth client secret for Student Pilot's integration with Scholar Auth **MUST** be obtained securely and **NEVER** committed to version control.

---

## How to Obtain the Client Secret

### For Development/Testing:
1. **Contact Scholar Auth Administrator**
   - Request the OAuth client secret for `student-pilot`
   - Secret will be provided through secure channel (NOT email, NOT Slack)

2. **Add to Replit Secrets**
   - Go to: **Tools → Secrets** in Replit
   - Add: `AUTH_CLIENT_SECRET=<secret-from-admin>`
   - **Never** paste into code files or documentation

### For Production:
- Use your organization's secrets management system
- Rotate secrets regularly
- Monitor for unauthorized access

---

## Security Best Practices

### ✅ DO:
- Store client secret in Replit Secrets or secrets manager
- Rotate secrets periodically
- Use environment variables for secrets
- Restrict access to secrets to authorized personnel only
- Delete secrets from local machines after adding to Replit

### ❌ DON'T:
- ❌ Hardcode secrets in source code
- ❌ Commit secrets to Git/version control
- ❌ Share secrets via email, Slack, or other unsecured channels
- ❌ Store secrets in configuration files tracked by Git
- ❌ Log secrets in application logs

---

## E2E Test Credentials

Test credentials in `.env.test` are **templates only**:

```bash
# ⚠️ Replace with actual test credentials locally
TEST_EMAIL_STUDENT=your-test-email@example.com
TEST_PASSWORD_STUDENT=your-secure-test-password
```

**Never commit real test credentials to version control.**

---

## What to Do If Secret is Compromised

1. **Immediately notify Scholar Auth administrator**
2. **Rotate the client secret** in Scholar Auth
3. **Update secret** in all environments (Replit Secrets, CI/CD, etc.)
4. **Review access logs** for unauthorized usage
5. **Investigate** how the secret was compromised
6. **Implement additional safeguards** to prevent future incidents

---

## Required OAuth Secrets

All of these must be added to **Replit Secrets** (never hardcoded):

```bash
FEATURE_AUTH_PROVIDER=scholar-auth          # ✅ Safe to document
AUTH_CLIENT_ID=student-pilot                # ✅ Safe to document
AUTH_CLIENT_SECRET=<OBTAIN_SECURELY>        # ⚠️ NEVER hardcode
AUTH_ISSUER_URL=https://scholar-auth...     # ✅ Safe to document
```

Only the `AUTH_CLIENT_SECRET` is sensitive and must be obtained through secure channels.

---

## Verification

To verify secrets are properly configured (without exposing them):

```bash
# Check if secrets exist (won't show values)
echo "Checking secrets..."
[ -z "$AUTH_CLIENT_SECRET" ] && echo "❌ Missing AUTH_CLIENT_SECRET" || echo "✅ AUTH_CLIENT_SECRET configured"
```

---

**Remember**: Security is everyone's responsibility. When in doubt, ask your security team.
