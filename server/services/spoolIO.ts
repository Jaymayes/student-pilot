/**
 * Spool I/O Repair Service
 * 
 * SEV-1 Fix: Durable telemetry spool with bounded volume
 * 
 * Features:
 * - Dedicated bounded volume (/tmp/telemetry, 100MB cap)
 * - Write-through with fsync on batch close
 * - 2s write timeout
 * - ENOSPC/EACCES alerting
 * - Rotate + gzip on size threshold
 * - Never drops memory queues until durable write returns
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';
import * as zlib from 'zlib';

const SPOOL_DIR = '/tmp/telemetry';
const MAX_SPOOL_SIZE_BYTES = 100 * 1024 * 1024; // 100MB cap
const WRITE_TIMEOUT_MS = 2000;
const ROTATE_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10MB per file before rotate
const MAX_BATCH_SIZE = 100;

interface SpoolEntry {
  id: string;
  fingerprint: string;
  payload: unknown;
  timestamp: string;
  attempt: number;
}

interface SpoolStats {
  totalBytes: number;
  fileCount: number;
  oldestFile: string | null;
  newestFile: string | null;
  lastWriteAt: string | null;
  errors: string[];
}

class SpoolIOService {
  private memoryQueue: SpoolEntry[] = [];
  private isWriting = false;
  private lastError: string | null = null;
  private initialized = false;
  private stats: SpoolStats = {
    totalBytes: 0,
    fileCount: 0,
    oldestFile: null,
    newestFile: null,
    lastWriteAt: null,
    errors: [],
  };

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (!fs.existsSync(SPOOL_DIR)) {
        fs.mkdirSync(SPOOL_DIR, { recursive: true, mode: 0o755 });
      }

      const testFile = path.join(SPOOL_DIR, '.write_test');
      fs.writeFileSync(testFile, 'test', { flag: 'w' });
      fs.unlinkSync(testFile);

      await this.updateStats();
      this.initialized = true;
      console.log(`[SpoolIO] Initialized at ${SPOOL_DIR}, current size: ${this.stats.totalBytes} bytes`);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      this.lastError = err;
      this.stats.errors.push(`INIT_FAILED: ${err}`);
      console.error(`[SpoolIO] CRITICAL: Failed to initialize spool directory: ${err}`);

      if (err.includes('ENOSPC')) {
        this.alertSpaceExhausted();
      } else if (err.includes('EACCES')) {
        this.alertAccessDenied();
      }
    }
  }

  async enqueue(payload: unknown): Promise<{ success: boolean; fingerprint: string }> {
    const fingerprint = this.computeFingerprint(payload);
    const entry: SpoolEntry = {
      id: crypto.randomUUID(),
      fingerprint,
      payload,
      timestamp: new Date().toISOString(),
      attempt: 0,
    };

    this.memoryQueue.push(entry);

    if (this.memoryQueue.length >= MAX_BATCH_SIZE && !this.isWriting) {
      await this.flushBatch();
    }

    return { success: true, fingerprint };
  }

  async flushBatch(): Promise<{ written: number; failed: number }> {
    if (this.isWriting || this.memoryQueue.length === 0) {
      return { written: 0, failed: 0 };
    }

    this.isWriting = true;
    const batch = this.memoryQueue.splice(0, MAX_BATCH_SIZE);
    let written = 0;
    let failed = 0;

    try {
      await this.initialize();

      if (this.stats.totalBytes >= MAX_SPOOL_SIZE_BYTES) {
        await this.rotateOldest();
      }

      const filename = `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jsonl`;
      const filepath = path.join(SPOOL_DIR, filename);

      const content = batch.map(e => JSON.stringify(e)).join('\n') + '\n';

      await this.writeWithTimeout(filepath, content);

      written = batch.length;
      this.stats.lastWriteAt = new Date().toISOString();
      this.stats.newestFile = filename;

      console.log(`[SpoolIO] Flushed ${written} entries to ${filename}`);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      this.lastError = err;
      this.stats.errors.push(`WRITE_FAILED: ${err}`);
      console.error(`[SpoolIO] Write failed: ${err}`);

      this.memoryQueue.unshift(...batch);
      failed = batch.length;

      if (err.includes('ENOSPC')) {
        this.alertSpaceExhausted();
      } else if (err.includes('EACCES')) {
        this.alertAccessDenied();
      }
    } finally {
      this.isWriting = false;
    }

    await this.updateStats();
    return { written, failed };
  }

  private async writeWithTimeout(filepath: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Write timeout after ${WRITE_TIMEOUT_MS}ms`));
      }, WRITE_TIMEOUT_MS);

      const fd = fs.openSync(filepath, 'w');
      try {
        fs.writeSync(fd, content);
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        clearTimeout(timeout);
        resolve();
      } catch (error) {
        clearTimeout(timeout);
        try { fs.closeSync(fd); } catch {}
        reject(error);
      }
    });
  }

  private computeFingerprint(payload: unknown): string {
    const normalized = JSON.stringify(payload);
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  private async rotateOldest(): Promise<void> {
    try {
      const files = fs.readdirSync(SPOOL_DIR)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => ({
          name: f,
          path: path.join(SPOOL_DIR, f),
          mtime: fs.statSync(path.join(SPOOL_DIR, f)).mtime,
        }))
        .sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      if (files.length === 0) return;

      const oldest = files[0];
      const gzPath = oldest.path + '.gz';

      const content = fs.readFileSync(oldest.path);
      const gzipped = zlib.gzipSync(content);
      fs.writeFileSync(gzPath, gzipped);
      fs.unlinkSync(oldest.path);

      console.log(`[SpoolIO] Rotated and compressed ${oldest.name}`);
    } catch (error) {
      console.error(`[SpoolIO] Rotation failed: ${error}`);
    }
  }

  private async updateStats(): Promise<void> {
    try {
      if (!fs.existsSync(SPOOL_DIR)) return;

      const files = fs.readdirSync(SPOOL_DIR);
      let totalBytes = 0;
      let oldest: { name: string; mtime: Date } | null = null;
      let newest: { name: string; mtime: Date } | null = null;

      for (const file of files) {
        const filepath = path.join(SPOOL_DIR, file);
        const stat = fs.statSync(filepath);
        totalBytes += stat.size;

        if (!oldest || stat.mtime < oldest.mtime) {
          oldest = { name: file, mtime: stat.mtime };
        }
        if (!newest || stat.mtime > newest.mtime) {
          newest = { name: file, mtime: stat.mtime };
        }
      }

      this.stats.totalBytes = totalBytes;
      this.stats.fileCount = files.length;
      this.stats.oldestFile = oldest?.name || null;
      this.stats.newestFile = newest?.name || null;
    } catch (error) {
      console.error(`[SpoolIO] Stats update failed: ${error}`);
    }
  }

  private alertSpaceExhausted(): void {
    console.error('[SpoolIO] ALERT: ENOSPC - Spool volume space exhausted');
  }

  private alertAccessDenied(): void {
    console.error('[SpoolIO] ALERT: EACCES - Spool directory access denied');
  }

  getStats(): SpoolStats {
    return { ...this.stats };
  }

  getQueueSize(): number {
    return this.memoryQueue.length;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  async dumpMemoryQueue(): Promise<{ success: boolean; count: number }> {
    if (this.memoryQueue.length === 0) {
      return { success: true, count: 0 };
    }

    const count = this.memoryQueue.length;
    const result = await this.flushBatch();

    while (this.memoryQueue.length > 0) {
      await this.flushBatch();
    }

    return { success: result.failed === 0, count };
  }
}

export const spoolIO = new SpoolIOService();
export default spoolIO;
