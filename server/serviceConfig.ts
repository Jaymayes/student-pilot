import { env } from './environment';

export const serviceConfig = {
  services: {
    auth: env.AUTH_API_BASE_URL || 'https://scholar-auth-jamarrlmayes.replit.app',
    api: env.SCHOLARSHIP_API_BASE_URL || 'https://scholarship-api-jamarrlmayes.replit.app',
    sage: env.SAGE_API_BASE_URL || 'https://scholarship-sage-jamarrlmayes.replit.app',
    agent: env.AGENT_API_BASE_URL || 'https://scholarship-agent-jamarrlmayes.replit.app',
    comCenter: env.AUTO_COM_CENTER_BASE_URL || 'https://auto-com-center-jamarrlmayes.replit.app',
    pageMaker: env.AUTO_PAGE_MAKER_BASE_URL || 'https://auto-page-maker-jamarrlmayes.replit.app',
    studentPilot: env.STUDENT_PILOT_BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app',
    providerRegister: env.PROVIDER_REGISTER_BASE_URL || 'https://provider-register-jamarrlmayes.replit.app',
  },
  
  frontends: {
    student: env.STUDENT_PILOT_BASE_URL || 'https://student-pilot-jamarrlmayes.replit.app',
    provider: env.PROVIDER_REGISTER_BASE_URL || 'https://provider-register-jamarrlmayes.replit.app',
  },
  
  getCorsOrigins(): string[] {
    if (env.FRONTEND_ORIGINS) {
      return env.FRONTEND_ORIGINS.split(',').map(s => s.trim());
    }
    
    return Object.values(this.services).concat(Object.values(this.frontends));
  },
  
  getAllServiceUrls(): string[] {
    return [
      ...Object.values(this.services),
      ...Object.values(this.frontends)
    ];
  },
} as const;
