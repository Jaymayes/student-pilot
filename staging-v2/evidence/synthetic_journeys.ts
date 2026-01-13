/**
 * Synthetic Journey Runner
 * 
 * Runs 10 B2C First Upload + 10 B2B Provider Onboard journeys
 * Logs all results to A8
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';
const DATASERVICE_URL = process.env.DATASERVICE_URL || 'http://localhost:3001';
const DOCHUB_URL = process.env.DOCHUB_URL || 'http://localhost:3002';
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3003';
const API_KEY = process.env.V2_API_KEY || 'dev-api-key';

interface JourneyResult {
  journey_id: string;
  type: 'b2c_first_upload' | 'b2b_provider_onboard';
  steps: StepResult[];
  success: boolean;
  total_latency_ms: number;
  timestamp: string;
}

interface StepResult {
  step: string;
  status: number;
  latency_ms: number;
  success: boolean;
}

async function runB2CFirstUpload(journeyId: string): Promise<JourneyResult> {
  const steps: StepResult[] = [];
  const startTime = Date.now();
  
  const signupStart = Date.now();
  try {
    const signupRes = await fetch(`${DATASERVICE_URL}/student/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        email: `synthetic_${journeyId}@test.local`,
        name: 'Synthetic User',
        age: 18
      })
    });
    steps.push({
      step: 'student_signup',
      status: signupRes.status,
      latency_ms: Date.now() - signupStart,
      success: signupRes.status === 201
    });
  } catch {
    steps.push({ step: 'student_signup', status: 0, latency_ms: Date.now() - signupStart, success: false });
  }

  const uploadStart = Date.now();
  try {
    const uploadRes = await fetch(`${DOCHUB_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        user_id: `user_${journeyId}`,
        filename: 'transcript.pdf',
        mime: 'application/pdf',
        size: 102400,
        age: 18
      })
    });
    steps.push({
      step: 'document_upload',
      status: uploadRes.status,
      latency_ms: Date.now() - uploadStart,
      success: uploadRes.status === 201
    });
  } catch {
    steps.push({ step: 'document_upload', status: 0, latency_ms: Date.now() - uploadStart, success: false });
  }

  const activationStart = Date.now();
  try {
    const activationRes = await fetch(`${ORCHESTRATOR_URL}/activation/status?user_id=user_${journeyId}`);
    steps.push({
      step: 'activation_check',
      status: activationRes.status,
      latency_ms: Date.now() - activationStart,
      success: activationRes.status === 200
    });
  } catch {
    steps.push({ step: 'activation_check', status: 0, latency_ms: Date.now() - activationStart, success: false });
  }

  return {
    journey_id: journeyId,
    type: 'b2c_first_upload',
    steps,
    success: steps.every(s => s.success),
    total_latency_ms: Date.now() - startTime,
    timestamp: new Date().toISOString()
  };
}

async function runB2BProviderOnboard(journeyId: string): Promise<JourneyResult> {
  const steps: StepResult[] = [];
  const startTime = Date.now();

  const onboardStart = Date.now();
  try {
    const onboardRes = await fetch(`${DATASERVICE_URL}/provider/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        organization_name: `Synthetic Provider ${journeyId}`,
        contact_email: `provider_${journeyId}@test.local`,
        tier: 'starter'
      })
    });
    steps.push({
      step: 'provider_onboard',
      status: onboardRes.status,
      latency_ms: Date.now() - onboardStart,
      success: onboardRes.status === 201
    });
  } catch {
    steps.push({ step: 'provider_onboard', status: 0, latency_ms: Date.now() - onboardStart, success: false });
  }

  const feeStart = Date.now();
  try {
    const feeRes = await fetch(`${DATASERVICE_URL}/credits/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        user_id: `provider_${journeyId}`,
        credits: 100,
        amount_cents: 2999,
        dry_run: true
      })
    });
    steps.push({
      step: 'platform_fee_capture',
      status: feeRes.status,
      latency_ms: Date.now() - feeStart,
      success: feeRes.status === 201
    });
  } catch {
    steps.push({ step: 'platform_fee_capture', status: 0, latency_ms: Date.now() - feeStart, success: false });
  }

  return {
    journey_id: journeyId,
    type: 'b2b_provider_onboard',
    steps,
    success: steps.every(s => s.success),
    total_latency_ms: Date.now() - startTime,
    timestamp: new Date().toISOString()
  };
}

async function logToA8(result: JourneyResult): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'synthetic_journey',
        app_id: 'A5',
        timestamp: result.timestamp,
        data: result
      })
    });
  } catch {
    console.log(`[Synthetic] Failed to log journey ${result.journey_id}`);
  }
}

export async function runAllSyntheticJourneys(): Promise<{
  b2c_results: JourneyResult[];
  b2b_results: JourneyResult[];
  summary: { b2c_success: number; b2b_success: number; total: number };
}> {
  const b2c_results: JourneyResult[] = [];
  const b2b_results: JourneyResult[] = [];

  for (let i = 1; i <= 10; i++) {
    const b2cResult = await runB2CFirstUpload(`b2c_${Date.now()}_${i}`);
    b2c_results.push(b2cResult);
    await logToA8(b2cResult);

    const b2bResult = await runB2BProviderOnboard(`b2b_${Date.now()}_${i}`);
    b2b_results.push(b2bResult);
    await logToA8(b2bResult);
  }

  return {
    b2c_results,
    b2b_results,
    summary: {
      b2c_success: b2c_results.filter(r => r.success).length,
      b2b_success: b2b_results.filter(r => r.success).length,
      total: 20
    }
  };
}
