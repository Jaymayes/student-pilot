import { env } from './environment';

export const serviceConfig = {
  services: {
    auth: env.AUTH_API_BASE_URL,
    api: env.SCHOLARSHIP_API_BASE_URL,
    sage: env.SAGE_API_BASE_URL,
    agent: env.AGENT_API_BASE_URL,
    comCenter: env.AUTO_COM_CENTER_BASE_URL,
    pageMaker: env.AUTO_PAGE_MAKER_BASE_URL,
    studentPilot: env.STUDENT_PILOT_BASE_URL,
    providerRegister: env.PROVIDER_REGISTER_BASE_URL,
  },
  
  frontends: {
    student: env.STUDENT_PILOT_BASE_URL,
    provider: env.PROVIDER_REGISTER_BASE_URL,
  },
  
  getCorsOrigins(): string[] {
    if (env.FRONTEND_ORIGINS) {
      return env.FRONTEND_ORIGINS.split(',').map(s => s.trim());
    }
    
    return Object.values(this.services).concat(Object.values(this.frontends)).filter((url): url is string => url !== undefined);
  },
  
  getAllServiceUrls(): string[] {
    return [
      ...Object.values(this.services),
      ...Object.values(this.frontends)
    ].filter((url): url is string => url !== undefined);
  },
  
  getConnectSrcAllowlist(): string[] {
    return [
      "'self'",
      ...this.getAllServiceUrls(),
      "https://api.stripe.com"
    ];
  },
} as const;
