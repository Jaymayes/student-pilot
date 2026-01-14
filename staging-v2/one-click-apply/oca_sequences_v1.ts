/**
 * One-Click Apply Sequences v1 (CEO Approved with Redlines)
 * 
 * Status: Ready for T-1 Dry Run
 * Canary: 5% → 10% (conditional on A6 green + legal sign-off)
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const OCA_CAMPAIGN_CONFIG = {
  version: '1.0.0',
  status: 'ready_for_t1_dry_run',
  
  campaigns: {
    student: {
      id: 'oca_canary_student_v1',
      traffic_percent: 0.10,
      canary_schedule: {
        phase_1: { percent: 0.05, duration_hours: 24, condition: 'clean' },
        phase_2: { percent: 0.10, condition: 'a6_green_legal_signoff' }
      }
    },
    provider: {
      id: 'oca_canary_provider_v1'
    }
  },
  
  ab_variants: {
    enabled: true,
    split: 0.50,
    subject_lines: {
      A: 'Apply to {{scholarship_name}} in seconds — you write the essay',
      B: 'Fast-Track your {{scholarship_name}} application (no AI essays, ever)'
    },
    cta_copy: {
      A: 'Review application',
      B: 'Open fast-track review'
    },
    success_gate: {
      ctr_lift: 0.10,
      submit_rate_lift: 0.05,
      no_increase_refunds: true,
      no_increase_complaints: true
    }
  },
  
  utm_tracking: {
    source: 'email',
    medium: 'oca_canary',
    campaign: '{{campaign_id}}',
    term: '{{cohort_id}}',
    content: '{{variant_id}}'
  },
  
  a8_attribution: {
    x_a8_cid: '{{a8_campaign_id}}',
    x_a8_eid: '{{event_id}}'
  }
};

export const STUDENT_EMAIL_SEQUENCE = {
  touch1: {
    timing: 'immediate',
    subject: {
      variant_a: 'Apply to {{scholarship_name}} in seconds — you write the essay',
      variant_b: 'Fast-Track your {{scholarship_name}} application (no AI essays, ever)'
    },
    body: `Hi {{first_name}},

You're eligible for **{{scholarship_name}}** ({{award_amount}}). Our One-Click Apply feature lets you submit in seconds.

**What we do:**
• We pre-fill administrative fields (contact, GPA, eligibility). You can edit before sending.
• We verify formatting and check deadlines so nothing gets rejected for technicalities.
• You stay in control—preview everything before it goes.

**What we won't do:**
• We will never write your essay. Not a sentence, not a paragraph, not ever.
• The essay you submit must be your own work.

**Next step:**
{{cta_button}}

Attach your essay (written by you), review your details, and submit. That's it.

— The Scholar AI Advisor Team

---
{{company_address}}
{{unsubscribe_link}} | {{preference_center_link}}`,
    cta: {
      variant_a: 'Review application',
      variant_b: 'Open fast-track review'
    },
    merge_fields: [
      'first_name',
      'scholarship_name',
      'award_amount',
      'cta_button',
      'company_address',
      'unsubscribe_link',
      'preference_center_link'
    ],
    utm: {
      base: 'utm_source=email&utm_medium=oca_canary&utm_campaign=oca_canary_student_v1',
      dynamic: '&utm_term={{cohort_id}}&utm_content={{variant_id}}',
      a8: '&x-a8-cid={{a8_campaign_id}}&x-a8-eid={{event_id}}'
    },
    compliance: {
      can_spam: true,
      casl: true,
      unsubscribe_required: true,
      company_address_required: true
    }
  }
};

export const IN_PRODUCT_MODAL = {
  header: 'One-Click Apply',
  subheader: 'Submit your application to {{scholarship_name}}',
  
  steps: [
    {
      id: 'doc_select',
      title: 'Attach your documents',
      description: 'Upload your essay and any required attachments.',
      telemetry_event: 'oca_doc_selected'
    },
    {
      id: 'review',
      title: 'Review pre-filled fields',
      description: 'We've filled in your contact info, GPA, and eligibility data. Edit anything that needs updating.',
      editable: true
    },
    {
      id: 'consent',
      title: 'Confirm and submit',
      checkboxes: [
        {
          id: 'integrity_checkbox',
          text: 'I wrote the attached essay myself and meet the eligibility criteria.',
          required: true,
          telemetry_event: 'oca_integrity_checked'
        },
        {
          id: 'consent_checkbox',
          text: 'I authorize submission of my profile data and attached documents to {{provider_name}}.',
          required: true,
          telemetry_event: 'oca_consent_checked'
        }
      ]
    }
  ],
  
  what_we_wont_do_link: {
    text: "What we won't do",
    action: 'opens_integrity_policy_panel',
    panel_content: `**Our Integrity Promise**

Scholar AI Advisor is an Editor and Coach—never a Ghostwriter.

We will NEVER:
• Write essays or personal statements for you
• Generate creative content on your behalf
• Complete unfinished work
• Paraphrase to circumvent plagiarism detection

We WILL:
• Pre-fill administrative data you've already provided
• Help you organize ideas and improve clarity
• Check structure and formatting
• Coach you on edits to YOUR writing

If you ask us to write for you, we'll decline and offer coaching instead.`
  },
  
  submit_button: {
    text: 'Submit application',
    telemetry_event: 'oca_submit_clicked'
  },
  
  telemetry_path: [
    'oca_modal_viewed',
    'oca_doc_selected',
    'oca_consent_checked',
    'oca_integrity_checked',
    'oca_submit_clicked',
    'oca_submit_result'
  ]
};

export const PROVIDER_EMAIL = {
  subject: 'New One-Click Apply submission for {{scholarship_name}}',
  body: `Hi {{provider_contact_name}},

A new application has been submitted via Scholar AI Advisor's One-Click Apply feature.

**Application Details:**
• Student: {{student_display_id}} (anonymized)
• Scholarship: {{scholarship_name}}
• Submitted: {{submission_timestamp}}

**Important:**
Submissions include a header: "Prepared via Scholar AI Advisor OCA — Admin data verified; essay attested by student."

This means:
• Administrative fields (contact, GPA, eligibility) were pre-filled from verified student data
• The student explicitly attested that the essay is their own original work
• The student reviewed all content before submission

**Review this application:**
{{review_link}}

**Your audit log:**
{{audit_log_link}} (filtered to OCA=true, includes Report Issue workflow)

If you have any concerns about this submission, use the "Report Issue" button in your dashboard. This will open a ticket and auto-disable OCA for investigation.

— Scholar AI Advisor Team`,
  merge_fields: [
    'provider_contact_name',
    'scholarship_name',
    'student_display_id',
    'submission_timestamp',
    'review_link',
    'audit_log_link'
  ]
};

export const PROVIDER_DASHBOARD_BANNER = {
  oca_indicator: {
    badge_text: 'One-Click Apply',
    tooltip: 'This application was submitted via Scholar AI Advisor OCA. Admin data verified; essay attested by student.'
  },
  
  report_issue_button: {
    text: 'Report Issue',
    microcopy: 'Opens ticket with auto-disable on submit; shows what will happen next.',
    action: 'open_issue_ticket',
    auto_disable_on_submit: true,
    telemetry_event: 'provider_issue_reported'
  },
  
  issue_modal: {
    header: 'Report an Issue with This Application',
    description: 'Reporting an issue will immediately pause One-Click Apply for investigation. Our team will review within 24 hours.',
    reason_options: [
      'Suspected plagiarism/AI-generated essay',
      'Incorrect eligibility data',
      'Missing required documents',
      'Other compliance concern'
    ],
    what_happens_next: [
      'One-Click Apply will be auto-disabled pending review',
      'You will receive confirmation within 2 hours',
      'Full investigation completed within 24 hours',
      'OCA only re-enabled after root cause addressed'
    ],
    submit_button: 'Submit Report'
  }
};

export const RUNTIME_REFUSAL_MESSAGE = 
  "I can't write or complete scholarship essays for you. I can help you organize your ideas, improve clarity, and check structure. Upload your draft and I'll coach you on edits.";

export function buildTrackingUrl(
  baseUrl: string,
  campaignId: string,
  cohortId: string,
  variantId: string,
  a8CampaignId: string,
  eventId: string
): string {
  const params = new URLSearchParams({
    utm_source: 'email',
    utm_medium: 'oca_canary',
    utm_campaign: campaignId,
    utm_term: cohortId,
    utm_content: variantId,
    'x-a8-cid': a8CampaignId,
    'x-a8-eid': eventId
  });
  
  return `${baseUrl}?${params.toString()}`;
}

export async function emitOcaEvent(
  event_type: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type,
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          ...data,
          campaign_id: OCA_CAMPAIGN_CONFIG.campaigns.student.id
        }
      })
    });
  } catch {
    console.log(`[OCA] Failed to emit ${event_type}`);
  }
}
