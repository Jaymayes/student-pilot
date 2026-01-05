# PR Draft: Issue D - A8 Demo Mode for Revenue Display
**App:** A8 (auto_com_center)
**Priority:** P0 (perception) | **Risk:** LOW | **Status:** DRAFT
**Feature Flag:** `DEMO_MODE_ENABLED=true`

---

## Executive Summary

Implement a feature-flagged "Demo Mode" toggle that safely displays simulated/test revenue data without polluting live analytics. Currently, Finance tile shows $0 because it filters `stripe_mode='live'` only, hiding valid test transactions.

---

## Before/After UX

### Before (Hidden Test Data)
```
┌─────────────────────────────────────────────────────┐
│ Finance Tile                                        │
│                                                     │
│   Total Revenue: $0.00                              │
│   Transactions: 0                                   │
│                                                     │
│   (Test transactions hidden, looks broken)          │
└─────────────────────────────────────────────────────┘
```

### After (Demo Mode Toggle)
```
┌─────────────────────────────────────────────────────┐
│ Finance Tile                    [🎭 Demo Mode ON]   │
│                                                     │
│   Total Revenue: $1,247.50 ⚠️ SIMULATED             │
│   Transactions: 23                                  │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │ ⚠️ Demo Mode Active                         │   │
│   │ Showing test + simulated data               │   │
│   │ Toggle OFF to see live production data      │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Specification

### 1. Demo Mode Toggle Component

```jsx
// client/src/components/DemoModeToggle.jsx
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

const DEMO_MODE_ENABLED = import.meta.env.VITE_DEMO_MODE_ENABLED === 'true';

export function DemoModeToggle() {
  const [demoMode, setDemoMode] = useState(false);
  
  // Store in localStorage for persistence
  useEffect(() => {
    const stored = localStorage.getItem('dashboardDemoMode');
    if (stored === 'true') setDemoMode(true);
  }, []);
  
  const handleToggle = (checked) => {
    setDemoMode(checked);
    localStorage.setItem('dashboardDemoMode', checked.toString());
    
    // Emit telemetry
    emitEvent('demo_mode_toggled', {
      enabled: checked,
      timestamp: new Date().toISOString()
    });
    
    // Invalidate queries to refetch with new filter
    queryClient.invalidateQueries({ queryKey: ['/api/finance'] });
    queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
  };
  
  if (!DEMO_MODE_ENABLED) return null;
  
  return (
    <div className="flex items-center gap-2" data-testid="demo-mode-toggle">
      <Switch
        checked={demoMode}
        onCheckedChange={handleToggle}
        data-testid="switch-demo-mode"
      />
      <span className="text-sm text-muted-foreground">Demo Mode</span>
      {demoMode && (
        <Badge variant="warning" className="demo-badge">
          <AlertTriangle className="w-3 h-3 mr-1" />
          SIMULATED DATA
        </Badge>
      )}
    </div>
  );
}
```

### 2. Dashboard Header Integration

```jsx
// client/src/components/DashboardHeader.jsx
export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Command Center</h1>
        <SystemStatusBadge />
      </div>
      <div className="flex items-center gap-4">
        <DemoModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
