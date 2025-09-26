/**
 * Enterprise Alerting System - Production Event Handlers
 * 
 * Registers event listeners for operational alerts with throttling and deduplication.
 * Integrates with MetricsCollector to provide real-time monitoring alerts.
 */

import { metricsCollector } from './metrics';

// Enterprise alerting system - wired event handlers
const alertThrottleMap = new Map<string, number>();
const ALERT_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

function throttledAlert(alertKey: string, alertFn: () => void): void {
  const lastAlert = alertThrottleMap.get(alertKey) || 0;
  const now = Date.now();
  
  if (now - lastAlert > ALERT_THROTTLE_MS) {
    alertThrottleMap.set(alertKey, now);
    alertFn();
  }
}

// Register all operational alert handlers
metricsCollector.on('high-latency', (data) => {
  throttledAlert(`latency-${data.route}`, () => {
    console.error(`🚨 [ALERT] HIGH LATENCY: ${data.route} took ${data.duration}ms (threshold: ${data.threshold}ms)`);
    // TODO: Integrate with PagerDuty/Slack webhook
  });
});

metricsCollector.on('high-error-rate', (data) => {
  throttledAlert(`error-rate-${data.route}`, () => {
    console.error(`🚨 [ALERT] HIGH ERROR RATE: ${data.route} has ${data.errorRate.toFixed(1)}% error rate (${data.errorRequests}/${data.totalRequests})`);
    // TODO: Integrate with PagerDuty/Slack webhook
  });
});

metricsCollector.on('slow-query', (data) => {
  throttledAlert(`slow-query-${data.operation}`, () => {
    console.error(`🚨 [ALERT] SLOW QUERY: ${data.operation} took ${data.duration}ms (threshold: ${data.threshold}ms)`);
    // TODO: Integrate with PagerDuty/Slack webhook
  });
});

metricsCollector.on('expensive-ai-operation', (data) => {
  throttledAlert(`expensive-ai-${data.operation}`, () => {
    console.error(`🚨 [ALERT] EXPENSIVE AI OPERATION: ${data.operation} cost ${data.cost} credits (duration: ${data.duration}ms)`);
    // TODO: Integrate with PagerDuty/Slack webhook
  });
});

metricsCollector.on('high-memory-usage', (data) => {
  throttledAlert('high-memory', () => {
    console.error(`🚨 [ALERT] HIGH MEMORY USAGE: ${data.usage.toFixed(1)}MB (threshold: ${data.threshold}MB)`);
    // TODO: Integrate with PagerDuty/Slack webhook
  });
});

metricsCollector.on('cache-eviction', (data) => {
  if (data.count > 100) { // Only alert on significant evictions
    throttledAlert('cache-eviction', () => {
      console.warn(`⚠️  [ALERT] CACHE EVICTION: ${data.count} entries evicted due to memory pressure`);
    });
  }
});

console.log('✅ Enterprise alerting system initialized with throttled event handlers');