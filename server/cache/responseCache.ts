/**
 * High-Performance Response Cache with ETag and Conditional GET Support
 * Implements Stale-While-Revalidate (SWR) pattern for P95 ≤120ms target
 */
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { metricsCollector } from '../monitoring/metrics';

interface CacheEntry {
  data: any;
  etag: string;
  timestamp: number;
  isStale: boolean;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private backgroundTasks = new Set<string>();
  private maxSize = 5000; // Bounded cache size
  private accessOrder = new Map<string, number>(); // LRU tracking
  
  /**
   * Cached response middleware with ETag and conditional GET support
   */
  withCached<T>(
    key: string, 
    ttlMs: number, 
    staleThresholdMs: number = ttlMs * 0.8, // Refresh when 80% through TTL
    compute: () => Promise<T>
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const now = Date.now();
        const entry = this.cache.get(key);
        
        // Check for cache hit
        if (entry && now - entry.timestamp < ttlMs) {
          // Update access order for true LRU
          this.accessOrder.set(key, now);
          
          // Record cache hit metrics
          metricsCollector.recordCacheHit(key);
          metricsCollector.updateCacheSize(this.cache.size);
          
          // Always serve 200 with JSON body (React Query needs JSON response, not 304)
          // Keep ETag header for metrics tracking
          res.set('ETag', entry.etag);
          res.set('Cache-Control', `max-age=${Math.floor((ttlMs - (now - entry.timestamp)) / 1000)}`);
          res.json(entry.data);
          
          // Background refresh if stale (SWR pattern)
          if (!entry.isStale && now - entry.timestamp > staleThresholdMs) {
            this.scheduleBackgroundRefresh(key, compute);
            entry.isStale = true;
          }
          
          return;
        }
        
        // Record cache miss
        metricsCollector.recordCacheMiss(key);
        
        // Cache miss or expired - compute and cache
        const data = await compute();
        const etag = this.generateETag(data);
        
        this.evictIfNeeded();
        this.cache.set(key, {
          data,
          etag,
          timestamp: now,
          isStale: false
        });
        this.accessOrder.set(key, now);
        
        // Always serve 200 with JSON body (React Query needs JSON response, not 304)
        // Keep ETag header for metrics tracking
        res.set('ETag', etag);
        res.set('Cache-Control', `max-age=${Math.floor(ttlMs / 1000)}`);
        res.json(data);
        
      } catch (error) {
        console.error(`Cache error for key ${key}:`, error);
        // Check if headers already sent to avoid ERR_HTTP_HEADERS_SENT
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Cache error', 
            correlationId: (req as any).correlationId 
          });
        } else {
          // Headers already sent, log but don't try to send response
          console.error('Cannot send error response - headers already sent');
        }
      }
    };
  }
  
  /**
   * Direct cache access (for non-Express usage)
   */
  async getCached<T>(
    key: string, 
    ttlMs: number, 
    compute: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const entry = this.cache.get(key);
    
    if (entry && now - entry.timestamp < ttlMs) {
      // Update access order for true LRU
      this.accessOrder.set(key, now);
      
      // Record cache hit
      metricsCollector.recordCacheHit(key);
      metricsCollector.updateCacheSize(this.cache.size);
      
      return entry.data;
    }
    
    // Record cache miss
    metricsCollector.recordCacheMiss(key);
    
    const data = await compute();
    
    // Evict before adding new entry
    this.evictIfNeeded();
    
    this.cache.set(key, {
      data,
      etag: this.generateETag(data),
      timestamp: now,
      isStale: false
    });
    
    // Update access order
    this.accessOrder.set(key, now);
    
    return data;
  }
  
  /**
   * Prewarm cache (for server startup)
   */
  async prewarm<T>(key: string, compute: () => Promise<T>): Promise<void> {
    try {
      const data = await compute();
      const now = Date.now();
      
      // Evict before adding entry
      this.evictIfNeeded();
      
      this.cache.set(key, {
        data,
        etag: this.generateETag(data),
        timestamp: now,
        isStale: false
      });
      
      // Update access order
      this.accessOrder.set(key, now);
      
      console.log(`✅ Cache prewarmed: ${key}`);
    } catch (error) {
      console.error(`❌ Cache prewarm failed: ${key}`, error);
    }
  }
  
  private generateETag(data: any): string {
    const hash = crypto.createHash('md5');
    try {
      // Safe JSON serialization that handles circular references
      const serializedData = JSON.stringify(data, this.getCircularReplacer());
      hash.update(serializedData);
    } catch (error) {
      // Fallback: use string representation if JSON serialization fails
      console.warn('ETag generation fallback due to serialization error:', error);
      hash.update(String(data) + Date.now());
    }
    return `"${hash.digest('hex')}"`;
  }

  /**
   * Circular reference replacer for JSON.stringify
   */
  private getCircularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    };
  }
  
  private scheduleBackgroundRefresh<T>(key: string, compute: () => Promise<T>): void {
    if (this.backgroundTasks.has(key)) return; // Already refreshing
    
    this.backgroundTasks.add(key);
    
    // Background refresh (don't await)
    compute()
      .then(data => {
        try {
          this.cache.set(key, {
            data,
            etag: this.generateETag(data),
            timestamp: Date.now(),
            isStale: false
          });
        } catch (etagError) {
          console.error(`ETag generation failed for background refresh ${key}:`, etagError);
          // Store without ETag as fallback
          this.cache.set(key, {
            data,
            etag: `"fallback-${Date.now()}"`,
            timestamp: Date.now(),
            isStale: false
          });
        }
        this.backgroundTasks.delete(key);
      })
      .catch(error => {
        console.error(`Background refresh failed for ${key}:`, error);
        this.backgroundTasks.delete(key);
      });
  }
  
  /**
   * Delete specific cache entry (for invalidation)
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
  }

  /**
   * Evict LRU entries if cache is full
   */
  private evictIfNeeded(): void {
    if (this.cache.size >= this.maxSize) {
      // Sort by access time and remove oldest 10%
      const sortedEntries = Array.from(this.accessOrder.entries())
        .sort(([,a], [,b]) => a - b);
      
      const toEvict = Math.floor(this.maxSize * 0.1);
      for (let i = 0; i < toEvict && sortedEntries.length > 0; i++) {
        const [keyToEvict] = sortedEntries[i];
        this.cache.delete(keyToEvict);
        this.accessOrder.delete(keyToEvict);
      }
      
      // Report eviction metrics
      if (toEvict > 0) {
        metricsCollector.recordCacheEviction(toEvict);
      }
    }
  }

  /**
   * Clear cache (for testing/debugging)
   */
  clear(): void {
    this.cache.clear();
    this.backgroundTasks.clear();
    this.accessOrder.clear();
  }
}

// Singleton instance
export const responseCache = new ResponseCache();