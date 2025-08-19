// Configuration for ScholarLink Billing Service

import { RateCardConfig, CreditPackage, ConfigValidation } from '@/types';

// Environment variables with defaults and validation
export const appConfig = {
  // Server configuration
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/billing',

  // JWT Authentication configuration
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY || '',
  JWT_ISSUER: process.env.JWT_ISSUER || 'https://student-pilot.replit.app',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'https://billing.student-pilot.replit.app',

  // Stripe configuration
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100, // per window

  // Monitoring and logging
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Rate card version
  RATE_CARD_VERSION: 'v1.0',

  // Credit configuration
  CREDIT_PER_DOLLAR: 1000,
  DEFAULT_CURRENCY: 'USD',
};

// Rate Card V1 - OpenAI pricing with 4x markup
export const RATE_CARD_V1: RateCardConfig = {
  currency: 'USD',
  creditPerDollar: 1000,
  rounding: 'precise',
  models: {
    // GPT-4o models
    'gpt-4o': {
      inputPer1k: 20, // $0.005 * 4x markup = $0.02 per 1k = 20 credits
      outputPer1k: 60, // $0.015 * 4x markup = $0.06 per 1k = 60 credits
    },
    'gpt-4o-mini': {
      inputPer1k: 0.6, // $0.00015 * 4x markup = $0.0006 per 1k = 0.6 credits
      outputPer1k: 2.4, // $0.0006 * 4x markup = $0.0024 per 1k = 2.4 credits
    },
    // GPT-4 Turbo models
    'gpt-4-turbo': {
      inputPer1k: 40, // $0.01 * 4x markup = $0.04 per 1k = 40 credits
      outputPer1k: 120, // $0.03 * 4x markup = $0.12 per 1k = 120 credits
    },
    // GPT-3.5 Turbo models
    'gpt-3.5-turbo': {
      inputPer1k: 2, // $0.0005 * 4x markup = $0.002 per 1k = 2 credits
      outputPer1k: 6, // $0.0015 * 4x markup = $0.006 per 1k = 6 credits
    },
    // Embedding models
    'text-embedding-3-large': {
      inputPer1k: 0.52, // $0.00013 * 4x markup = $0.00052 per 1k = 0.52 credits
      outputPer1k: 0, // No output tokens for embeddings
    },
    'text-embedding-3-small': {
      inputPer1k: 0.08, // $0.00002 * 4x markup = $0.00008 per 1k = 0.08 credits
      outputPer1k: 0, // No output tokens for embeddings
    },
    // Vision models (same as gpt-4o for simplicity)
    'gpt-4o-vision': {
      inputPer1k: 20,
      outputPer1k: 60,
    },
  },
};

// Credit packages with progressive bonuses
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    code: 'starter',
    name: 'Starter Pack',
    usdCents: 500, // $5.00
    credits: 5000, // 5,000 credits
  },
  {
    code: 'standard',
    name: 'Standard Pack',
    usdCents: 1000, // $10.00
    credits: 10500, // 10,500 credits (5% bonus)
    bonusPercentage: 5,
  },
  {
    code: 'premium',
    name: 'Premium Pack',
    usdCents: 2500, // $25.00
    credits: 27500, // 27,500 credits (10% bonus)
    bonusPercentage: 10,
  },
  {
    code: 'professional',
    name: 'Professional Pack',
    usdCents: 5000, // $50.00
    credits: 57500, // 57,500 credits (15% bonus)
    bonusPercentage: 15,
  },
  {
    code: 'enterprise',
    name: 'Enterprise Pack',
    usdCents: 10000, // $100.00
    credits: 120000, // 120,000 credits (20% bonus)
    bonusPercentage: 20,
  },
];

/**
 * Validate configuration on startup
 */
export function validateConfig(): ConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Database validation
  if (!appConfig.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  // JWT validation for production
  if (appConfig.isProduction) {
    if (!appConfig.JWT_PUBLIC_KEY) {
      errors.push('JWT_PUBLIC_KEY is required in production');
    }
    
    if (!appConfig.JWT_ISSUER) {
      errors.push('JWT_ISSUER is required in production');
    }
    
    if (!appConfig.JWT_AUDIENCE) {
      errors.push('JWT_AUDIENCE is required in production');
    }
  }

  // Stripe validation
  if (!appConfig.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY not set - credit purchases disabled');
  }

  if (!appConfig.STRIPE_WEBHOOK_SECRET && appConfig.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_WEBHOOK_SECRET not set - webhook validation disabled');
  }

  // Port validation
  if (appConfig.PORT < 1 || appConfig.PORT > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get configuration summary for health checks
 */
export function getConfigSummary() {
  return {
    environment: appConfig.NODE_ENV,
    port: appConfig.PORT,
    rateCardVersion: appConfig.RATE_CARD_VERSION,
    stripeEnabled: !!appConfig.STRIPE_SECRET_KEY,
    jwtConfigured: !!appConfig.JWT_PUBLIC_KEY,
  };
}

/**
 * Log configuration warnings and errors
 */
export function logConfigStatus() {
  const validation = validateConfig();
  
  if (validation.warnings.length > 0) {
    console.warn('Configuration warnings:', validation.warnings);
  }
  
  if (validation.errors.length > 0) {
    console.error('Configuration errors:', validation.errors);
    throw new Error('Invalid configuration - see errors above');
  }
  
  console.log('Configuration validated successfully');
  console.log('Config summary:', getConfigSummary());
}