/**
 * Ungate Checklist Tracker
 * 
 * Tracks criteria that must be green for two consecutive checkpoints
 * before B2C charges can be ungated.
 */

interface ChecklistItem {
  id: string;
  name: string;
  target: string;
  check: () => CheckResult;
}

interface CheckResult {
  status: 'green' | 'amber' | 'red';
  actual: string;
  passed: boolean;
}

interface CheckpointResult {
  timestamp: number;
  snapshot: string;
  results: Map<string, CheckResult>;
  allGreen: boolean;
}

class UngateChecklist {
  private checkpoints: CheckpointResult[] = [];
  private consecutiveGreenRequired = 2;

  // Checklist items with their checks
  private items: ChecklistItem[] = [
    {
      id: 'success_rate',
      name: 'Success Rate',
      target: '≥99.5%',
      check: () => ({ status: 'green', actual: '100%', passed: true })
    },
    {
      id: '5xx_rate',
      name: '5xx Error Rate',
      target: '<0.5%',
      check: () => ({ status: 'green', actual: '0%', passed: true })
    },
    {
      id: 'p95_latency',
      name: 'P95 Latency (all endpoints)',
      target: '≤120ms',
      check: () => ({ status: 'amber', actual: '~150ms', passed: false })
    },
    {
      id: 'p99_latency',
      name: 'P99 Latency (all endpoints)',
      target: '≤200ms',
      check: () => ({ status: 'green', actual: '~183ms', passed: true })
    },
    {
      id: 'webhook_403',
      name: 'Webhook 403 Errors',
      target: '0',
      check: () => ({ status: 'green', actual: '0', passed: true })
    },
    {
      id: 'security_headers',
      name: 'Security Headers',
      target: 'All present',
      check: () => ({ status: 'green', actual: 'All present', passed: true })
    },
    {
      id: 'revenue_blocker',
      name: 'A3 Revenue Blocker',
      target: '0',
      check: () => ({ status: 'green', actual: '0', passed: true })
    },
    {
      id: 'seo_stable',
      name: 'SEO Sitemap Stable',
      target: 'No rate-limit SEV-1',
      check: () => ({ status: 'green', actual: 'Stable', passed: true })
    },
    {
      id: 'seo_delta',
      name: 'SEO URL Delta',
      target: 'Positive',
      check: () => ({ status: 'amber', actual: '0', passed: false })
    },
    {
      id: 'error_budget',
      name: 'Error Budget Burn',
      target: '≤10% in 24h',
      check: () => ({ status: 'green', actual: '0%', passed: true })
    },
    {
      id: 'ferpa_coppa',
      name: 'FERPA/COPPA Guardrails',
      target: 'Active',
      check: () => ({ status: 'green', actual: 'Active', passed: true })
    }
  ];

  /**
   * Record a checkpoint evaluation
   */
  recordCheckpoint(snapshot: string, results: Map<string, CheckResult>): CheckpointResult {
    const allGreen = Array.from(results.values()).every(r => r.status === 'green');
    
    const checkpoint: CheckpointResult = {
      timestamp: Date.now(),
      snapshot,
      results,
      allGreen
    };
    
    this.checkpoints.push(checkpoint);
    return checkpoint;
  }

  /**
   * Evaluate current state
   */
  evaluate(overrides?: Map<string, CheckResult>): Map<string, CheckResult> {
    const results = new Map<string, CheckResult>();
    
    for (const item of this.items) {
      if (overrides?.has(item.id)) {
        results.set(item.id, overrides.get(item.id)!);
      } else {
        results.set(item.id, item.check());
      }
    }
    
    return results;
  }

  /**
   * Check if ungate criteria met
   */
  canUngate(): boolean {
    if (this.checkpoints.length < this.consecutiveGreenRequired) {
      return false;
    }

    const recent = this.checkpoints.slice(-this.consecutiveGreenRequired);
    return recent.every(cp => cp.allGreen);
  }

  /**
   * Generate checklist report
   */
  generateReport(snapshot: string, results: Map<string, CheckResult>): string {
    let report = '# Ungate Checklist - ' + snapshot + '\n\n';
    report += '**Requirement**: All green for 2 consecutive checkpoints (T+12h and T+18h)\n\n';
    
    report += '| Criteria | Target | Actual | Status |\n';
    report += '|----------|--------|--------|--------|\n';

    let greenCount = 0;
    let totalCount = 0;

    for (const item of this.items) {
      const result = results.get(item.id);
      if (result) {
        const statusIcon = result.status === 'green' ? '🟢' : 
                          result.status === 'amber' ? '🟡' : '🔴';
        report += `| ${item.name} | ${item.target} | ${result.actual} | ${statusIcon} |\n`;
        
        if (result.status === 'green') greenCount++;
        totalCount++;
      }
    }

    report += `\n**Score**: ${greenCount}/${totalCount} criteria green\n`;
    report += `**Ungate Ready**: ${this.canUngate() ? '✅ YES' : '❌ NO'}\n`;

    if (this.checkpoints.length > 0) {
      report += '\n## Previous Checkpoints\n\n';
      this.checkpoints.slice(-3).forEach(cp => {
        report += `- ${cp.snapshot}: ${cp.allGreen ? '🟢 All Green' : '🟡 Not Ready'}\n`;
      });
    }

    return report;
  }
}

export const ungateChecklist = new UngateChecklist();
export { UngateChecklist, ChecklistItem, CheckResult, CheckpointResult };
