# PR Draft: Issue C - A8 Stale Banner Auto-Clear
**App:** A8 (auto_com_center)
**Priority:** P2 | **Risk:** LOW | **Status:** DRAFT
**Feature Flag:** `AUTO_CLEAR_INCIDENTS=true`

---

## Executive Summary

Implement automatic incident banner clearing when health recovers, with TTL-based expiration and admin manual clear capability. Current state shows 37-day stale heartbeat despite healthy apps.

---

## Before/After UX

### Before (Stale Banners)
```
┌─────────────────────────────────────────────────────┐
│ 🔴 INCIDENT: A1 Auth Service Down (37 days ago)    │
│ 🔴 INCIDENT: A2 API Degraded (2 weeks ago)         │
│ 🟢 All Systems Operational                         │
└─────────────────────────────────────────────────────┘
   ↑ Contradictory - shows incidents AND operational
```

### After (Auto-Clear)
```
┌─────────────────────────────────────────────────────┐
│ 🟢 All Systems Operational                         │
│    Last checked: 2 minutes ago                     │
└─────────────────────────────────────────────────────┘
   ↑ Clean state - old incidents auto-cleared
```

---

## Implementation Specification

### 1. Incident TTL (10 minutes)

```javascript
// server/services/incidents.js
const INCIDENT_TTL_SECONDS = 600; // 10 minutes

async function createIncident(appId, type, message) {
  const incident = {
    id: `inc_${Date.now()}`,
    appId,
    type,
    message,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + INCIDENT_TTL_SECONDS * 1000).toISOString()
  };
  
  // Store with TTL in Redis
  await redis.setex(
    `incident:${appId}:${incident.id}`,
    INCIDENT_TTL_SECONDS,
    JSON.stringify(incident)
  );
  
  // Also persist to DB for history
  await db.query(
    'INSERT INTO incidents (id, app_id, type, message, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [incident.id, appId, type, message, incident.createdAt, incident.expiresAt]
  );
  
  return incident;
}

async function getActiveIncidents() {
  // Only return non-expired incidents from Redis
  const keys = await redis.keys('incident:*');
  const incidents = [];
  
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      incidents.push(JSON.parse(data));
    }
  }
  
  return incidents;
}
```

### 2. On-Green Reconciliation (every 5 minutes)

```javascript
// server/cron/healthReconciliation.js
const cron = require('node-cron');

const AUTO_CLEAR_INCIDENTS = process.env.AUTO_CLEAR_INCIDENTS === 'true';

async function reconcileHealth() {
  if (!AUTO_CLEAR_INCIDENTS) {
    console.log('[Reconciliation] Feature flag disabled, skipping');
    return;
  }
  
  const apps = await getRegisteredApps();
  
  for (const app of apps) {
    try {
      const healthResponse = await fetch(`${app.healthUrl}/health`, { timeout: 5000 });
      
      if (healthResponse.status === 200) {
        // App is healthy - clear any stale incidents
        const clearedCount = await clearIncidentsForApp(app.id);
        
        if (clearedCount > 0) {
          console.log(`[Reconciliation] Cleared ${clearedCount} stale incidents for ${app.id}`);
          
          // Update heartbeat
          await updateHeartbeat(app.id);
          
          // Emit telemetry
          emitEvent('incident_auto_cleared', {
            appId: app.id,
            clearedCount,
            reason: 'health_recovered'
          });
        }
      }
    } catch (error) {
      console.log(`[Reconciliation] Health check failed for ${app.id}: ${error.message}`);
      // Don't clear incidents if we can't verify health
    }
  }
}

async function clearIncidentsForApp(appId) {
  const pattern = `incident:${appId}:*`;
  const keys = await redis.keys(pattern);
  
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  
  // Mark as resolved in DB (keep history)
  await db.query(
    'UPDATE incidents SET resolved_at = NOW(), resolution = $1 WHERE app_id = $2 AND resolved_at IS NULL',
    ['auto_cleared_on_recovery', appId]
  );
  
  return keys.length;
}

// Run every 5 minutes
cron.schedule('*/5 * * * *', reconcileHealth);
```

### 3. Heartbeat Fix

```javascript
// server/services/heartbeat.js
async function updateHeartbeat(appId) {
  const now = Date.now();
  const isoNow = new Date(now).toISOString();
  
  // Update Redis
  await redis.set(`heartbeat:${appId}`, now);
  
  // Update global system heartbeat
  await redis.set('system:lastHeartbeat', now);
  
  // Update database
  await db.query(
    'UPDATE app_registry SET last_heartbeat = $1 WHERE id = $2',
    [isoNow, appId]
  );
  
  // Update system status cache
  await redis.set('system:status', JSON.stringify({
    lastHeartbeat: isoNow,
    systemLag: 0,
    status: 'healthy'
  }));
}

// Call on every health check success
async function recordHealthSuccess(appId) {
  await updateHeartbeat(appId);
  await clearIncidentsForApp(appId);
}
```

