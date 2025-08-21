# ScholarLink Production Incident Response Runbook

**Emergency Contact**: [INSERT ON-CALL ROTATION]  
**Escalation Path**: Development Team → Product Owner → Executive Team  
**Communication Channel**: [INSERT SLACK/TEAMS CHANNEL]

---

## Incident Classification

### P0 - Critical (Complete Service Outage)
- **Definition**: Complete application unavailability or data loss
- **Response Time**: 15 minutes
- **Examples**: Database down, authentication failed, payment processing stopped
- **Actions**: Immediate escalation, all-hands response

### P1 - High (Major Feature Impaired)
- **Definition**: Core functionality degraded but service partially available
- **Response Time**: 1 hour
- **Examples**: AI matching failures, document upload issues, slow response times
- **Actions**: Immediate investigation, hourly updates

### P2 - Medium (Minor Feature Issues)
- **Definition**: Non-critical features affected, workarounds available
- **Response Time**: 4 hours
- **Examples**: UI bugs, minor performance issues, non-critical API errors
- **Actions**: Standard investigation, daily updates

---

## Common Incident Scenarios

### 1. Database Connection Issues

**Symptoms**:
- 500 errors on API endpoints
- Health check failures
- "Database connection failed" messages

**Investigation Steps**:
```bash
# Check database connectivity
curl -f https://your-domain.com/health

# Verify environment variables
echo "DATABASE_URL configured: $([ -n "$DATABASE_URL" ] && echo "YES" || echo "NO")"

# Test direct database connection
npm run db:push --dry-run
```

**Resolution**:
1. Verify Neon database status at console.neon.tech
2. Check connection string format and credentials
3. Restart application if connection pool exhausted
4. Scale up database if resource limits hit

**Prevention**:
- Monitor connection pool metrics
- Set up database health alerts
- Implement connection retry logic

### 2. OpenAI API Failures

**Symptoms**:
- Scholarship matching timeouts
- Essay assistant errors
- Credit charges without results

**Investigation Steps**:
```bash
# Check OpenAI API key
echo "API key configured: $([ -n "$OPENAI_API_KEY" ] && echo "YES" || echo "NO")"

# Test API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.openai.com/v1/models
```

**Resolution**:
1. Check OpenAI status page: status.openai.com
2. Verify API key validity and quotas
3. Implement fallback responses for cached data
4. Enable circuit breaker to prevent credit waste

**Prevention**:
- Monitor OpenAI API quotas and rate limits
- Implement caching for common requests
- Set up fallback mechanisms

### 3. Stripe Payment Issues

**Symptoms**:
- Checkout failures
- Webhook processing errors
- Credit balance inconsistencies

**Investigation Steps**:
```bash
# Check Stripe webhook deliveries
# Review in Stripe Dashboard → Developers → Webhooks

# Verify webhook signature validation
grep "webhook.*signature" server/routes.ts

# Check billing reconciliation
curl -H "Authorization: Bearer [user-token]" \
     https://your-domain.com/api/billing/ledger
```

**Resolution**:
1. Verify Stripe webhook endpoints are accessible
2. Check webhook signature validation
3. Manually reconcile credit balances if needed
4. Contact Stripe support for payment processor issues

**Prevention**:
- Monitor webhook delivery success rates
- Implement idempotent payment processing
- Set up automated reconciliation checks

### 4. Agent Bridge Communication Failures

**Symptoms**:
- Task processing timeouts
- JWT authentication errors
- Agent registration failures

**Investigation Steps**:
```bash
# Check agent endpoints
curl -H "Authorization: Bearer [jwt-token]" \
     https://your-domain.com/agent/capabilities

# Verify JWT configuration
echo "SHARED_SECRET configured: $([ -n "$SHARED_SECRET" ] && echo "YES" || echo "NO")"

# Check agent rate limiting
curl -v https://your-domain.com/agent/register
```

**Resolution**:
1. Verify Auto Com Center connectivity
2. Check JWT secret configuration and rotation
3. Review agent rate limiting settings
4. Restart agent bridge if connection pool issues

**Prevention**:
- Monitor agent communication health
- Implement circuit breakers for agent calls
- Set up JWT token rotation schedule

### 5. Performance Degradation

**Symptoms**:
- Slow page load times (>5s)
- API response times >1s
- High error rates

**Investigation Steps**:
```bash
# Check application performance
curl -w "Response time: %{time_total}s\n" \
     https://your-domain.com/api/health

# Monitor database query performance
# Check slow query logs in Neon dashboard

# Analyze bundle size and loading
npm run build
du -sh dist/
```

**Resolution**:
1. Identify slow database queries and add indexes
2. Review API endpoint performance and optimize
3. Check CDN and static asset delivery
4. Scale up infrastructure if resource constrained

**Prevention**:
- Set up performance monitoring and alerts
- Regular performance testing and optimization
- Database query optimization reviews

---

## Incident Response Procedures

