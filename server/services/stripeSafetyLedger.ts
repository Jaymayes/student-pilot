/**
 * Stripe Safety Ledger
 * 
 * Tracks:
 * - Test vs live charge attempts
 * - Safety budget remaining
 * - Declines and errors
 * - Ungate readiness
 */

type ChargeMode = 'test' | 'live';

interface ChargeAttempt {
  id: string;
  mode: ChargeMode;
  amountCents: number;
  status: 'success' | 'declined' | 'error';
  timestamp: number;
  reason?: string;
}

interface SafetyBudget {
  liveAttemptsRemaining: number;
  liveAttemptsTotal: number;
  testAttemptsToday: number;
}

class StripeSafetyLedger {
  private attempts: ChargeAttempt[] = [];
  private liveAttemptsTotal = 25;
  private liveAttemptsRemaining = 4; // Current state from soak
  private isFrozen = true; // CEO directive: freeze non-essential live charges

  /**
   * Record a charge attempt
   */
  recordAttempt(attempt: Omit<ChargeAttempt, 'timestamp'>): void {
    this.attempts.push({
      ...attempt,
      timestamp: Date.now()
    });

    if (attempt.mode === 'live' && attempt.status !== 'error') {
      this.liveAttemptsRemaining--;
    }
  }

  /**
   * Check if live charges are allowed
   */
  canChargeLive(): boolean {
    if (this.isFrozen) return false;
    return this.liveAttemptsRemaining > 0;
  }

  /**
   * Get current safety budget
   */
  getBudget(): SafetyBudget {
    const today = new Date().toDateString();
    const testAttemptsToday = this.attempts.filter(
      a => a.mode === 'test' && new Date(a.timestamp).toDateString() === today
    ).length;

    return {
      liveAttemptsRemaining: this.liveAttemptsRemaining,
      liveAttemptsTotal: this.liveAttemptsTotal,
      testAttemptsToday
    };
  }

  /**
   * Get recent declines
   */
  getDeclines(): ChargeAttempt[] {
    return this.attempts.filter(a => a.status === 'declined');
  }

  /**
   * Freeze/unfreeze live charges
   */
  setFrozen(frozen: boolean): void {
    this.isFrozen = frozen;
  }

  /**
   * Check freeze status
   */
  isFrozenStatus(): boolean {
    return this.isFrozen;
  }

  /**
   * Generate ledger report
   */
  generateReport(): string {
    const budget = this.getBudget();
    const declines = this.getDeclines();
    
    let report = '# Stripe Safety Ledger\n\n';
    report += '## Budget Status\n\n';
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Mode | ${this.isFrozen ? '🔒 FROZEN (test only)' : '🟢 ACTIVE'} |\n`;
    report += `| Live Attempts Remaining | ${budget.liveAttemptsRemaining}/${budget.liveAttemptsTotal} |\n`;
    report += `| Test Attempts Today | ${budget.testAttemptsToday} |\n`;
    
    if (declines.length > 0) {
      report += '\n## Recent Declines\n\n';
      report += '| ID | Mode | Amount | Reason | Time |\n';
      report += '|----|------|--------|--------|------|\n';
      declines.slice(-5).forEach(d => {
        report += `| ${d.id.slice(0,8)} | ${d.mode} | $${(d.amountCents/100).toFixed(2)} | ${d.reason || '-'} | ${new Date(d.timestamp).toISOString()} |\n`;
      });
    }

    return report;
  }
}

export const stripeSafetyLedger = new StripeSafetyLedger();
export { StripeSafetyLedger, ChargeAttempt, SafetyBudget };
