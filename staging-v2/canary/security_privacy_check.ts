/**
 * Security and Privacy Spot Check Framework
 * 
 * CEO Requirements:
 * - 20 cross-service calls with X-API-Key verification
 * - 5 minor test journeys with DoNotSell=true and strict CSP
 * - 0 PII in logs
 */

const DATASERVICE_URL = process.env.DATASERVICE_URL || 'http://localhost:3001';
const DOCHUB_URL = process.env.DOCHUB_URL || 'http://localhost:3002';
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3003';
const API_KEY = process.env.V2_API_KEY || 'dev-api-key';
const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

interface ApiKeyCheckResult {
  service: string;
  endpoint: string;
  method: string;
  with_key: { status: number; latency_ms: number };
  without_key: { status: number; latency_ms: number };
  key_enforcement: 'PASS' | 'FAIL';
}

interface MinorJourneyResult {
  journey_id: string;
  user_age: number;
  do_not_sell_header: boolean;
  csp_strict: boolean;
  pii_in_response: boolean;
  overall: 'PASS' | 'FAIL';
}

export interface SecurityPrivacyReport {
  timestamp: string;
  api_key_checks: ApiKeyCheckResult[];
  minor_journeys: MinorJourneyResult[];
  summary: {
    api_key_pass: number;
    api_key_fail: number;
    minor_pass: number;
    minor_fail: number;
    pii_violations: number;
  };
}

async function checkApiKeyEnforcement(
  service: string,
  endpoint: string,
  method: string,
  body?: object
): Promise<ApiKeyCheckResult> {
  const url = `${service}${endpoint}`;
  
  const withKeyStart = Date.now();
  let withKeyStatus = 0;
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: body ? JSON.stringify(body) : undefined
    });
    withKeyStatus = res.status;
  } catch {
    withKeyStatus = 0;
  }
  const withKeyLatency = Date.now() - withKeyStart;

  const withoutKeyStart = Date.now();
  let withoutKeyStatus = 0;
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    withoutKeyStatus = res.status;
  } catch {
    withoutKeyStatus = 0;
  }
  const withoutKeyLatency = Date.now() - withoutKeyStart;

  return {
    service: service.includes('3001') ? 'DataService' : service.includes('3002') ? 'DocumentHub' : 'Orchestrator',
    endpoint,
    method,
    with_key: { status: withKeyStatus, latency_ms: withKeyLatency },
    without_key: { status: withoutKeyStatus, latency_ms: withoutKeyLatency },
    key_enforcement: withoutKeyStatus === 401 ? 'PASS' : 'FAIL'
  };
}

async function runMinorJourney(journeyId: string): Promise<MinorJourneyResult> {
  const minorAge = 16;
  
  let doNotSellHeader = false;
  let cspStrict = false;
  let piiInResponse = false;

  try {
    const res = await fetch(`${DOCHUB_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        user_id: `minor_${journeyId}`,
        filename: 'transcript.pdf',
        age: minorAge,
        is_minor: true
      })
    });

    doNotSellHeader = res.headers.get('X-Do-Not-Sell') === 'true';
    
    const csp = res.headers.get('Content-Security-Policy') || '';
    cspStrict = csp.includes("frame-ancestors 'none'") && !csp.includes('google');

    const body = await res.text();
    const piiPatterns = [
      /\b[A-Z][a-z]+\s[A-Z][a-z]+\b.*@.*\.com/,
      /\b\d{3}-\d{2}-\d{4}\b/,
      /\b\d{9}\b/
    ];
    piiInResponse = piiPatterns.some(p => p.test(body));
  } catch {
    return {
      journey_id: journeyId,
      user_age: minorAge,
      do_not_sell_header: false,
      csp_strict: false,
      pii_in_response: false,
      overall: 'FAIL'
    };
  }

  return {
    journey_id: journeyId,
    user_age: minorAge,
    do_not_sell_header: doNotSellHeader,
    csp_strict: cspStrict,
    pii_in_response: piiInResponse,
    overall: doNotSellHeader && cspStrict && !piiInResponse ? 'PASS' : 'FAIL'
  };
}

export async function runSecurityPrivacyChecks(): Promise<SecurityPrivacyReport> {
  const apiKeyChecks: ApiKeyCheckResult[] = [];
  
  const endpoints = [
    { service: DATASERVICE_URL, endpoint: '/student/signup', method: 'POST', body: { email: 'test@test.com', name: 'Test' } },
    { service: DATASERVICE_URL, endpoint: '/provider/onboard', method: 'POST', body: { organization_name: 'Test', contact_email: 'test@test.com' } },
    { service: DATASERVICE_URL, endpoint: '/scholarships/match?student_id=test', method: 'GET' },
    { service: DATASERVICE_URL, endpoint: '/credits/purchase', method: 'POST', body: { user_id: 'test', credits: 10, dry_run: true } },
    { service: DOCHUB_URL, endpoint: '/upload', method: 'POST', body: { user_id: 'test', filename: 'test.pdf' } },
    { service: DOCHUB_URL, endpoint: '/webhooks/test', method: 'POST', body: { test: true } },
    { service: DOCHUB_URL, endpoint: '/documents/doc_1', method: 'GET' }
  ];

  for (let i = 0; i < 20; i++) {
    const ep = endpoints[i % endpoints.length];
    const result = await checkApiKeyEnforcement(ep.service, ep.endpoint, ep.method, ep.body);
    apiKeyChecks.push(result);
  }

  const minorJourneys: MinorJourneyResult[] = [];
  for (let i = 0; i < 5; i++) {
    const result = await runMinorJourney(`minor_${Date.now()}_${i}`);
    minorJourneys.push(result);
  }

  const report: SecurityPrivacyReport = {
    timestamp: new Date().toISOString(),
    api_key_checks: apiKeyChecks,
    minor_journeys: minorJourneys,
    summary: {
      api_key_pass: apiKeyChecks.filter(c => c.key_enforcement === 'PASS').length,
      api_key_fail: apiKeyChecks.filter(c => c.key_enforcement === 'FAIL').length,
      minor_pass: minorJourneys.filter(j => j.overall === 'PASS').length,
      minor_fail: minorJourneys.filter(j => j.overall === 'FAIL').length,
      pii_violations: minorJourneys.filter(j => j.pii_in_response).length
    }
  };

  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'security_privacy_check',
        app_id: 'A5',
        timestamp: report.timestamp,
        data: report
      })
    });
  } catch {
    console.log('[SecurityCheck] Failed to post to A8');
  }

  return report;
}
