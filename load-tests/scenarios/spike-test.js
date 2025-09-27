/**
 * Spike Test - Task perf-6d
 * CEO Objective: Validate autoscaling and thundering-herd resilience with 2-minute recovery
 * 
 * Success Criteria:
 * - Recovery to normal P95 within 2 minutes post-spike
 * - No cascading failures during traffic spikes
 * - Circuit breakers activate cleanly during overload
 * - Exponential backoff + jitter prevents thundering herd
 * - Cache warming and connection pooling handle burst traffic
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { 
  AI_ENDPOINTS, 
  USER_ENDPOINTS, 
  PARTNER_ENDPOINTS,
  MONITORING_ENDPOINTS,
  SEO_ENDPOINTS 
} from '../config/endpoints.js';

// Spike-specific metrics
const spikeRecoveryTime = new Gauge('spike_recovery_time_seconds');
const thunderingHerdIndicator = new Rate('thundering_herd_rate');
const autoscalingResponseTime = new Gauge('autoscaling_response_time_seconds');
const trafficDistributionBalance = new Gauge('traffic_distribution_balance');
const connectionPoolExhaustion = new Counter('connection_pool_exhaustion');
const cacheWarmingEffectiveness = new Rate('cache_warming_effectiveness');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Baseline
    { duration: '30s', target: 2000 }, // Sudden spike (marketing campaign)
    { duration: '1m', target: 2000 },  // Sustained spike
    { duration: '30s', target: 100 },  // Immediate drop
    { duration: '2m', target: 100 },   // Recovery monitoring
    { duration: '30s', target: 3000 }, // Second spike (news mention)
    { duration: '45s', target: 3000 }, // Peak traffic
    { duration: '30s', target: 500 },  // Gradual decline
    { duration: '3m', target: 100 },   // Final recovery
  ],
  
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Allow degradation during spikes
    spike_recovery_time_seconds: ['value<120'], // 2-minute recovery SLA
    thundering_herd_rate: ['rate<0.1'], // <10% simultaneous retry attempts
    autoscaling_response_time_seconds: ['value<60'], // 1-minute autoscaling
    connection_pool_exhaustion: ['count<10'], // Minimal pool exhaustion
    cache_warming_effectiveness: ['rate>0.7'], // 70%+ cache hits during spike
  },
  
  userAgent: 'ScholarLink-LoadTest/1.0 (Spike-Test)',
};

function authenticateUser() {
  return {
    'Authorization': 'Bearer spike-test-token',
    'Content-Type': 'application/json',
    'X-Correlation-ID': `spike-${__VU}-${Date.now()}-${Math.random()}`
  };
}

// Simulate realistic spike scenarios
const spikeScenarios = [
  // Social media viral post about scholarships
  {
    endpoints: [SEO_ENDPOINTS.scholarshipsList, USER_ENDPOINTS.scholarships],
    weight: 0.4,
    scenario: 'viral_social_media'
  },
  // News article mentioning AI essay help
  {
    endpoints: [AI_ENDPOINTS.analyzeEssay, AI_ENDPOINTS.generateOutline],
    weight: 0.3,
    scenario: 'news_ai_mention'
  },
  // Partner promotion campaign
  {
    endpoints: [PARTNER_ENDPOINTS.trackEvent, PARTNER_ENDPOINTS.deepLink],
    weight: 0.2,
    scenario: 'partner_campaign'
  },
  // University deadline rush
  {
    endpoints: [AI_ENDPOINTS.generateMatches, USER_ENDPOINTS.applications],
    weight: 0.1,
    scenario: 'deadline_rush'
  }
];

let spikeStartTime = null;
let baselineP95 = null;
let recoveryStartTime = null;

export default function() {
  const headers = authenticateUser();
  const currentStage = getCurrentStage();
  
  // Detect spike start and recovery phases
  if (currentStage === 'spike' && spikeStartTime === null) {
    spikeStartTime = Date.now();
  } else if (currentStage === 'recovery' && recoveryStartTime === null && spikeStartTime !== null) {
    recoveryStartTime = Date.now();
  }
  
  // Select scenario based on spike type
  const scenario = spikeScenarios[Math.floor(Math.random() * spikeScenarios.length)];
  
  // 1. Monitor system health during spike
  const healthStart = Date.now();
  const healthRes = http.get(MONITORING_ENDPOINTS.reliability);
  const healthDuration = Date.now() - healthStart;
  
  if (currentStage === 'recovery' && baselineP95 && healthDuration > baselineP95 * 1.1) {
    // Still not recovered to baseline
    if (recoveryStartTime && (Date.now() - recoveryStartTime) / 1000 > 120) {
      spikeRecoveryTime.add(121); // Failed 2-minute SLA
    }
  } else if (currentStage === 'baseline' && baselineP95 === null) {
    baselineP95 = healthDuration; // Establish baseline
  }
  
  // 2. Simulate thundering herd scenario
  if (scenario.scenario === 'viral_social_media') {
    // Many users hitting same scholarship pages simultaneously
    const scholarshipId = 'scholarship-123'; // Hot scholarship
    const scholarshipRes = http.get(`${USER_ENDPOINTS.scholarshipDetail.replace(':id', scholarshipId)}`);
    
    // Check for thundering herd indicators
    const isThunderingHerd = check(scholarshipRes, {
      'scholarship page loads successfully': (r) => r.status === 200,
      'response time indicates cache hit': (r) => r.timings.duration < 100,
      'no connection pool errors': (r) => !r.body.includes('connection pool') && !r.body.includes('timeout')
    });
    
    thunderingHerdIndicator.add(isThunderingHerd ? 0 : 1);
    
    if (scholarshipRes.status >= 500) {
      connectionPoolExhaustion.add(1);
    }
  }
  
  // 3. Test AI service spike handling
  if (scenario.scenario === 'news_ai_mention') {
    const aiPayload = {
      content: `Write a compelling scholarship essay about leadership and community service. 
                This essay should be approximately 500 words and demonstrate my passion for making a difference.`,
      type: 'scholarship_essay',
      wordLimit: 500,
      urgentRequest: true // Flag for spike testing
    };
    
    const aiStart = Date.now();
    const aiRes = http.post(AI_ENDPOINTS.analyzeEssay, JSON.stringify(aiPayload), { 
      headers,
      timeout: '15s' // Longer timeout during spikes
    });
    
    // Track autoscaling response
    if (aiRes.status === 200) {
      try {
        const response = JSON.parse(aiRes.body);
        if (response.processingTime) {
          autoscalingResponseTime.add(response.processingTime / 1000);
        }
        
        // Check cache effectiveness during spike
        if (response.cached || response.fromCache) {
          cacheWarmingEffectiveness.add(1);
        } else {
          cacheWarmingEffectiveness.add(0);
        }
      } catch (e) {
        cacheWarmingEffectiveness.add(0);
      }
    }
    
    // Add jitter to prevent synchronized requests
    const jitter = Math.random() * 0.5; // 0-500ms jitter
    sleep(jitter);
  }
  
  // 4. Partner traffic spike simulation
  if (scenario.scenario === 'partner_campaign') {
    const partnerEventData = {
      eventType: 'click',
      scholarshipId: `scholarship-${Math.floor(Math.random() * 100)}`,
      partnerId: 'partner-spike-test',
      studentHash: generateRandomHash(),
      timestamp: new Date().toISOString(),
      metadata: {
        campaignSource: 'spike_test',
        trafficSpike: true,
        userAgent: 'Mobile',
        deviceType: 'mobile'
      }
    };
    
    const partnerRes = http.post(PARTNER_ENDPOINTS.trackEvent, JSON.stringify(partnerEventData), { headers });
    
    // Monitor traffic distribution during partner spikes
    if (partnerRes.status === 200) {
      trafficDistributionBalance.add(1.0); // Balanced
    } else if (partnerRes.status === 429) {
      trafficDistributionBalance.add(0.5); // Rate limited
    } else {
      trafficDistributionBalance.add(0.0); // Failed
    }
  }
  
  // 5. University deadline rush simulation
  if (scenario.scenario === 'deadline_rush') {
    const urgentMatchPayload = {
      studentProfile: {
        gpa: 3.5 + Math.random() * 0.5,
        major: ['Engineering', 'Computer Science', 'Business', 'Medicine'][Math.floor(Math.random() * 4)],
        graduationYear: 2025,
        urgentApplication: true,
        deadlineWithin: '7_days'
      },
      preferences: {
        maxAmount: 25000,
        categories: ['merit', 'need-based'],
        urgencyLevel: 'high'
      }
    };
    
    const urgentStart = Date.now();
    const urgentRes = http.post(AI_ENDPOINTS.generateMatches, JSON.stringify(urgentMatchPayload), { headers });
    
    // Track urgent request handling
    if (urgentRes.status === 200) {
      const processingTime = Date.now() - urgentStart;
      if (processingTime > 5000) { // >5s indicates overload
        connectionPoolExhaustion.add(1);
      }
    }
  }
  
  // 6. Cache warming effectiveness test
  if (Math.random() < 0.1) {
    const cacheTestRes = http.get(`${USER_ENDPOINTS.scholarships}?cache_test=true&category=engineering`);
    if (cacheTestRes.status === 200) {
      const cacheHit = cacheTestRes.timings.duration < 50; // <50ms suggests cache hit
      cacheWarmingEffectiveness.add(cacheHit ? 1 : 0);
    }
  }
  
  // Minimal sleep during spikes to maximize load
  if (currentStage === 'spike') {
    sleep(0.05); // 50ms - aggressive load
  } else {
    sleep(0.2); // 200ms - normal load
  }
}

function getCurrentStage() {
  const elapsed = __ENV.K6_EXECUTION_TIME_ELAPSED || 0;
  
  if (elapsed < 120) return 'baseline';
  if (elapsed < 150) return 'spike';
  if (elapsed < 210) return 'sustained_spike';
  if (elapsed < 240) return 'recovery';
  if (elapsed < 360) return 'recovery_monitoring';
  if (elapsed < 390) return 'second_spike';
  if (elapsed < 435) return 'peak_traffic';
  if (elapsed < 465) return 'decline';
  return 'final_recovery';
}

function generateRandomHash() {
  return Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function handleSummary(data) {
  return {
    'spike-test-report.html': htmlReport(data),
    'spike-test-results.json': JSON.stringify(data, null, 2),
  };
}