### 4. Admin Clear Endpoint

```javascript
// server/routes/admin.js
router.post('/api/admin/clear-incidents', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { appId } = req.body;
    
    let clearedCount;
    if (appId) {
      // Clear for specific app
      clearedCount = await clearIncidentsForApp(appId);
    } else {
      // Clear all incidents
      const keys = await redis.keys('incident:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      clearedCount = keys.length;
      
      // Mark all as admin-cleared in DB
      await db.query(
        'UPDATE incidents SET resolved_at = NOW(), resolution = $1 WHERE resolved_at IS NULL',
        ['admin_cleared']
      );
    }
    
    // Emit audit event
    emitEvent('admin_action', {
      action: 'clear_incidents',
      appId: appId || 'all',
      clearedCount,
      adminId: req.user.id
    });
    
    res.json({
      success: true,
      cleared: clearedCount,
      message: `Cleared ${clearedCount} incident(s)`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 5. UI Component

```jsx
// client/src/components/AdminPanel.jsx
function IncidentClearButton() {
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();
  
  const handleClear = async () => {
    setClearing(true);
    try {
      const response = await fetch('/api/admin/clear-incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      
      toast({
        title: 'Incidents Cleared',
        description: `Cleared ${result.cleared} incident(s)`
      });
      
      // Refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/system/status'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setClearing(false);
    }
  };
  
  return (
    <Button
      variant="outline"
      onClick={handleClear}
      disabled={clearing}
      data-testid="button-clear-incidents"
    >
      {clearing ? 'Clearing...' : 'Clear All Incidents'}
    </Button>
  );
}
```

---

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Real incident cleared prematurely | Low | Medium | 10-min TTL gives time to investigate |
| Health check false positive | Very Low | Low | Require 200 status, not just response |
| Admin abuse | Very Low | Low | Audit logging, require admin role |

---

## Rollback Plan

### Instant Rollback
```bash
# Disable auto-clear
export AUTO_CLEAR_INCIDENTS=false
pm2 restart a8
```

### Remove Cron Job
```javascript
// Comment out or remove cron schedule
// cron.schedule('*/5 * * * *', reconcileHealth);
```

---

## Test Cases

```javascript
// tests/incidents.test.js

describe('Incident Auto-Clear', () => {
  it('clears incident after TTL expires', async () => {
    await createIncident('A1', 'test', 'Test incident');
    expect(await getActiveIncidents()).toHaveLength(1);
    
    // Fast-forward 11 minutes
    await advanceTime(11 * 60 * 1000);
    
    expect(await getActiveIncidents()).toHaveLength(0);
  });
  
  it('clears incident when app becomes healthy', async () => {
    await createIncident('A1', 'down', 'Service down');
    
    // Mock healthy response
    mockHealthCheck('A1', 200);
    
    // Run reconciliation
    await reconcileHealth();
    
    expect(await getActiveIncidents()).toHaveLength(0);
  });
  
  it('does not clear if health check fails', async () => {
    await createIncident('A1', 'down', 'Service down');
    
    // Mock failed health check
    mockHealthCheck('A1', 503);
    
    await reconcileHealth();
    
    expect(await getActiveIncidents()).toHaveLength(1);
  });
  
  it('admin can manually clear incidents', async () => {
    await createIncident('A1', 'test', 'Test 1');
    await createIncident('A2', 'test', 'Test 2');
    
    const response = await adminRequest.post('/api/admin/clear-incidents');
    
    expect(response.body.cleared).toBe(2);
    expect(await getActiveIncidents()).toHaveLength(0);
  });
});

// UI acceptance test
describe('Incident Banner UI', () => {
  it('shows banner when incident active', async () => {
    await createIncident('A1', 'down', 'A1 is down');
    
    render(<Dashboard />);
    expect(screen.getByText(/A1 is down/)).toBeInTheDocument();
  });
  
  it('removes banner when incident cleared', async () => {
    await createIncident('A1', 'down', 'A1 is down');
    render(<Dashboard />);
    
    expect(screen.getByText(/A1 is down/)).toBeInTheDocument();
    
    // Simulate recovery
    await clearIncidentsForApp('A1');
    await waitFor(() => {
      expect(screen.queryByText(/A1 is down/)).not.toBeInTheDocument();
    });
  });
});
```

---

## Acceptance Criteria

- [ ] Incidents auto-expire after 10 minutes (TTL)
- [ ] Incidents clear when health recovers (reconciliation)
- [ ] Admin can manually clear incidents
- [ ] Heartbeat updates on health success
- [ ] Feature flag allows instant disable
- [ ] Audit log for admin clears
- [ ] UI shows clean state after clear
