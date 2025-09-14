/**
 * High-Performance Response Cache with ETag and Conditional GET Support
 * Implements Stale-While-Revalidate (SWR) pattern for P95 ≤120ms target
 */
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  etag: string;
  timestamp: number;
  isStale: boolean;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private backgroundTasks = new Set<string>();
  
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
          // Handle conditional GET (If-None-Match)
          const clientETag = req.get('If-None-Match');
          if (clientETag && clientETag === entry.etag) {
            return res.status(304).end();
          }
          
          // Serve from cache immediately
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
        
        // Cache miss or expired - compute and cache
        const data = await compute();
        const etag = this.generateETag(data);
        
        this.cache.set(key, {
          data,
          etag,
          timestamp: now,
          isStale: false
        });
        
        // Handle conditional GET for fresh data
        const clientETag = req.get('If-None-Match');
        if (clientETag && clientETag === etag) {
          return res.status(304).end();
        }
        
        res.set('ETag', etag);
        res.set('Cache-Control', `max-age=${Math.floor(ttlMs / 1000)}`);
        res.json(data);
        
      } catch (error) {
        console.error(`Cache error for key ${key}:`, error);
        next(error);
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
      return entry.data;
    }
    
    const data = await compute();
    this.cache.set(key, {
      data,
      etag: this.generateETag(data),
      timestamp: now,
      isStale: false
    });
    
    return data;
  }
  
  /**
   * Prewarm cache (for server startup)
   */
  async prewarm<T>(key: string, compute: () => Promise<T>): Promise<void> {
    try {
      const data = await compute();
      this.cache.set(key, {
        data,
        etag: this.generateETag(data),
        timestamp: Date.now(),
        isStale: false
      });
      console.log(`✅ Cache prewarmed: ${key}`);
    } catch (error) {
      console.error(`❌ Cache prewarm failed: ${key}`, error);
    }
  }
  
  private generateETag(data: any): string {
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(data));
    return `"${hash.digest('hex')}"`;
  }
  
  private scheduleBackgroundRefresh<T>(key: string, compute: () => Promise<T>): void {
    if (this.backgroundTasks.has(key)) return; // Already refreshing
    
    this.backgroundTasks.add(key);
    
    // Background refresh (don't await)
    compute()
      .then(data => {
        this.cache.set(key, {
          data,
          etag: this.generateETag(data),
          timestamp: Date.now(),
          isStale: false
        });
        this.backgroundTasks.delete(key);
      })
      .catch(error => {
        console.error(`Background refresh failed for ${key}:`, error);
        this.backgroundTasks.delete(key);
      });
  }
  
  /**
   * Clear cache (for testing/debugging)
   */
  clear(): void {
    this.cache.clear();
    this.backgroundTasks.clear();
  }
}

// Singleton instance
export const responseCache = new ResponseCache();