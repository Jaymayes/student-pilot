/**
 * Revenue Forecast Model
 * 
 * 30/60/90-day projections with confidence bands
 * Based on organic SEO trend + conservative pilot uplift
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export interface DailyRevenueData {
  date: string;
  b2c_net_usd: number;
  b2b_fees_usd: number;
  organic_sessions: number;
  paid_sessions: number;
  conversions: number;
}

export interface ForecastResult {
  timestamp: string;
  
  day30: {
    revenue_usd: number;
    confidence_low_usd: number;
    confidence_high_usd: number;
    organic_contribution: number;
    paid_contribution: number;
  };
  
  day60: {
    revenue_usd: number;
    confidence_low_usd: number;
    confidence_high_usd: number;
    organic_contribution: number;
    paid_contribution: number;
  };
  
  day90: {
    revenue_usd: number;
    confidence_low_usd: number;
    confidence_high_usd: number;
    organic_contribution: number;
    paid_contribution: number;
  };
  
  arr_projection_usd: number;
  cac_sensitivity: {
    cac_8: { ltv_cac_ratio: number; viable: boolean };
    cac_10: { ltv_cac_ratio: number; viable: boolean };
    cac_12: { ltv_cac_ratio: number; viable: boolean };
  };
}

export const FORECAST_CONFIG = {
  organic_growth_rate_weekly: 0.08,
  pilot_uplift_conservative: 0.05,
  confidence_band: 0.15,
  
  ltv_assumption_usd: 45,
  arpu_target_usd: 22,
  
  b2b_growth_rate_weekly: 0.12,
  provider_fee_rate: 0.03
};

function calculateTrend(data: DailyRevenueData[]): {
  daily_avg_usd: number;
  growth_rate: number;
} {
  if (data.length < 2) {
    return { daily_avg_usd: 0, growth_rate: 0 };
  }
  
  const totalRevenue = data.reduce((sum, d) => sum + d.b2c_net_usd + d.b2b_fees_usd, 0);
  const dailyAvg = totalRevenue / data.length;
  
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  
  const firstAvg = firstHalf.reduce((s, d) => s + d.b2c_net_usd + d.b2b_fees_usd, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, d) => s + d.b2c_net_usd + d.b2b_fees_usd, 0) / secondHalf.length;
  
  const growthRate = firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0;
  
  return { daily_avg_usd: dailyAvg, growth_rate: growthRate };
}

export function generateForecast(historicalData: DailyRevenueData[]): ForecastResult {
  const trend = calculateTrend(historicalData);
  const config = FORECAST_CONFIG;
  
  const organicGrowthDaily = Math.pow(1 + config.organic_growth_rate_weekly, 1/7) - 1;
  const paidUplift = config.pilot_uplift_conservative;
  
  const day30Revenue = trend.daily_avg_usd * 30 * Math.pow(1 + organicGrowthDaily, 30) * (1 + paidUplift);
  const day60Revenue = trend.daily_avg_usd * 30 * Math.pow(1 + organicGrowthDaily, 60) * (1 + paidUplift);
  const day90Revenue = trend.daily_avg_usd * 30 * Math.pow(1 + organicGrowthDaily, 90) * (1 + paidUplift);
  
  const arrProjection = (day90Revenue / 90) * 365;
  
  return {
    timestamp: new Date().toISOString(),
    
    day30: {
      revenue_usd: Math.round(day30Revenue),
      confidence_low_usd: Math.round(day30Revenue * (1 - config.confidence_band)),
      confidence_high_usd: Math.round(day30Revenue * (1 + config.confidence_band)),
      organic_contribution: 1 - paidUplift,
      paid_contribution: paidUplift
    },
    
    day60: {
      revenue_usd: Math.round(day60Revenue),
      confidence_low_usd: Math.round(day60Revenue * (1 - config.confidence_band)),
      confidence_high_usd: Math.round(day60Revenue * (1 + config.confidence_band)),
      organic_contribution: 1 - paidUplift,
      paid_contribution: paidUplift
    },
    
    day90: {
      revenue_usd: Math.round(day90Revenue),
      confidence_low_usd: Math.round(day90Revenue * (1 - config.confidence_band)),
      confidence_high_usd: Math.round(day90Revenue * (1 + config.confidence_band)),
      organic_contribution: 1 - paidUplift,
      paid_contribution: paidUplift
    },
    
    arr_projection_usd: Math.round(arrProjection),
    
    cac_sensitivity: {
      cac_8: { 
        ltv_cac_ratio: config.ltv_assumption_usd / 8,
        viable: (config.ltv_assumption_usd / 8) >= 3
      },
      cac_10: { 
        ltv_cac_ratio: config.ltv_assumption_usd / 10,
        viable: (config.ltv_assumption_usd / 10) >= 3
      },
      cac_12: { 
        ltv_cac_ratio: config.ltv_assumption_usd / 12,
        viable: (config.ltv_assumption_usd / 12) >= 3
      }
    }
  };
}

export function generateForecastReport(forecast: ForecastResult): string {
  let report = '# Revenue Forecast (30/60/90-Day)\n\n';
  report += `**Generated:** ${forecast.timestamp}\n\n`;
  
  report += '## Projections\n\n';
  report += '| Window | Revenue | Low (85%) | High (115%) | Organic | Paid |\n';
  report += '|--------|---------|-----------|-------------|---------|------|\n';
  report += `| Day 30 | $${forecast.day30.revenue_usd.toLocaleString()} | $${forecast.day30.confidence_low_usd.toLocaleString()} | $${forecast.day30.confidence_high_usd.toLocaleString()} | ${(forecast.day30.organic_contribution * 100).toFixed(0)}% | ${(forecast.day30.paid_contribution * 100).toFixed(0)}% |\n`;
  report += `| Day 60 | $${forecast.day60.revenue_usd.toLocaleString()} | $${forecast.day60.confidence_low_usd.toLocaleString()} | $${forecast.day60.confidence_high_usd.toLocaleString()} | ${(forecast.day60.organic_contribution * 100).toFixed(0)}% | ${(forecast.day60.paid_contribution * 100).toFixed(0)}% |\n`;
  report += `| Day 90 | $${forecast.day90.revenue_usd.toLocaleString()} | $${forecast.day90.confidence_low_usd.toLocaleString()} | $${forecast.day90.confidence_high_usd.toLocaleString()} | ${(forecast.day90.organic_contribution * 100).toFixed(0)}% | ${(forecast.day90.paid_contribution * 100).toFixed(0)}% |\n\n`;
  
  report += `**ARR Projection:** $${forecast.arr_projection_usd.toLocaleString()}\n\n`;
  
  report += '## CAC Sensitivity\n\n';
  report += '| CAC | LTV:CAC | Viable (≥3:1) |\n';
  report += '|-----|---------|---------------|\n';
  report += `| $8 | ${forecast.cac_sensitivity.cac_8.ltv_cac_ratio.toFixed(1)}:1 | ${forecast.cac_sensitivity.cac_8.viable ? '✓' : '✗'} |\n`;
  report += `| $10 | ${forecast.cac_sensitivity.cac_10.ltv_cac_ratio.toFixed(1)}:1 | ${forecast.cac_sensitivity.cac_10.viable ? '✓' : '✗'} |\n`;
  report += `| $12 | ${forecast.cac_sensitivity.cac_12.ltv_cac_ratio.toFixed(1)}:1 | ${forecast.cac_sensitivity.cac_12.viable ? '✓' : '✗'} |\n`;
  
  return report;
}

export async function emitForecast(forecast: ForecastResult): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'revenue_forecast',
        app_id: 'A5',
        timestamp: forecast.timestamp,
        data: forecast
      })
    });
  } catch {
    console.log('[Forecast] Failed to emit forecast');
  }
}