```

### 3. Query Filter Hook

```jsx
// client/src/hooks/useDemoMode.js
export function useDemoMode() {
  const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem('dashboardDemoMode') === 'true';
  });
  
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'dashboardDemoMode') {
        setDemoMode(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  
  return demoMode;
}

// Usage in queries
export function useFinanceData() {
  const demoMode = useDemoMode();
  
  return useQuery({
    queryKey: ['/api/finance', { demoMode }],
    queryFn: () => fetchFinanceData(demoMode)
  });
}
```

### 4. Backend Query Filter

```javascript
// server/routes/finance.js
const DEMO_MODE_ENABLED = process.env.DEMO_MODE_ENABLED === 'true';

router.get('/api/finance', requireAuth, async (req, res) => {
  const { demoMode } = req.query;
  const includeDemoData = DEMO_MODE_ENABLED && demoMode === 'true';
  
  let stripeFilter;
  let namespaceFilter;
  
  if (includeDemoData) {
    // Demo mode: show test + simulated data
    stripeFilter = "stripe_mode IN ('live', 'test')";
    namespaceFilter = "namespace IN ('production', 'simulated_audit')";
  } else {
    // Production mode: only live data
    stripeFilter = "stripe_mode = 'live'";
    namespaceFilter = "namespace = 'production'";
  }
  
  const result = await db.query(`
    SELECT 
      SUM(amount_cents) / 100.0 as total_revenue,
      COUNT(*) as transaction_count,
      SUM(CASE WHEN stripe_mode = 'test' THEN amount_cents ELSE 0 END) / 100.0 as test_revenue,
      SUM(CASE WHEN namespace = 'simulated_audit' THEN amount_cents ELSE 0 END) / 100.0 as simulated_revenue
    FROM payments 
    WHERE ${stripeFilter} 
    AND ${namespaceFilter}
    AND created_at > NOW() - INTERVAL '30 days'
  `);
  
  const data = result.rows[0];
  
  res.json({
    totalRevenue: parseFloat(data.total_revenue) || 0,
    transactionCount: parseInt(data.transaction_count) || 0,
    testRevenue: parseFloat(data.test_revenue) || 0,
    simulatedRevenue: parseFloat(data.simulated_revenue) || 0,
    demoMode: includeDemoData,
    dataLabels: includeDemoData ? {
      hasTestData: data.test_revenue > 0,
      hasSimulatedData: data.simulated_revenue > 0
    } : null
  });
});
```

### 5. Visual Differentiation

```css
/* client/src/styles/demo-mode.css */

/* Demo mode wrapper */
.demo-mode-active {
  position: relative;
}

.demo-mode-active::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px dashed #f59e0b;
  border-radius: 8px;
  pointer-events: none;
  background: repeating-linear-gradient(
    45deg,
    transparent 0 10px,
    rgba(245, 158, 11, 0.03) 10px 20px
  );
}

