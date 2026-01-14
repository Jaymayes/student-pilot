/**
 * One-Click Apply Compliance Configuration
 * 
 * Principle: "Editor/Coach, not Ghostwriter"
 * FERPA/COPPA compliant with operational kill-switches
 * 
 * Test traffic: ≤10%
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const ONE_CLICK_APPLY_CONFIG = {
  version: '1.0.0',
  feature_flag: 'one_click_apply_v1',
  status: 'testing',
  
  experiment: {
    traffic_percent: 0.10,
    randomization_locked: true,
    decision_window: {
      days: 7,
      qualified_exposures: 1000,
      trigger: 'whichever_first'
    },
    success_metrics: [
      'completion_rate_lift',
      'provider_acceptance_rate',
      'refund_rate_delta',
      'complaint_rate',
      'time_to_submit'
    ],
    exclusions: {
      under_13: true,
      no_consent_state: true
    }
  },
  
  scope: {
    purpose: 'accelerate_admin_form_fill_only',
    positioning: 'editor_coach_guidance_only',
    prohibited: [
      'ai_auto_writing_essays',
      'ai_auto_writing_statements',
      'ghostwriting',
      'generating_prohibited_content'
    ]
  },
  
  ux_consent: {
    pre_submit_modal: {
      required: true,
      disclosures: [
        'fields_prefilled',
        'fields_untouched',
        'provider_specific_terms'
      ],
      checkbox_consent_required: true,
      final_submit_click_required: true
    },
    academic_integrity_notice: {
      visible_at_coach_help: true,
      visible_at_submission: true
    },
    view_edit_step: {
      required: true,
      default_focus: 'review'
    }
  },
  
  functional_constraints: {
    prefill_allowed: [
      'profile_fields',
      'eligibility_fields',
      'reusable_facts'
    ],
    prefill_blocked: [
      'essays',
      'personal_statements',
      'creative_content'
    ],
    rate_limits: {
      max_submissions_per_user_per_day: 10,
      configurable_by_provider: true
    },
    anti_automation: {
      human_confirmation_step: true,
      no_auto_submit_on_load: true,
      no_background_submission: true,
      explicit_user_action_required: true
    }
  },
  
  data_privacy: {
    coppa: {
      age_gate_required: true,
      under_13_action: 'route_to_parental_consent',
      under_13_state: 'Pending_Parent_Auth',
      block_one_click_apply: true
    },
    ferpa: {
      authorization_enforced: true,
      cross_student_access_blocked: true,
      unauthorized_access_response: 403,
      unauthorized_access_logged: true
    },
    logging: {
      no_pii: true,
      allowed_fields: ['event_id', 'timestamp', 'provider_id', 'outcome'],
      destination: 'A8'
    }
  },
  
  provider_safeguards: {
    honor_provider_rules: true,
    rule_types: [
      'attachments_allowed',
      'word_limits',
      'required_custom_prompts'
    ],
    complaint_kill_switch: {
      enabled: true,
      threshold: 1,
      action: 'hard_block_immediately'
    },
    audit_trail: {
      provider_visible: true,
      fields: ['timestamp', 'fields_prefilled', 'student_confirmation_hash']
    }
  },
  
  accessibility: {
    wcag_version: '2.1',
    axe_scan_required: true,
    fail_build_on: ['Critical', 'Serious'],
    plain_language_explanations: true
  }
};

export interface StudentProfile {
  user_id: string;
  dob: Date;
  consent_state: 'granted' | 'pending' | 'denied' | 'Pending_Parent_Auth';
  is_minor: boolean;
}

export interface PrefillRequest {
  user_id: string;
  provider_id: string;
  scholarship_id: string;
  fields: Record<string, string>;
}

export function validateCoppaCompliance(profile: StudentProfile): {
  allowed: boolean;
  reason?: string;
  action?: string;
} {
  const config = ONE_CLICK_APPLY_CONFIG.data_privacy.coppa;
  
  const age = Math.floor((Date.now() - profile.dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  if (age < 13) {
    return {
      allowed: false,
      reason: 'User under 13 years old',
      action: config.under_13_action
    };
  }
  
  if (profile.consent_state === 'Pending_Parent_Auth' || profile.consent_state === 'pending') {
    return {
      allowed: false,
      reason: 'Parental consent pending',
      action: 'await_consent'
    };
  }
  
  if (profile.consent_state === 'denied') {
    return {
      allowed: false,
      reason: 'Consent denied',
      action: 'block_feature'
    };
  }
  
  return { allowed: true };
}

export function validateFerpaAccess(
  requesting_user_id: string,
  record_owner_id: string
): { allowed: boolean; status_code: number } {
  if (requesting_user_id !== record_owner_id) {
    return { allowed: false, status_code: 403 };
  }
  return { allowed: true, status_code: 200 };
}

export function validatePrefillFields(fields: string[]): {
  allowed: string[];
  blocked: string[];
} {
  const config = ONE_CLICK_APPLY_CONFIG.functional_constraints;
  const blocked: string[] = [];
  const allowed: string[] = [];
  
  const blockedPatterns = ['essay', 'statement', 'creative', 'personal_narrative'];
  
  for (const field of fields) {
    const isBlocked = blockedPatterns.some(pattern => 
      field.toLowerCase().includes(pattern)
    );
    
    if (isBlocked) {
      blocked.push(field);
    } else {
      allowed.push(field);
    }
  }
  
  return { allowed, blocked };
}

export function checkRateLimit(
  user_id: string,
  submissions_today: number,
  provider_limit?: number
): { allowed: boolean; remaining: number } {
  const config = ONE_CLICK_APPLY_CONFIG.functional_constraints.rate_limits;
  const limit = provider_limit ?? config.max_submissions_per_user_per_day;
  
  return {
    allowed: submissions_today < limit,
    remaining: Math.max(0, limit - submissions_today)
  };
}

export async function logOneClickEvent(
  event_type: string,
  data: { provider_id: string; outcome: string; [key: string]: unknown }
): Promise<void> {
  const sanitized = {
    event_id: `oca_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    provider_id: data.provider_id,
    outcome: data.outcome
  };
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: `one_click_apply_${event_type}`,
        app_id: 'A5',
        timestamp: sanitized.timestamp,
        data: sanitized
      })
    });
  } catch {
    console.log('[OneClickApply] Failed to log event');
  }
}

export async function logFerpaViolationAttempt(
  requesting_user_id: string,
  record_owner_id: string
): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'ferpa_violation_attempt',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          event_id: `ferpa_${Date.now()}`,
          outcome: 'blocked_403'
        }
      })
    });
  } catch {
    console.log('[OneClickApply] Failed to log FERPA violation');
  }
}
