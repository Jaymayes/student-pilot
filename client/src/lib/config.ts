// Configuration for ScholarLink application
export const config = {
  billing: {
    portalUrl: import.meta.env.VITE_BILLING_PORTAL_URL || 'https://billing.scholarlink.app',
    linkEnabled: import.meta.env.VITE_BILLING_LINK_ENABLED !== 'false', // Default to true
  },
};

// Generate billing portal URL with tracking parameters
export function getBillingPortalUrl(source = 'nav', campaign = 'billing-link', userId?: string): string {
  const url = new URL(config.billing.portalUrl);
  
  // Add tracking parameters
  url.searchParams.set('utm_source', 'scholarlink-app');
  url.searchParams.set('utm_medium', source);
  url.searchParams.set('utm_campaign', campaign);
  
  // Add user correlation ID if available (non-PII)
  if (userId) {
    url.searchParams.set('userId', userId);
  }
  
  return url.toString();
}

// Check if billing features are enabled
export function isBillingEnabled(): boolean {
  return config.billing.linkEnabled;
}