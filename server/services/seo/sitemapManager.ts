/**
 * SEO Sitemap Manager with Rate-Limiting Protection
 * 
 * Implements:
 * - Sitemap chunking (≤10k URLs per sitemap, ≤50k per index)
 * - Exponential backoff with jitter
 * - Rotating submission windows
 * - Rate-limit detection and recovery
 */

interface SitemapConfig {
  maxUrlsPerSitemap: number;
  maxSitemapsPerIndex: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  jitterFactor: number;
  submissionWindowHours: number;
}

interface SubmissionState {
  lastSubmission: number;
  consecutiveFailures: number;
  backoffMs: number;
  isRateLimited: boolean;
  rateLimitExpiresAt: number | null;
}

const DEFAULT_CONFIG: SitemapConfig = {
  maxUrlsPerSitemap: 10000,
  maxSitemapsPerIndex: 5,  // 50k total
  baseBackoffMs: 1000,
  maxBackoffMs: 3600000,   // 1 hour max
  jitterFactor: 0.3,
  submissionWindowHours: 4
};

class SitemapManager {
  private config: SitemapConfig;
  private state: SubmissionState;
  private submissionQueue: string[] = [];

  constructor(config: Partial<SitemapConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      lastSubmission: 0,
      consecutiveFailures: 0,
      backoffMs: this.config.baseBackoffMs,
      isRateLimited: false,
      rateLimitExpiresAt: null
    };
  }

  /**
   * Chunk URLs into multiple sitemaps
   */
  chunkUrls(urls: string[]): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < urls.length; i += this.config.maxUrlsPerSitemap) {
      chunks.push(urls.slice(i, i + this.config.maxUrlsPerSitemap));
    }
    return chunks.slice(0, this.config.maxSitemapsPerIndex);
  }

  /**
   * Calculate backoff with jitter
   */
  private calculateBackoff(): number {
    const jitter = 1 + (Math.random() - 0.5) * 2 * this.config.jitterFactor;
    const backoff = Math.min(
      this.state.backoffMs * jitter,
      this.config.maxBackoffMs
    );
    return Math.round(backoff);
  }

  /**
   * Check if submission is allowed
   */
  canSubmit(): boolean {
    if (this.state.isRateLimited) {
      if (this.state.rateLimitExpiresAt && Date.now() > this.state.rateLimitExpiresAt) {
        this.state.isRateLimited = false;
        this.state.rateLimitExpiresAt = null;
        this.state.consecutiveFailures = 0;
        this.state.backoffMs = this.config.baseBackoffMs;
      } else {
        return false;
      }
    }

    const timeSinceLastSubmission = Date.now() - this.state.lastSubmission;
    return timeSinceLastSubmission >= this.state.backoffMs;
  }

  /**
   * Record successful submission
   */
  recordSuccess(): void {
    this.state.lastSubmission = Date.now();
    this.state.consecutiveFailures = 0;
    this.state.backoffMs = this.config.baseBackoffMs;
    this.state.isRateLimited = false;
  }

  /**
   * Record failed submission with backoff escalation
   */
  recordFailure(isRateLimit: boolean = false): void {
    this.state.consecutiveFailures++;
    this.state.backoffMs = Math.min(
      this.state.backoffMs * 2,
      this.config.maxBackoffMs
    );

    if (isRateLimit) {
      this.state.isRateLimited = true;
      // Rate limit expires after rotating window
      this.state.rateLimitExpiresAt = Date.now() + 
        (this.config.submissionWindowHours * 3600000);
    }
  }

  /**
   * Get current state for reporting
   */
  getState(): SubmissionState & { nextSubmissionAt: number } {
    return {
      ...this.state,
      nextSubmissionAt: this.state.lastSubmission + this.calculateBackoff()
    };
  }

  /**
   * Generate sitemap XML for a chunk
   */
  generateSitemapXml(urls: string[], baseUrl: string): string {
    const urlEntries = urls.map(url => `
  <url>
    <loc>${baseUrl}${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
  }

  /**
   * Generate sitemap index for multiple sitemaps
   */
  generateSitemapIndex(sitemapUrls: string[]): string {
    const entries = sitemapUrls.map(url => `
  <sitemap>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
  }
}

export const sitemapManager = new SitemapManager();
export { SitemapManager, SitemapConfig, SubmissionState };