### Initial Response (0-15 minutes)
1. **Acknowledge**: Confirm incident in communication channel
2. **Assess**: Determine severity level and impact scope
3. **Alert**: Notify on-call team and stakeholders
4. **Investigate**: Begin root cause analysis
5. **Communicate**: Post initial status update

### Investigation Phase (15-60 minutes)
1. **Gather Data**: Collect logs, metrics, and error reports
2. **Isolate**: Identify affected components and user segments
3. **Test**: Reproduce issue in staging environment if possible
4. **Document**: Record findings and attempted solutions
5. **Escalate**: Involve additional team members as needed

### Resolution Phase
1. **Implement**: Apply fix or mitigation strategy
2. **Verify**: Confirm resolution in production
3. **Monitor**: Watch for regression or side effects
4. **Communicate**: Update stakeholders on resolution
5. **Document**: Record final solution and timeline

### Post-Incident Review (24-48 hours)
1. **Timeline**: Create detailed incident timeline
2. **Root Cause**: Identify fundamental cause and contributing factors
3. **Action Items**: Define preventive measures and improvements
4. **Documentation**: Update runbooks and monitoring
5. **Communication**: Share learnings with broader team

---

## Communication Templates

### Initial Incident Report
```
🚨 INCIDENT ALERT - P[X] 🚨

Summary: [Brief description of issue]
Impact: [User-facing impact and scope]
Status: INVESTIGATING
ETA for Update: [15/30/60 minutes]
Incident Lead: [Name]

Current Actions:
- [What is being done right now]

Next Update: [Time]
```

### Status Update
```
📊 INCIDENT UPDATE - P[X] 📊

Summary: [Issue description]
Status: [INVESTIGATING/MITIGATING/RESOLVED]
Progress: [What has been discovered/attempted]

Current Actions:
- [Ongoing work]

Next Update: [Time]
```

### Resolution Notice
```
✅ INCIDENT RESOLVED - P[X] ✅

Summary: [Brief description]
Resolution: [What fixed the issue]
Duration: [Total incident time]
Impact: [Final scope assessment]

Root Cause: [Brief explanation]
Follow-up Actions: [Preventive measures]

Post-mortem: [Date/time if applicable]
```

---

## Monitoring and Alerting

### Critical Alerts
- API error rate >1% sustained for 5 minutes
- Response time p95 >1s sustained for 5 minutes
- Database connection failures
- OpenAI API quota exhaustion
- Stripe webhook failures >10% in 15 minutes

### Warning Alerts
- API error rate >0.5% sustained for 15 minutes
- Response time p95 >500ms sustained for 15 minutes
- Credit consumption anomalies (>5x baseline)
- Agent Bridge communication failures

### Dashboard URLs
- **Application Health**: [INSERT MONITORING DASHBOARD URL]
- **Database Metrics**: [INSERT NEON DASHBOARD URL]
- **Payment Processing**: [INSERT STRIPE DASHBOARD URL]
- **Error Tracking**: [INSERT ERROR TRACKING URL]

---

## Rollback Procedures

### Application Rollback
```bash
# Revert to previous deployment
# This is platform-specific to Replit Deployments
# Follow Replit's rollback procedures

# Verify rollback success
curl -f https://your-domain.com/health
```

### Database Rollback
```bash
# For schema changes, manual intervention required
# No automated database rollbacks to prevent data loss
# Contact database administrator for complex rollbacks
```

### Configuration Rollback
```bash
# Revert environment variables in Replit Secrets
# Restart application to pick up changes
# Verify configuration with health checks
```

---

## Emergency Contacts

### Primary On-Call
- **Name**: [INSERT NAME]
- **Phone**: [INSERT PHONE]
- **Email**: [INSERT EMAIL]
- **Slack**: [INSERT HANDLE]

### Secondary On-Call
- **Name**: [INSERT NAME]
- **Phone**: [INSERT PHONE]
- **Email**: [INSERT EMAIL]
- **Slack**: [INSERT HANDLE]

### Escalation Contacts
- **Product Owner**: [INSERT CONTACT]
- **Technical Lead**: [INSERT CONTACT]
- **Executive Sponsor**: [INSERT CONTACT]

### Vendor Contacts
- **Replit Support**: support@replit.com
- **Neon Support**: [INSERT SUPPORT CONTACT]
- **Stripe Support**: [INSERT SUPPORT CONTACT]
- **OpenAI Support**: [INSERT SUPPORT CONTACT]

---

## Recovery Time Objectives

### P0 Incidents
- **Detection**: <5 minutes (automated alerts)
- **Response**: <15 minutes (team notification)
- **Mitigation**: <60 minutes (service restoration)
- **Resolution**: <4 hours (root cause fix)

### P1 Incidents
- **Detection**: <15 minutes
- **Response**: <1 hour
- **Mitigation**: <4 hours
- **Resolution**: <24 hours

### P2 Incidents
- **Detection**: <1 hour
- **Response**: <4 hours
- **Resolution**: <72 hours

---

*This runbook should be reviewed and updated quarterly, or after any significant incident. Last updated: [INSERT DATE]*