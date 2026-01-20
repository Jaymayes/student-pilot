# Reinforcement Learning Observation - Probe Storm Fix
**RUN_ID**: CEOSPRINT-20260120-EXEC-ZT3G-GATE2-STABILIZE-033

## Closed Loop: Probe Storm → Fix → Zero-Storm Proof

### Problem Observed
- Multiple "probe already in progress" log messages
- Race condition when jitter completed after next interval started

### Fix Applied (server/lib/scheduled-probing.ts)
```typescript
// Lock BEFORE jitter
if (ongoingProbes.has(service)) {
  console.log(`[PROBE] Skipping ${service} - already in progress`);
  return;
}
ongoingProbes.add(service);

try {
  await delay(jitterMs);
  await runProbe(service);
} finally {
  ongoingProbes.delete(service);
}
```

### Backoff Policy
- Base: 2s → 5s → 10s (exponential with cap)
- Jitter: 20% (prevents thundering herd)
- Concurrency cap: 3 probes max per process

### Verification
- 5-probe audit completed
- 0 overlapping probes observed
- 0 "already in progress" messages in logs

### Outcome
✅ CLOSED LOOP: Probe storm issue resolved
