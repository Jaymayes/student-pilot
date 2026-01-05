# PR: A8 - Demo Mode Revenue Visualization (Test-Mode Aware)

**Priority:** P0 (Perception)
**Owner:** A8 Team (auto_com_center)
**Risk:** Low (display-only change)
**Rollback:** Disable Demo Mode toggle

---

## Problem Statement

A8 Finance dashboard only shows STRIPE_MODE=live transactions, causing:
- Empty revenue tiles during development/testing
- CEO perception of "no revenue flowing"
- Difficulty validating payment integration before go-live

---

## Proposed Changes

### 1. Demo Mode Toggle (UI)

```jsx
// components/DashboardHeader.jsx
function DashboardHeader() {
  const [demoMode, setDemoMode] = useState(false);
  
  return (
    <header className="dashboard-header">
      <h1>Command Center</h1>
      <div className="demo-toggle">
        <Switch
          checked={demoMode}
          onChange={setDemoMode}
          label="Demo Mode"
        />
        {demoMode && (
          <Badge variant="warning">
            ⚠️ Showing Test Data
          </Badge>
        )}
      </div>
    </header>
  );
}
```

### 2. Query Filter Update

```javascript
// services/financeService.js
async function getRevenueSummary(options = {}) {
  const { includeDemoData = false } = options;
  
  let whereClause = 'WHERE 1=1';
  
  if (includeDemoData) {
    // Include both live and test transactions
    whereClause += ` AND (stripe_mode IN ('live', 'test'))`;
  } else {
    // Production default: live only
    whereClause += ` AND stripe_mode = 'live'`;
  }
  
  const result = await db.query(`
    SELECT 
      SUM(amount_cents) as total_revenue,
      COUNT(*) as transaction_count,
      stripe_mode
    FROM payments
    ${whereClause}
    GROUP BY stripe_mode
  `);
  
  return result;
}
```

### 3. Visual Differentiation

```jsx
// components/RevenueCard.jsx
function RevenueCard({ data, isDemoMode }) {
  return (
    <Card className={isDemoMode ? 'demo-mode-card' : ''}>
      {isDemoMode && (
        <div className="demo-overlay">
          <span className="demo-badge">TEST DATA</span>
        </div>
      )}
      <CardHeader>
        <CardTitle>Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="revenue-amount">
          ${(data.total_revenue / 100).toLocaleString()}
        </div>
        {isDemoMode && data.live_revenue && (
          <div className="live-revenue-note">
            Live Revenue: ${(data.live_revenue / 100).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4. CSS for Demo Mode

```css
/* styles/demo-mode.css */
.demo-mode-card {
  border: 2px dashed #f59e0b;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(245, 158, 11, 0.05) 10px,
    rgba(245, 158, 11, 0.05) 20px
  );
}

.demo-overlay {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4px 8px;
}

.demo-badge {
  background: #f59e0b;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
}
```

---

## Schema/Tag Updates

Add to telemetry events:

```json
{
  "event_type": "PaymentSuccess",
  "payload": {
    "amount_cents": 9999,
    "currency": "USD",
    "stripe_mode": "test",  // NEW: Include mode in all payment events
    "stripe_customer_id": "cus_test_xxx"
  }
}
```

---

## Rollback Plan

1. Remove Demo Mode toggle from UI
2. Finance queries default to live-only
3. No data changes required

---

## Success Criteria

- [ ] Demo Mode toggle visible in dashboard header
- [ ] Test transactions shown with clear "TEST DATA" labeling
- [ ] Live view remains unchanged in production
- [ ] Toggle state persists across page refreshes
- [ ] CFO can distinguish test vs live revenue at a glance
