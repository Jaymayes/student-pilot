# Manual Intervention Manifest

**Run ID**: CEOSPRINT-20260121-VERIFY-ZT3G-V2S2-029

## A6 Provider Portal - BLOCKED

**URL**: https://provider-portal-jamarrlmayes.replit.app
**Status**: 404 Not Found

### Required Actions

1. Open Provider Portal workspace
2. Ensure server binds to `0.0.0.0:${PORT || 3000}`
3. Add `/health` endpoint:
   ```javascript
   app.get('/health', (req, res) => {
     res.json({status:'healthy',service:'provider_portal',version:'1.0.0'});
   });
   ```
4. Deploy/Publish
5. Verify: `curl https://provider-portal-jamarrlmayes.replit.app/health`
