/**
 * Day 4 Conditional Scale Authorization
 * 
 * Pre-approved: $300 → $400/day
 * Condition: Day-3 T+24h all gates green
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const DAY4_SCALE_CONFIG = {
  authorization: 'CEO-PREAPPROVED',
  effective_on: 'day3_t24h_green',
  verification_time: '06:00 UTC',
  
  budget_change: {
    from_usd: 300,
    to_usd: 400
  },
  
  gates: {
    cac_max_usd: 7,
    arpu_7d_cac_multiplier: 2.0,
    refunds_max: 0.03,
    stripe_success_min: 0.985,
    incidents_max: 0
  },
  
  on_activation: {
    throttles_active: true,
    slo_guardrails_active: true,
    campaigns_staged: true
  }
};

export interface Day3T24hMetrics {
  cac_usd: number;
  arpu_7d_usd: number;
  refund_rate: number;
  stripe_success: number;
  incidents: number;
  timestamp: string;
}

export function verifyDay4ScaleGates(metrics: Day3T24hMetrics): {
  approved: boolean;
  gates: { gate: string; required: string; actual: string; passed: boolean }[];
} {
  const gates = DAY4_SCALE_CONFIG.gates;
  const results: { gate: string; required: string; actual: string; passed: boolean }[] = [];
  
  results.push({
    gate: 'CAC',
    required: `≤ $${gates.cac_max_usd}`,
    actual: `$${metrics.cac_usd.toFixed(2)}`,
    passed: metrics.cac_usd <= gates.cac_max_usd
  });
  
  const arpuCacRatio = metrics.cac_usd > 0 ? metrics.arpu_7d_usd / metrics.cac_usd : 0;
  results.push({
    gate: 'ARPU7:CAC',
    required: `≥ ${gates.arpu_7d_cac_multiplier}×`,
    actual: `${arpuCacRatio.toFixed(2)}×`,
    passed: arpuCacRatio >= gates.arpu_7d_cac_multiplier
  });
  
  results.push({
    gate: 'Refunds',
    required: `≤ ${(gates.refunds_max * 100)}%`,
    actual: `${(metrics.refund_rate * 100).toFixed(1)}%`,
    passed: metrics.refund_rate <= gates.refunds_max
  });
  
  results.push({
    gate: 'Stripe Success',
    required: `≥ ${(gates.stripe_success_min * 100)}%`,
    actual: `${(metrics.stripe_success * 100).toFixed(1)}%`,
    passed: metrics.stripe_success >= gates.stripe_success_min
  });
  
  results.push({
    gate: 'Incidents',
    required: `= ${gates.incidents_max}`,
    actual: `${metrics.incidents}`,
    passed: metrics.incidents === gates.incidents_max
  });
  
  return {
    approved: results.every(r => r.passed),
    gates: results
  };
}

export async function activateDay4Scale(metrics: Day3T24hMetrics): Promise<{
  activated: boolean;
  message: string;
}> {
  const verification = verifyDay4ScaleGates(metrics);
  
  if (!verification.approved) {
    const failed = verification.gates.filter(g => !g.passed).map(g => g.gate).join(', ');
    return {
      activated: false,
      message: `Scale blocked: ${failed} gates failed`
    };
  }
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'day4_scale_activated',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          from_budget_usd: DAY4_SCALE_CONFIG.budget_change.from_usd,
          to_budget_usd: DAY4_SCALE_CONFIG.budget_change.to_usd,
          verification: verification.gates,
          metrics
        }
      })
    });
    
    return {
      activated: true,
      message: `Scale approved: Budget $${DAY4_SCALE_CONFIG.budget_change.from_usd} → $${DAY4_SCALE_CONFIG.budget_change.to_usd}`
    };
  } catch {
    return {
      activated: false,
      message: 'Failed to emit scale activation to A8'
    };
  }
}

export function generateGateReport(metrics: Day3T24hMetrics): string {
  const verification = verifyDay4ScaleGates(metrics);
  
  let report = '# Day 4 Scale Gate Verification\n\n';
  report += `**Timestamp:** ${metrics.timestamp}\n`;
  report += `**Authorization:** ${DAY4_SCALE_CONFIG.authorization}\n`;
  report += `**Target:** $${DAY4_SCALE_CONFIG.budget_change.from_usd} → $${DAY4_SCALE_CONFIG.budget_change.to_usd}\n\n`;
  
  report += '| Gate | Required | Actual | Status |\n';
  report += '|------|----------|--------|--------|\n';
  
  for (const gate of verification.gates) {
    const status = gate.passed ? '✓ PASS' : '✗ FAIL';
    report += `| ${gate.gate} | ${gate.required} | ${gate.actual} | ${status} |\n`;
  }
  
  report += `\n**Overall:** ${verification.approved ? 'APPROVED' : 'BLOCKED'}\n`;
  
  return report;
}
