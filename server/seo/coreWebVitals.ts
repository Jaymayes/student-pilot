/**
 * Core Web Vitals monitoring and optimization for SEO
 * Enforces performance budgets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1
 */

interface CoreWebVitalThresholds {
  lcp: { good: number; needsImprovement: number }; // Largest Contentful Paint
  inp: { good: number; needsImprovement: number }; // Interaction to Next Paint
  cls: { good: number; needsImprovement: number }; // Cumulative Layout Shift
  fcp: { good: number; needsImprovement: number }; // First Contentful Paint
  ttfb: { good: number; needsImprovement: number }; // Time to First Byte
}

interface PagePerformanceMetrics {
  url: string;
  lcp: number;
  inp: number;
  cls: number;
  fcp: number;
  ttfb: number;
  overallScore: 'good' | 'needs-improvement' | 'poor';
  timestamp: string;
}

interface PerformanceBudget {
  pageType: 'scholarship-detail' | 'category' | 'state' | 'main';
  maxLCP: number;
  maxINP: number;
  maxCLS: number;
  maxFCP: number;
  maxTTFB: number;
}

export class CoreWebVitalsService {
  private thresholds: CoreWebVitalThresholds = {
    lcp: { good: 2500, needsImprovement: 4000 }, // milliseconds
    inp: { good: 200, needsImprovement: 500 },   // milliseconds
    cls: { good: 0.1, needsImprovement: 0.25 },  // unitless
    fcp: { good: 1800, needsImprovement: 3000 }, // milliseconds
    ttfb: { good: 600, needsImprovement: 1000 }  // milliseconds
  };

  private performanceBudgets: PerformanceBudget[] = [
    {
      pageType: 'scholarship-detail',
      maxLCP: 2200, // Stricter for detail pages
      maxINP: 150,
      maxCLS: 0.08,
      maxFCP: 1600,
      maxTTFB: 500
    },
    {
      pageType: 'category',
      maxLCP: 2500,
      maxINP: 200,
      maxCLS: 0.1,
      maxFCP: 1800,
      maxTTFB: 600
    },
    {
      pageType: 'state',
      maxLCP: 2500,
      maxINP: 200,
      maxCLS: 0.1,
      maxFCP: 1800,
      maxTTFB: 600
    },
    {
      pageType: 'main',
      maxLCP: 2000, // Strictest for main pages
      maxINP: 100,
      maxCLS: 0.05,
      maxFCP: 1400,
      maxTTFB: 400
    }
  ];

