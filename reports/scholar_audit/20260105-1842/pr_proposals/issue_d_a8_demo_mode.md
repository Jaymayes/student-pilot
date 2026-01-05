# PR Issue D: A8 Demo Mode Revenue
**Priority:** P0 (perception) | **Risk:** LOW | **Owner:** A8 Team

## Problem

Finance tile shows $0 because dashboard filters `stripe_mode='live'` only.
Test transactions ARE persisted but hidden.

## Proposed Changes

### 1. Demo Mode Toggle
```jsx
function DashboardHeader() {
  const [demoMode, setDemoMode] = useState(false);
  return (
    <header>
      <Switch checked={demoMode} onChange={setDemoMode} />
      {demoMode && <Badge variant="warning">⚠️ Demo Mode</Badge>}
    </header>
  );
}
```

### 2. Query Filter
```javascript
async function getRevenue({ includeDemoData = false }) {
  const filter = includeDemoData 
    ? "stripe_mode IN ('live', 'test')"
    : "stripe_mode = 'live'";
  return db.query(`SELECT SUM(amount) FROM payments WHERE ${filter}`);
}
```

### 3. Visual Differentiation
```css
.demo-card {
  border: 2px dashed #f59e0b;
  background: repeating-linear-gradient(45deg, transparent 0 10px, rgba(245,158,11,0.05) 10px 20px);
}
.demo-badge { background: #f59e0b; color: white; font-size: 10px; }
```

## Acceptance Test

1. Toggle Demo Mode ON
2. Verify test transactions visible with "TEST DATA" label
3. Toggle Demo Mode OFF
4. Verify only live transactions visible
5. No pollution of live analytics

## Rollback

Remove toggle; default to live-only view.
