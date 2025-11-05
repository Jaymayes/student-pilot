/**
 * Feature Flags Configuration for student_pilot
 * 
 * APP_NAME: student_pilot
 * APP_BASE_URL: https://student-pilot-jamarrlmayes.replit.app
 * 
 * Purpose: Control feature visibility and rollout based on CEO directives
 */

export interface FeatureFlags {
  /**
   * Controls visibility of scholarship recommendations UI
   * 
   * CEO Directive (2025-11-05): "Hold recommendations UI behind feature flag 
   * until scholarship_sage baseline completes and is cleared."
   * 
   * Trigger to enable: scholarship_sage 48-hour baseline completion + CEO clearance
   * Default: false (LOCKED)
   */
  enableRecommendations: boolean;

  /**
   * Controls WCAG testing panel visibility
   * Default: true (for accessibility remediation)
   */
  enableAccessibilityTest: boolean;

  /**
   * Controls payment/monetization features
   * Default: false (Stripe at 0% until Dec 16)
   */
  enablePayments: boolean;
}

/**
 * Load feature flags from environment variables
 * 
 * Flags can be overridden via environment variables:
 * - VITE_ENABLE_RECOMMENDATIONS
 * - VITE_ENABLE_ACCESSIBILITY_TEST
 * - VITE_ENABLE_PAYMENTS
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    // LOCKED by CEO directive until scholarship_sage baseline + clearance
    enableRecommendations: import.meta.env.VITE_ENABLE_RECOMMENDATIONS === 'true',
    
    // Enabled for WCAG Sprint 2 (Nov 11-25)
    enableAccessibilityTest: import.meta.env.VITE_ENABLE_ACCESSIBILITY_TEST !== 'false',
    
    // LOCKED until Phase 3 Go-Live (Dec 16)
    enablePayments: import.meta.env.VITE_ENABLE_PAYMENTS === 'true',
  };
}

/**
 * Hook to access feature flags throughout the application
 */
export function useFeatureFlags(): FeatureFlags {
  return getFeatureFlags();
}
