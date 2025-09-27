/**
 * Dependency Degradation Drills - Task perf-6f
 * CEO Objective: Simulate OpenAI, Stripe, Storage partial/total outages
 * 
 * Success Criteria:
 * - Graceful fallbacks engaged during simulated outages
 * - Critical user flows preserved during dependency failures
 * - Zero charge-on-failure violations
 * - Clear user messaging during service degradation
 * - Circuit breakers activate and recover properly
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { 
  AI_ENDPOINTS, 
  BILLING_ENDPOINTS, 
  STORAGE_ENDPOINTS,
  MONITORING_ENDPOINTS,
  USER_ENDPOINTS
} from '../config/endpoints.js';

// Dependency failure simulation metrics
const fallbackActivationRate = new Rate('fallback_activation_rate');
const chargeOnFailureViolations = new Counter('charge_on_failure_violations');
const criticalFlowPreservation = new Rate('critical_flow_preservation');
const userMessageQuality = new Rate('user_message_quality');
const circuitBreakerRecovery = new Gauge('circuit_breaker_recovery_time_seconds');
const serviceDegradationGraceful = new Rate('service_degradation_graceful');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Baseline normal operation
    { duration: '3m', target: 100 },   // OpenAI degradation simulation
    { duration: '1m', target: 50 },    // Recovery period
    { duration: '3m', target: 100 },   // Stripe degradation simulation
    { duration: '1m', target: 50 },    // Recovery period
    { duration: '3m', target: 100 },   // Storage degradation simulation
    { duration: '1m', target: 50 },    // Recovery period
    { duration: '3m', target: 100 },   // Multi-service degradation
    { duration: '2m', target: 0 },     // Final recovery
  ],
  
  thresholds: {
    fallback_activation_rate: ['rate>0.8'], // 80%+ fallbacks during outages
    charge_on_failure_violations: ['count<1'], // Zero tolerance
    critical_flow_preservation: ['rate>0.9'], // 90%+ critical flows working
    user_message_quality: ['rate>0.95'], // 95%+ helpful error messages
    circuit_breaker_recovery_time_seconds: ['value<60'], // <60s recovery
    service_degradation_graceful: ['rate>0.85'] // 85%+ graceful degradation
  },
  
  userAgent: 'ScholarLink-LoadTest/1.0 (Dependency-Degradation)',
};

function authenticateUser() {
  return {
    'Authorization': 'Bearer degradation-test-token',
    'Content-Type': 'application/json',
    'X-Correlation-ID': `degradation-${__VU}-${Date.now()}`,
    'X-Simulate-Failure': getCurrentFailureMode() // Signal failure simulation
  };
}

function getCurrentFailureMode() {
  const elapsed = __ENV.K6_EXECUTION_TIME_ELAPSED || 0;
  
  if (elapsed >= 120 && elapsed < 300) return 'openai_degraded';
  if (elapsed >= 360 && elapsed < 540) return 'stripe_degraded';
  if (elapsed >= 600 && elapsed < 780) return 'storage_degraded';
  if (elapsed >= 840 && elapsed < 1020) return 'multi_service_degraded';
  return 'normal';
}

let degradationStartTime = null;
let recoveryStartTime = null;

export default function() {
  const headers = authenticateUser();
  const failureMode = getCurrentFailureMode();
  
  // Track degradation phases
  if (failureMode !== 'normal' && degradationStartTime === null) {
    degradationStartTime = Date.now();
  } else if (failureMode === 'normal' && degradationStartTime !== null && recoveryStartTime === null) {
    recoveryStartTime = Date.now();
    const recoveryTime = (Date.now() - degradationStartTime) / 1000;
    circuitBreakerRecovery.add(recoveryTime);
  }
  
  // 1. Monitor Circuit Breaker States During Failures
  const reliabilityRes = http.get(MONITORING_ENDPOINTS.reliability);
  if (reliabilityRes.status === 200) {
    try {
      const status = JSON.parse(reliabilityRes.body);
      
      // Verify circuit breakers respond to simulated failures
      const expectingFailures = failureMode !== 'normal';
      let appropriateResponse = false;
      
      Object.keys(status.services || {}).forEach(service => {
        const serviceStatus = status.services[service];
        
        if (expectingFailures && (failureMode.includes(service) || failureMode === 'multi_service_degraded')) {
          // Should be OPEN or HALF_OPEN during simulated failures
          appropriateResponse = ['OPEN', 'HALF_OPEN'].includes(serviceStatus.state);
        } else {
          // Should be CLOSED for non-affected services
          appropriateResponse = serviceStatus.state === 'CLOSED';
        }
      });
      
      serviceDegradationGraceful.add(appropriateResponse ? 1 : 0);
      
    } catch (e) {
      serviceDegradationGraceful.add(0);
    }
  }
  
  sleep(0.1);
  
  // 2. Test AI Service Degradation Handling
  if (failureMode === 'openai_degraded' || failureMode === 'multi_service_degraded') {
    const aiPayload = {
      content: "Test essay for degradation drill - this should trigger fallback behavior.",
      type: 'scholarship_essay',
      wordLimit: 200,
      degradationTest: true
    };
    
    const aiRes = http.post(AI_ENDPOINTS.analyzeEssay, JSON.stringify(aiPayload), { headers });
    
    // Analyze fallback behavior
    const aiCheck = check(aiRes, {
      'AI service returns fallback response': (r) => {
        if (r.status === 200) {
          try {
            const response = JSON.parse(r.body);
            return response.response?.isFallback === true;
          } catch (e) {
            return false;
          }
        }
        return r.status === 503; // Service unavailable
      },
      'AI fallback has no billing': (r) => {
        if (r.status === 200) {
          try {
            const response = JSON.parse(r.body);
            if (response.response?.isFallback) {
              return response.usage?.chargedCredits === 0;
            }
          } catch (e) {
            return false;
          }
        }
        return true; // Non-200 responses shouldn't bill
      },
      'AI error message is helpful': (r) => {
        const body = r.body || '';
        return body.includes('temporarily unavailable') || 
               body.includes('try again') ||
               body.includes('service') ||
               body.includes('fallback');
      }
    });
    
    fallbackActivationRate.add(aiCheck ? 1 : 0);
    
    // Critical: Check for billing violations during failures
    if (aiRes.status === 200) {
      try {
        const response = JSON.parse(aiRes.body);
        if (response.response?.isFallback && response.usage?.chargedCredits > 0) {
          chargeOnFailureViolations.add(1);
          console.error(`CRITICAL: User charged ${response.usage.chargedCredits} credits for fallback`);
        }
      } catch (e) {
        // Parsing error during degradation - not a billing violation
      }
    }
  }
  
  sleep(0.3);
  
  // 3. Test Critical User Flow Preservation
  const profileRes = http.get(USER_ENDPOINTS.profile, { headers });
  const scholarshipsRes = http.get(`${USER_ENDPOINTS.scholarships}?limit=10`);
  
  const criticalFlowsWorking = check(profileRes, {
    'profile access preserved during degradation': (r) => [200, 401].includes(r.status)
  }) && check(scholarshipsRes, {
    'scholarship search preserved during degradation': (r) => r.status === 200,
    'scholarship data returned': (r) => {
      if (r.status === 200) {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data.scholarships) && data.scholarships.length > 0;
        } catch (e) {
          return false;
        }
      }
      return true;
    }
  });
  
  criticalFlowPreservation.add(criticalFlowsWorking ? 1 : 0);
  
  sleep(0.2);
  
  // 4. Test Stripe Payment Service Degradation
  if (failureMode === 'stripe_degraded' || failureMode === 'multi_service_degraded') {
    const estimatePayload = {
      operations: [
        { type: 'essay_analysis', model: 'gpt-4o', estimatedTokens: 500 }
      ],
      degradationTest: true
    };
    
    const stripeRes = http.post(BILLING_ENDPOINTS.estimate, JSON.stringify(estimatePayload), { headers });
    
    const stripeCheck = check(stripeRes, {
      'billing estimate handles Stripe degradation': (r) => {
        // Should either work normally or return helpful error
        return r.status === 200 || (r.status >= 400 && r.body.includes('payment'));
      },
      'billing error message quality': (r) => {
        if (r.status >= 400) {
          const body = r.body || '';
          return body.includes('payment') || 
                 body.includes('billing') ||
                 body.includes('temporarily') ||
                 body.includes('try again');
        }
        return true;
      }
    });
    
    userMessageQuality.add(stripeCheck ? 1 : 0);
  }
  
  sleep(0.2);
  
  // 5. Test Storage Service Degradation
  if (failureMode === 'storage_degraded' || failureMode === 'multi_service_degraded') {
    const documentsRes = http.get(USER_ENDPOINTS.documents, { headers });
    
    const storageCheck = check(documentsRes, {
      'document listing handles storage degradation': (r) => {
        // Should return empty list or helpful error, not crash
        return r.status === 200 || (r.status >= 400 && r.status < 500);
      },
      'storage error messaging': (r) => {
        if (r.status >= 400) {
          const body = r.body || '';
          return body.includes('storage') || 
                 body.includes('documents') ||
                 body.includes('temporarily') ||
                 body.includes('upload');
        }
        return true;
      }
    });
    
    serviceDegradationGraceful.add(storageCheck ? 1 : 0);
  }
  
  sleep(0.3);
  
  // 6. Test Multi-Service Degradation Impact
  if (failureMode === 'multi_service_degraded') {
    // Test that multiple service failures don't cascade
    const healthRes = http.get(MONITORING_ENDPOINTS.apiHealth);
    
    const multiServiceCheck = check(healthRes, {
      'API health endpoint remains responsive': (r) => r.status === 200,
      'Multi-service degradation is contained': (r) => {
        if (r.status === 200) {
          try {
            const health = JSON.parse(r.body);
            // Should report degraded but not completely failed
            return health.status === 'degraded' || health.status === 'healthy';
          } catch (e) {
            return false;
          }
        }
        return false;
      }
    });
    
    criticalFlowPreservation.add(multiServiceCheck ? 1 : 0);
  }
  
  sleep(0.5);
  
  // 7. Recovery Monitoring
  if (failureMode === 'normal' && recoveryStartTime !== null) {
    // Test that services recover properly after degradation
    const recoveryRes = http.get(MONITORING_ENDPOINTS.reliability);
    
    if (recoveryRes.status === 200) {
      try {
        const status = JSON.parse(recoveryRes.body);
        
        let servicesRecovered = 0;
        let totalServices = 0;
        
        Object.keys(status.services || {}).forEach(service => {
          totalServices++;
          if (status.services[service].state === 'CLOSED') {
            servicesRecovered++;
          }
        });
        
        const recoveryRate = totalServices > 0 ? servicesRecovered / totalServices : 1;
        serviceDegradationGraceful.add(recoveryRate);
        
      } catch (e) {
        serviceDegradationGraceful.add(0);
      }
    }
  }
  
  sleep(1.0); // Normal user think time
}

export function handleSummary(data) {
  return {
    'dependency-degradation-report.html': htmlReport(data),
    'dependency-degradation-results.json': JSON.stringify(data, null, 2),
  };
}