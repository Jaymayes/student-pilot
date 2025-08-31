# Disaster Recovery Runbook
## ScholarLink Production System

### Executive Summary
This runbook provides comprehensive disaster recovery procedures for the ScholarLink scholarship management platform, ensuring business continuity and rapid recovery from various failure scenarios.

### System Architecture Overview
- **Application**: Node.js/Express backend, React frontend
- **Database**: PostgreSQL (Neon serverless with automatic scaling)
- **File Storage**: Google Cloud Storage via Replit Object Storage
- **Deployment**: Replit production deployment with autoscaling
- **Authentication**: Replit OIDC with PostgreSQL session storage

### Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO)
- **Database**: RTO: 15 minutes, RPO: 1 hour (point-in-time recovery)
- **Application**: RTO: 10 minutes, RPO: 0 (stateless deployment)
- **File Storage**: RTO: 5 minutes, RPO: 0 (multi-region redundancy)

---

## Incident Classification

### Severity Levels

**P0 - Critical (Complete Service Outage)**
- Database completely inaccessible
- Application deployment failure preventing all access
- Data corruption affecting core functionality
- Security breach with data exposure

**P1 - High (Major Feature Degradation)**
- Partial database connectivity issues
- Authentication service disruption
- Object storage access problems
- Performance degradation >50%

**P2 - Medium (Minor Feature Impact)**
- Non-critical feature failures
- Monitoring/alerting issues
- Performance degradation 20-50%

---

## Emergency Contacts & Escalation

### Incident Response Team
```
Primary On-Call: [Engineering Lead]
  Phone: [REDACTED]
  Email: [REDACTED]

Secondary: [Platform Engineer]
  Phone: [REDACTED]
  Email: [REDACTED]

Business Stakeholder: [Product Owner]
  Phone: [REDACTED]
  Email: [REDACTED]
```

### Escalation Matrix
- **0-15 min**: Primary on-call assessment
- **15-30 min**: Secondary escalation if unresolved
- **30-60 min**: Business stakeholder notification
- **60+ min**: Executive escalation

---

## Recovery Procedures

### Database Recovery

#### Scenario 1: Database Connection Issues
```bash
# 1. Check database health
curl -X GET https://your-app.replit.app/health

# 2. Verify database connectivity in Replit console
SELECT 1;

# 3. Check connection pool status
SELECT count(*) FROM pg_stat_activity;

# 4. If connection pool exhausted, restart application
# Via Replit interface: Stop -> Start deployment
```

#### Scenario 2: Data Corruption/Accidental Deletion
```bash
# 1. Immediate assessment - identify corruption scope
SELECT COUNT(*) FROM [affected_table];

# 2. Stop writes to prevent further corruption
# Scale down to single instance if necessary

# 3. Initiate point-in-time recovery via Replit Database tool
# Navigate to Database -> Restore -> Select recovery point
# Recovery point should be before corruption occurred

# 4. Validate data integrity after restore
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM student_profiles;
SELECT COUNT(*) FROM scholarships;

# 5. Resume normal operations
```

### Application Recovery

#### Scenario 1: Deployment Failure
```bash
# 1. Check deployment logs in Replit console
# Look for startup errors, dependency issues

# 2. Verify environment variables
echo $DATABASE_URL
echo $STRIPE_SECRET_KEY
echo $OPENAI_API_KEY

# 3. Rollback to last known good deployment
# Via Replit interface: View history -> Deploy previous version

# 4. If rollback fails, redeploy from main branch
git status
git pull origin main
# Push to trigger new deployment
```

#### Scenario 2: Memory/Performance Issues
```bash
# 1. Check resource utilization
# Via Replit metrics dashboard

# 2. Scale up resources if needed
# Upgrade to higher tier deployment

# 3. Identify memory leaks
# Check for unclosed database connections
# Monitor heap usage trends

# 4. Restart application to clear memory
# Via Replit interface
```

### Object Storage Recovery