  /**
   * Evaluate Core Web Vitals against thresholds
   */
  evaluateMetrics(metrics: Omit<PagePerformanceMetrics, 'overallScore' | 'timestamp'>): PagePerformanceMetrics {
    const scores = {
      lcp: this.getMetricScore(metrics.lcp, this.thresholds.lcp),
      inp: this.getMetricScore(metrics.inp, this.thresholds.inp),
      cls: this.getMetricScore(metrics.cls, this.thresholds.cls),
      fcp: this.getMetricScore(metrics.fcp, this.thresholds.fcp),
      ttfb: this.getMetricScore(metrics.ttfb, this.thresholds.ttfb)
    };

    // Determine overall score (all must be good for overall good)
    const allGood = Object.values(scores).every(score => score === 'good');
    const anyPoor = Object.values(scores).some(score => score === 'poor');
    
    const overallScore = allGood ? 'good' : anyPoor ? 'poor' : 'needs-improvement';

    return {
      ...metrics,
      overallScore: overallScore as 'good' | 'needs-improvement' | 'poor',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if page meets performance budget
   */
  checkPerformanceBudget(pageType: string, metrics: PagePerformanceMetrics): {
    passesAll: boolean;
    violations: string[];
    budget: PerformanceBudget;
  } {
    const budget = this.performanceBudgets.find(b => b.pageType === pageType) || this.performanceBudgets[0];
    const violations: string[] = [];

    if (metrics.lcp > budget.maxLCP) {
      violations.push(`LCP ${metrics.lcp}ms exceeds budget ${budget.maxLCP}ms`);
    }
    if (metrics.inp > budget.maxINP) {
      violations.push(`INP ${metrics.inp}ms exceeds budget ${budget.maxINP}ms`);
    }
    if (metrics.cls > budget.maxCLS) {
      violations.push(`CLS ${metrics.cls} exceeds budget ${budget.maxCLS}`);
    }
    if (metrics.fcp > budget.maxFCP) {
      violations.push(`FCP ${metrics.fcp}ms exceeds budget ${budget.maxFCP}ms`);
    }
    if (metrics.ttfb > budget.maxTTFB) {
      violations.push(`TTFB ${metrics.ttfb}ms exceeds budget ${budget.maxTTFB}ms`);
    }

    return {
      passesAll: violations.length === 0,
      violations,
      budget
    };
  }

  /**
   * Generate performance optimization recommendations
   */
  generateOptimizationRecommendations(metrics: PagePerformanceMetrics, pageType: string): string[] {
    const recommendations: string[] = [];
    const budget = this.performanceBudgets.find(b => b.pageType === pageType);

    if (metrics.lcp > (budget?.maxLCP || this.thresholds.lcp.good)) {
      recommendations.push(
        'LCP optimization: Implement image preloading, reduce server response times, eliminate render-blocking resources'
      );
    }

    if (metrics.inp > (budget?.maxINP || this.thresholds.inp.good)) {
      recommendations.push(
        'INP optimization: Debounce input handlers, break up long tasks, optimize JavaScript execution'
      );
    }

    if (metrics.cls > (budget?.maxCLS || this.thresholds.cls.good)) {
      recommendations.push(
        'CLS optimization: Set explicit dimensions for images, avoid inserting content above existing content, use CSS transform for animations'
      );
    }

    if (metrics.fcp > (budget?.maxFCP || this.thresholds.fcp.good)) {
      recommendations.push(
        'FCP optimization: Minimize critical resource loading, inline critical CSS, optimize font loading'
      );
    }

    if (metrics.ttfb > (budget?.maxTTFB || this.thresholds.ttfb.good)) {
      recommendations.push(
        'TTFB optimization: Implement server-side caching, optimize database queries, use CDN for static assets'
      );
    }

    return recommendations;
  }

  /**
   * Get aggregated metrics for page clusters
   */
  async getClusterPerformance(): Promise<{
    scholarshipDetail: { averageLCP: number; averageINP: number; averageCLS: number; passRate: number };
    categoryPages: { averageLCP: number; averageINP: number; averageCLS: number; passRate: number };
    statePages: { averageLCP: number; averageINP: number; averageCLS: number; passRate: number };
    mainPages: { averageLCP: number; averageINP: number; averageCLS: number; passRate: number };
  }> {
    // Mock cluster performance data - in production would aggregate real metrics
    return {
      scholarshipDetail: {
        averageLCP: 2100,
        averageINP: 130,
        averageCLS: 0.06,
        passRate: 0.92 // 92% of pages pass budget
      },
      categoryPages: {
        averageLCP: 1950,
        averageINP: 145,
        averageCLS: 0.08,
        passRate: 0.96 // 96% pass rate
      },
      statePages: {
        averageLCP: 2050,
        averageINP: 125,
        averageCLS: 0.07,
        passRate: 0.94 // 94% pass rate
      },
      mainPages: {
        averageLCP: 1750,
        averageINP: 95,
        averageCLS: 0.04,
        passRate: 0.98 // 98% pass rate
      }
    };
  }

  /**
   * Generate performance monitoring alerts
   */
  checkPerformanceAlerts(): {
    critical: string[];
    warning: string[];
    info: string[];
  } {
    const alerts = {
      critical: [] as string[],
      warning: [] as string[],
      info: [] as string[]
    };

    // Mock alert generation based on performance trends
    // In production, would analyze real performance data

    // Critical alerts (budget violations affecting many pages)
    const scholarshipDetailPassRate = 0.92;
    if (scholarshipDetailPassRate < 0.90) {
      alerts.critical.push('Scholarship detail pages: <90% budget pass rate detected');
    }

    // Warning alerts (approaching thresholds)
    const categoryPageLCP = 1950;
    if (categoryPageLCP > 2200) {
      alerts.warning.push(`Category pages LCP trending high: ${categoryPageLCP}ms (budget: 2500ms)`);
    }

    // Info alerts (optimization opportunities)
    alerts.info.push('Opportunity: Implement image preloading for scholarship images to improve LCP');
    alerts.info.push('Opportunity: Enable compression for category page JSON responses');

    return alerts;
  }

  /**
   * Generate caching and prerender rules
   */
  generateCachingRules(): {
    staticAssets: { pattern: string; duration: string; strategy: string }[];
    dynamicContent: { pattern: string; duration: string; strategy: string }[];
    prerender: { patterns: string[]; priority: 'high' | 'medium' | 'low' }[];
  } {
    return {
      staticAssets: [
        {
          pattern: '/dist/public/assets/*',
          duration: '1y',
          strategy: 'cache-first'
        },
        {
          pattern: '/og-*.png',
          duration: '1w',
          strategy: 'cache-first'
        },
        {
          pattern: '/favicon.ico',
          duration: '1y',
          strategy: 'cache-first'
        }
      ],
      dynamicContent: [
        {
          pattern: '/scholarships/category/*',
          duration: '1h',
          strategy: 'stale-while-revalidate'
        },
        {
          pattern: '/scholarships/state/*',
          duration: '6h',
          strategy: 'stale-while-revalidate'
        },
        {
          pattern: '/scholarships/*/*/.*',
          duration: '24h',
          strategy: 'stale-while-revalidate'
        },
        {
          pattern: '/sitemap.xml',
          duration: '1h',
          strategy: 'stale-while-revalidate'
        }
      ],
      prerender: [
        {
          patterns: ['/scholarships/category/stem', '/scholarships/category/engineering', '/scholarships/category/medical'],
          priority: 'high'
        },
        {
          patterns: ['/scholarships/state/ca', '/scholarships/state/tx', '/scholarships/state/ny'],
          priority: 'high'
        },
        {
          patterns: ['/scholarships/category/*'],
          priority: 'medium'
        },
        {
          patterns: ['/scholarships/state/*'],
          priority: 'medium'
        }
      ]
    };
  }

  private getMetricScore(value: number, threshold: { good: number; needsImprovement: number }): 'good' | 'needs-improvement' | 'poor' {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  }
}