/* Demo badge */
.demo-badge {
  background: #f59e0b;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Demo card styling */
.demo-card {
  border: 2px dashed #f59e0b;
  background: repeating-linear-gradient(
    45deg,
    transparent 0 10px,
    rgba(245, 158, 11, 0.05) 10px 20px
  );
}

/* Simulated value label */
.simulated-value::after {
  content: ' (SIMULATED)';
  font-size: 10px;
  color: #f59e0b;
  font-weight: 600;
}
```

### 6. Finance Tile with Demo Labels

```jsx
// client/src/components/FinanceTile.jsx
export function FinanceTile() {
  const demoMode = useDemoMode();
  const { data, isLoading } = useFinanceData();
  
  if (isLoading) return <Skeleton />;
  
  return (
    <Card className={demoMode ? 'demo-card demo-mode-active' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Finance
          {demoMode && (
            <Badge variant="outline" className="demo-badge">
              DEMO DATA
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className={`text-3xl font-bold ${demoMode ? 'simulated-value' : ''}`}>
              ${data.totalRevenue.toLocaleString()}
            </p>
            {demoMode && data.dataLabels?.hasTestData && (
              <p className="text-xs text-amber-600">
                Includes ${data.testRevenue.toLocaleString()} test data
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="text-xl font-medium">{data.transactionCount}</p>
          </div>
        </div>
        
        {demoMode && (
          <Alert variant="warning" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Demo Mode Active</AlertTitle>
            <AlertDescription>
              Showing test and simulated data. Toggle OFF to see production data only.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Data Isolation Rules

| Mode | stripe_mode Filter | namespace Filter | Label |
|------|-------------------|------------------|-------|
| Production (default) | `= 'live'` | `= 'production'` | None |
| Demo Mode ON | `IN ('live', 'test')` | `IN ('production', 'simulated_audit')` | "SIMULATED" badge |

---

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Demo data shown to customers | Very Low | Medium | Clear visual badges, user toggle only |
| Analytics pollution | None | N/A | Data is labeled, not mixed |
| Confusion about real revenue | Low | Low | Large "DEMO" badges everywhere |

---

## Rollback Plan

### Instant Disable
```bash
# Backend
export DEMO_MODE_ENABLED=false
pm2 restart a8

# Frontend
# Set VITE_DEMO_MODE_ENABLED=false in .env and rebuild
```

### UI Fallback
If feature flag is off, toggle component doesn't render. Dashboard shows only live data.

---

## Test Cases

```javascript
// tests/demoMode.test.js

describe('Demo Mode', () => {
  it('toggle is visible when feature flag enabled', () => {
    process.env.DEMO_MODE_ENABLED = 'true';
    render(<DemoModeToggle />);
    expect(screen.getByTestId('switch-demo-mode')).toBeInTheDocument();
  });
  
  it('toggle is hidden when feature flag disabled', () => {
    process.env.DEMO_MODE_ENABLED = 'false';
    render(<DemoModeToggle />);
    expect(screen.queryByTestId('switch-demo-mode')).not.toBeInTheDocument();
  });
  
  it('shows test data when demo mode ON', async () => {
    localStorage.setItem('dashboardDemoMode', 'true');
    
    const response = await request(app)
      .get('/api/finance?demoMode=true');
    
    expect(response.body.demoMode).toBe(true);
    expect(response.body.dataLabels).toBeDefined();
  });
  
  it('excludes test data when demo mode OFF', async () => {
    localStorage.setItem('dashboardDemoMode', 'false');
    
    const response = await request(app)
      .get('/api/finance?demoMode=false');
    
    expect(response.body.demoMode).toBe(false);
    expect(response.body.testRevenue).toBe(0);
  });
  
  it('displays demo badge when enabled', () => {
    localStorage.setItem('dashboardDemoMode', 'true');
    render(<FinanceTile />);
    
    expect(screen.getByText('DEMO DATA')).toBeInTheDocument();
  });
  
  it('shows warning alert in demo mode', () => {
    localStorage.setItem('dashboardDemoMode', 'true');
    render(<FinanceTile />);
    
    expect(screen.getByText(/Demo Mode Active/)).toBeInTheDocument();
  });
  
  it('persists toggle state in localStorage', async () => {
    render(<DemoModeToggle />);
    
    fireEvent.click(screen.getByTestId('switch-demo-mode'));
    
    expect(localStorage.getItem('dashboardDemoMode')).toBe('true');
  });
  
  it('emits telemetry on toggle', async () => {
    const emitSpy = jest.spyOn(telemetry, 'emitEvent');
    render(<DemoModeToggle />);
    
    fireEvent.click(screen.getByTestId('switch-demo-mode'));
    
    expect(emitSpy).toHaveBeenCalledWith('demo_mode_toggled', expect.any(Object));
  });
});

// Visual regression tests
describe('Demo Mode Visual', () => {
  it('applies demo card styling', () => {
    localStorage.setItem('dashboardDemoMode', 'true');
    const { container } = render(<FinanceTile />);
    
    expect(container.querySelector('.demo-card')).toBeInTheDocument();
    expect(container.querySelector('.demo-mode-active')).toBeInTheDocument();
  });
});
```

---

## Documentation Updates

### A8 README Addition

```markdown
## Demo Mode

The Command Center supports a "Demo Mode" toggle for safely viewing test/simulated data:

### Enabling Demo Mode

1. Set environment variable: `DEMO_MODE_ENABLED=true`
2. Rebuild and deploy
3. Toggle appears in dashboard header

### What Demo Mode Shows

- Test Stripe transactions (`stripe_mode='test'`)
- Simulated audit data (`namespace='simulated_audit'`)
- Clear "SIMULATED" labels on all displayed data

### What Demo Mode Hides

When OFF (default):
- Only production data (`stripe_mode='live'`)
- Only production namespace

### Visual Indicators

- Dashed orange border around tiles
- "DEMO DATA" badge on Finance tile
- Warning alert explaining demo state
```

---

## Acceptance Criteria

- [ ] Demo mode toggle visible when feature flag enabled
- [ ] Toggle persists in localStorage
- [ ] Demo mode shows test + simulated data with labels
- [ ] Production mode (default) shows only live data
- [ ] Clear visual differentiation (badges, borders, alerts)
- [ ] No pollution of live analytics
- [ ] Telemetry emitted on toggle
- [ ] Feature flag allows instant disable
- [ ] Documentation updated for demo workflows