#### Scenario 1: File Access Issues
```bash
# 1. Test object storage connectivity
curl -X GET https://your-app.replit.app/public-objects/test-file.txt

# 2. Check Google Cloud Storage status
# Verify bucket permissions and access

# 3. Validate environment variables
echo $PRIVATE_OBJECT_DIR
echo $PUBLIC_OBJECT_SEARCH_PATHS

# 4. Test presigned URL generation
# Via application logs or test endpoint
```

---

## Backup Verification Procedures

### Daily Backup Checks
```sql
-- Verify recent backup points exist
SELECT 
  schemaname, 
  tablename, 
  n_tup_ins, 
  n_tup_upd, 
  n_tup_del 
FROM pg_stat_user_tables 
ORDER BY n_tup_ins DESC;

-- Check data consistency
SELECT 
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM student_profiles) as profile_count,
  (SELECT COUNT(*) FROM scholarships) as scholarship_count,
  (SELECT COUNT(*) FROM applications) as application_count;
```

### Weekly Restore Testing
1. Identify test restore point (1 week old)
2. Create test database instance
3. Restore to test instance
4. Validate data integrity and application connectivity
5. Document restore time and any issues
6. Cleanup test resources

---

## Communication Templates

### Internal Incident Notification
```
Subject: [P0/P1/P2] Production Incident - [Brief Description]

Incident: [Incident ID]
Start Time: [UTC]
Impact: [User-facing impact description]
Status: Investigating/Mitigating/Resolved
ETA: [If known]

Current Actions:
- [Action 1]
- [Action 2]

Next Update: [Time]
```

### Customer Communication
```
Subject: Service Update - [Brief Description]

We're currently experiencing [brief issue description] that may affect [specific functionality]. 

What we're doing:
- Our team is actively working to resolve this issue
- [Specific mitigation steps if appropriate]

Expected Resolution: [Time estimate if available]

We'll provide another update within [timeframe].
Thank you for your patience.
```

---

## Post-Incident Procedures

### Immediate (Within 24 hours)
1. Ensure service is fully restored
2. Document timeline of events
3. Identify root cause
4. Implement immediate fixes

### Follow-up (Within 1 week)
1. Conduct post-incident review meeting
2. Create detailed incident report
3. Identify improvement opportunities
4. Update runbooks and monitoring
5. Implement preventive measures

### Post-Incident Report Template
```
Incident ID: [ID]
Date: [Date]
Duration: [Duration]
Impact: [User impact metrics]

Timeline:
- [Timestamp]: [Event]
- [Timestamp]: [Event]

Root Cause:
[Detailed analysis]

Resolution:
[What fixed it]

Lessons Learned:
- [Learning 1]
- [Learning 2]

Action Items:
- [Item 1] - [Owner] - [Due Date]
- [Item 2] - [Owner] - [Due Date]
```

---

## Monitoring and Alerting

### Critical Alerts
- Database connection failures
- Application startup failures  
- High error rates (>5% in 5 minutes)
- Response time degradation (>2s average)
- Authentication failures (>10% in 5 minutes)

### Dashboard URLs
- Application Metrics: [Replit Dashboard URL]
- Database Performance: [Database Console URL]  
- Error Tracking: [Application Logs URL]

---

## Regular Maintenance

### Weekly
- Review backup integrity
- Test database connectivity
- Validate monitoring alerts
- Check error logs

### Monthly  
- Perform full restore test
- Review and update runbook
- Validate contact information
- Security scan review

### Quarterly
- Disaster recovery drill
- Runbook effectiveness review
- Team training updates
- Recovery time testing

---

## Appendix

### Common Database Queries
```sql
-- Check database health
SELECT version(), current_database(), current_timestamp;

-- Monitor active connections
SELECT count(*) as connections, state 
FROM pg_stat_activity 
GROUP BY state;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Emergency Shell Commands
```bash
# Check application health
curl -f http://localhost:5000/health || echo "Health check failed"

# Database connection test
psql $DATABASE_URL -c "SELECT 1;" || echo "DB connection failed"

# Check disk space (if applicable)
df -h

# Check memory usage
free -m

# Check process status
ps aux | grep node
```

Last Updated: [Current Date]
Version: 1.0
Next Review: [Date + 3 months]