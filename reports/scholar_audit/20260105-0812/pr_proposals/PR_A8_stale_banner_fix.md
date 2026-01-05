# PR: A8 - Incident Auto-Clear + TTL + Admin Clear

**Priority:** P2
**Owner:** A8 Team (auto_com_center)
**Risk:** Low
**Rollback:** Disable auto-clear, manual banner management

---

## Problem Statement

A8 incident banners persist even after services recover, causing:
- False "A1 DB unreachable" alerts
- False "A3 revenue_blocker" alerts
- Operator confusion and alert fatigue
- CEO perception of "system not working"

**Evidence:**
```json
{
  "lastHeartbeat": "2025-11-29T19:44:18.338Z",
  "systemLag": 3159257688,
  "status": "stale"
}
```

Heartbeat is 36+ days old despite events being persisted successfully.

---

## Root Cause

1. Heartbeat tracking reads from stale cache
2. No TTL on incident banners
3. No reconciliation job to clear old incidents
4. No admin action to manually clear

---

## Proposed Changes

### 1. TTL on Incident Keys

```javascript
// services/incidentService.js
const INCIDENT_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function createIncident(incident) {
  const key = `incident:${incident.app}:${incident.type}`;
  await redis.setex(key, INCIDENT_TTL_MS / 1000, JSON.stringify({
    ...incident,
    createdAt: Date.now(),
    expiresAt: Date.now() + INCIDENT_TTL_MS
  }));
}
```

### 2. On-Green Reconciliation Job

```javascript
// jobs/reconcileIncidents.js
async function reconcileIncidents() {
  const apps = await getRegisteredApps();
  
  for (const app of apps) {
    const health = await checkHealth(app.healthEndpoint);
    if (health.status === 200) {
      // Clear any incidents for this app
      const pattern = `incident:${app.id}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`Cleared ${keys.length} stale incidents for ${app.id}`);
      }
    }
  }
}

// Run every 5 minutes
setInterval(reconcileIncidents, 5 * 60 * 1000);
```

### 3. Heartbeat Tracking Fix

```javascript
// services/heartbeatService.js
async function updateHeartbeat(appId) {
  const now = Date.now();
  
  // Write to BOTH cache and database
  await redis.set(`heartbeat:${appId}`, now);
  await db.execute(
    'UPDATE app_registry SET last_heartbeat = $1 WHERE app_id = $2',
    [new Date(now), appId]
  );
  
  // Update system status cache
  await redis.set('system:lastHeartbeat', now);
}
```

### 4. Admin Clear Action

```javascript
// routes/admin.js
router.post('/api/admin/clear-incidents', auth, adminOnly, async (req, res) => {
  const pattern = 'incident:*';
  const keys = await redis.keys(pattern);
  
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  
  await auditLog('INCIDENTS_CLEARED', { count: keys.length, by: req.user.id });
  res.json({ cleared: keys.length, timestamp: new Date().toISOString() });
});
```

---

## Unit/Integration Tests

```javascript
describe('Incident Auto-Clear', () => {
  it('should clear incident after TTL expires', async () => {
    await createIncident({ app: 'A1', type: 'db_unreachable' });
    await sleep(INCIDENT_TTL_MS + 1000);
    const incident = await getIncident('A1', 'db_unreachable');
    expect(incident).toBeNull();
  });

  it('should clear incident when app returns healthy', async () => {
    await createIncident({ app: 'A2', type: 'down' });
    mockHealthCheck('A2', 200);
    await reconcileIncidents();
    const incidents = await getIncidentsForApp('A2');
    expect(incidents).toHaveLength(0);
  });

  it('should allow admin to clear all incidents', async () => {
    await createIncident({ app: 'A1', type: 'test1' });
    await createIncident({ app: 'A2', type: 'test2' });
    const res = await adminClient.post('/api/admin/clear-incidents');
    expect(res.body.cleared).toBe(2);
  });
});
```

---

## Rollback Plan

1. Set `AUTO_CLEAR_INCIDENTS=false` environment variable
2. Reconciliation job checks flag before running
3. Incidents return to manual-only management
4. No data loss (incidents just persist longer)

---

## Success Criteria

- [ ] Incidents auto-clear after 10 minutes of green health
- [ ] Reconciliation job runs every 5 minutes
- [ ] Admin can manually clear all incidents
- [ ] Heartbeat tracking updates in real-time
- [ ] No false positive banners after app recovery
