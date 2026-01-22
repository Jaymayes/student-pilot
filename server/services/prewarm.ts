/**
 * Pre-warm Service
 * 
 * Keeps instances warm by periodically hitting endpoints
 * to eliminate cold-start latency spikes
 */

import { PREWARM_CONFIG } from './healthConfig';

class PrewarmService {
  private intervalId: NodeJS.Timeout | null = null;
  private lastPrewarmResults: Map<string, { latencyMs: number; timestamp: number }> = new Map();

  start(): void {
    if (!PREWARM_CONFIG.enabled || this.intervalId) return;

    console.log('[Prewarm] Starting pre-warm service');
    
    // Initial prewarm
    this.prewarm();
    
    // Schedule recurring prewarms
    this.intervalId = setInterval(() => {
      this.prewarm();
    }, PREWARM_CONFIG.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Prewarm] Stopped pre-warm service');
    }
  }

  private async prewarm(): Promise<void> {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';

    for (const endpoint of PREWARM_CONFIG.endpoints) {
      const start = Date.now();
      try {
        const response = await fetch(`${baseUrl}${endpoint}?_prewarm=1`, {
          method: 'GET',
          headers: { 'X-Prewarm': 'true' }
        });
        const latencyMs = Date.now() - start;
        
        this.lastPrewarmResults.set(endpoint, {
          latencyMs,
          timestamp: Date.now()
        });
        
        console.log(`[Prewarm] ${endpoint}: ${latencyMs}ms (${response.status})`);
      } catch (error) {
        console.log(`[Prewarm] ${endpoint}: failed`);
      }
    }
  }

  getResults(): Map<string, { latencyMs: number; timestamp: number }> {
    return this.lastPrewarmResults;
  }
}

export const prewarmService = new PrewarmService();
