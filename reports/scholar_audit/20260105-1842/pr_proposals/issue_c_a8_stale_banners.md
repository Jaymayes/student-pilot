# PR Issue C: A8 Stale Banner Auto-Clear
**Priority:** P2 | **Risk:** LOW | **Owner:** A8 Team

## Canonical Evidence

```json
{
  "lastHeartbeat": "2025-11-29T19:44:18.338Z",
  "systemLag": 3193305426,
  "status": "stale"
}
```

Heartbeat 37 days old despite events persisting with `accepted:true, persisted:true`.

## Proposed Changes

### 1. TTL on Incident Keys (10 min)
```javascript
await redis.setex(`incident:${app}`, 600, JSON.stringify(incident));
```

### 2. On-Green Reconciliation (every 5 min)
```javascript
cron.schedule('*/5 * * * *', async () => {
  for (const app of await getApps()) {
    if ((await checkHealth(app)).status === 200) {
      await redis.del(`incident:${app}:*`);
    }
  }
});
```

### 3. Heartbeat Fix
```javascript
async function updateHeartbeat(appId) {
  const now = Date.now();
  await redis.set(`heartbeat:${appId}`, now);
  await redis.set('system:lastHeartbeat', now);  // Update global
  await db.query('UPDATE registry SET last_heartbeat=$1 WHERE id=$2', [now, appId]);
}
```

### 4. Admin Clear Button
```javascript
router.post('/api/admin/clear-incidents', auth, async (req, res) => {
  const keys = await redis.keys('incident:*');
  await redis.del(...keys);
  res.json({ cleared: keys.length });
});
```

## Tests

```javascript
it('clears incident after TTL', async () => {
  await createIncident('A1', 'test');
  await sleep(601000);
  expect(await getIncident('A1')).toBeNull();
});
```

## Rollback

`export AUTO_CLEAR_INCIDENTS=false`
