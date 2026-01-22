# Manual Intervention Manifest

**Run ID**: CEOSPRINT-20260121-VERIFY-ZT3G-V2S2-028

## A6 Provider Portal - BLOCKED

**Status**: 404 Not Found
**URL**: https://provider-portal-jamarrlmayes.replit.app

### Required Actions

1. Open Provider Portal workspace in Replit
2. Ensure server binds to `0.0.0.0:${PORT || 3000}`
3. Add `/health` endpoint returning JSON:
   ```json
   {"status":"healthy","service":"provider_portal","version":"1.0.0"}
   ```
4. Publish the deployment
5. Verify with: `curl https://provider-portal-jamarrlmayes.replit.app/health`

### Impact
- B2B provider onboarding UI unavailable
- Provider API access via A2/A3 still functional
