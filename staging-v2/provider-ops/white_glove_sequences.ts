/**
 * White-Glove Provider Outreach Sequences
 * 
 * 48h Sprint: Close +3 providers, +6 listings
 * Target: Checkout-abandoning providers
 */

const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';

export const OUTREACH_CONFIG = {
  sprint_duration_hours: 48,
  targets: {
    new_providers: 3,
    net_listings: 6
  },
  success_metrics: {
    outreach_to_reply: 0.25,
    reply_to_listing: 0.60
  },
  incentives: {
    free_listing_setup: true,
    free_formatting: true,
    priority_placement_first_cycle: true,
    provider_fee: '3%'
  },
  sla: {
    turnaround_hours: 48,
    edits_included: 1
  }
};

export const EMAIL_SEQUENCES = {
  touch1: {
    timing: 'immediate',
    subject_options: [
      "Ready to publish your scholarships? We'll finish the setup for you.",
      "We saved your draft—want our team to publish it in 24–48 hours?",
      "Quick assist to go live: we'll convert your draft into a complete listing."
    ],
    body: `Hi {{FirstName}},

You started setting up {{OrgName}}'s scholarship on Scholar AI Advisor but didn't complete checkout. We can finish it for you this week.

What we'll do (no extra cost):

• Convert your draft into a complete listing (eligibility, rubric, deadlines, payout info)
• Set up verification and formatting to our student-facing standard
• Publish and monitor quality; you review before it goes live

Why now:

• Student demand is peaking and our traffic is predominantly organic/SEO-led, which means high-intent applicants at low operational cost.
• Our platform enforces Responsible AI and privacy-by-default for students; we never facilitate academic dishonesty and maintain strict COPPA/FERPA posture.

Quick next step:
Reply "YES" and share a link to the prior draft (or attach your PDF/brief). Prefer a call? Grab a 15-min slot here: {{BookingLink}}.

We'll deliver a ready-to-publish listing in 24–48 hours and keep your standard 3% provider platform fee model.

Thanks,
{{AE_Name}}
Scholar AI Advisor | www.scholaraiadvisor.com

P.S. Have multiple scholarships? We'll batch them—send everything once and we'll return formatted listings for your approval.`,
    merge_fields: ['FirstName', 'OrgName', 'BookingLink', 'AE_Name'],
    utm: {
      source: 'email',
      medium: 'outreach',
      campaign: 'white_glove_sprint_jan26'
    }
  },
  
  touch2: {
    timing: '48h',
    subject: "Quick follow-up: Ready to publish {{OrgName}}'s scholarship?",
    body: `Hi {{FirstName}} — still happy to convert your draft and publish this week. One reply with the PDF/brief and we'll take it from there.

{{AE_Name}}
Scholar AI Advisor`,
    merge_fields: ['FirstName', 'OrgName', 'AE_Name'],
    utm: {
      source: 'email',
      medium: 'outreach',
      campaign: 'white_glove_sprint_jan26_t2'
    }
  },
  
  touch3: {
    timing: 'day_5',
    subject: "Last chance to publish before weekend traffic",
    body: `Last nudge to publish {{OrgName}}'s scholarship before weekend traffic. Reply YES and we'll white-glove it.

{{AE_Name}}
Scholar AI Advisor`,
    merge_fields: ['FirstName', 'OrgName', 'AE_Name'],
    utm: {
      source: 'email',
      medium: 'outreach',
      campaign: 'white_glove_sprint_jan26_t3'
    }
  }
};

export interface OutreachTracker {
  provider_id: string;
  org_name: string;
  contact_email: string;
  first_name: string;
  sequence_status: 'touch1_sent' | 'touch2_sent' | 'touch3_sent' | 'replied' | 'converted' | 'declined';
  touch1_sent_at: string | null;
  touch2_sent_at: string | null;
  touch3_sent_at: string | null;
  replied_at: string | null;
  listing_created_at: string | null;
}

export interface SprintMetrics {
  total_outreach: number;
  replies: number;
  conversions: number;
  listings_created: number;
  reply_rate: number;
  conversion_rate: number;
}

export function calculateSprintMetrics(trackers: OutreachTracker[]): SprintMetrics {
  const replies = trackers.filter(t => t.replied_at !== null).length;
  const conversions = trackers.filter(t => t.sequence_status === 'converted').length;
  const listings = trackers.filter(t => t.listing_created_at !== null).length;
  
  return {
    total_outreach: trackers.length,
    replies,
    conversions,
    listings_created: listings,
    reply_rate: trackers.length > 0 ? replies / trackers.length : 0,
    conversion_rate: replies > 0 ? conversions / replies : 0
  };
}

export function evaluateSprintSuccess(metrics: SprintMetrics): {
  success: boolean;
  gaps: string[];
} {
  const gaps: string[] = [];
  
  if (metrics.reply_rate < OUTREACH_CONFIG.success_metrics.outreach_to_reply) {
    gaps.push(`Reply rate ${(metrics.reply_rate * 100).toFixed(1)}% < ${(OUTREACH_CONFIG.success_metrics.outreach_to_reply * 100)}% target`);
  }
  
  if (metrics.conversion_rate < OUTREACH_CONFIG.success_metrics.reply_to_listing) {
    gaps.push(`Conversion rate ${(metrics.conversion_rate * 100).toFixed(1)}% < ${(OUTREACH_CONFIG.success_metrics.reply_to_listing * 100)}% target`);
  }
  
  if (metrics.conversions < OUTREACH_CONFIG.targets.new_providers) {
    gaps.push(`Providers ${metrics.conversions} < ${OUTREACH_CONFIG.targets.new_providers} target`);
  }
  
  if (metrics.listings_created < OUTREACH_CONFIG.targets.net_listings) {
    gaps.push(`Listings ${metrics.listings_created} < ${OUTREACH_CONFIG.targets.net_listings} target`);
  }
  
  return {
    success: gaps.length === 0,
    gaps
  };
}

export function generateSequenceTemplate(touch: keyof typeof EMAIL_SEQUENCES): string {
  const seq = EMAIL_SEQUENCES[touch];
  
  let template = `## ${touch.toUpperCase()}\n\n`;
  template += `**Timing:** ${seq.timing}\n`;
  
  if ('subject_options' in seq) {
    template += `**Subject Options:**\n`;
    for (const subj of seq.subject_options) {
      template += `- ${subj}\n`;
    }
  } else {
    template += `**Subject:** ${seq.subject}\n`;
  }
  
  template += `\n**Body:**\n\`\`\`\n${seq.body}\n\`\`\`\n`;
  template += `\n**Merge Fields:** ${seq.merge_fields.join(', ')}\n`;
  template += `**UTM:** source=${seq.utm.source}, medium=${seq.utm.medium}, campaign=${seq.utm.campaign}\n`;
  
  return template;
}

export async function emitOutreachEvent(
  action: 'sent' | 'replied' | 'converted',
  tracker: OutreachTracker
): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: `provider_outreach_${action}`,
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: {
          provider_id: tracker.provider_id,
          org_name: tracker.org_name,
          status: tracker.sequence_status
        }
      })
    });
  } catch {
    console.log('[Outreach] Failed to emit event');
  }
}

export async function emitSprintProgress(metrics: SprintMetrics): Promise<void> {
  const evaluation = evaluateSprintSuccess(metrics);
  
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'white_glove_sprint_progress',
        app_id: 'A5',
        timestamp: new Date().toISOString(),
        data: { metrics, evaluation, targets: OUTREACH_CONFIG.targets }
      })
    });
  } catch {
    console.log('[Outreach] Failed to emit sprint progress');
  }
}
