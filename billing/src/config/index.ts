// Configuration for ScholarLink Billing Service

import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

// Configuration schema
const configSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  
  // Database
  DATABASE_URL: z.string().default('file:./dev.db'),
  
  // JWT
  JWT_PUBLIC_KEY: z.string(),
  JWT_ISSUER: z.string().default('https://scholarlink.app'),
  JWT_AUDIENCE: z.string().default('billing-api'),
  
  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Billing
  BILLING_ROUNDING_MODE: z.enum(['precise', 'ceil']).default('precise'),
  RATE_CARD_VERSION: z.string().default('v1'),
  
  // Security
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  
  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

// Validate and export configuration
const envVars = configSchema.parse(process.env);

export const appConfig = {
  ...envVars,
  corsAllowedOrigins: envVars.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()),
  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',
};

// Credit packages configuration
export const CREDIT_PACKAGES = [
  {
    code: 'starter',
    name: 'Starter',
    usdCents: 500, // $5.00
    credits: 5000,
  },
  {
    code: 'basic',
    name: 'Basic',
    usdCents: 2000, // $20.00
    credits: 20000,
  },
  {
    code: 'pro',
    name: 'Pro',
    usdCents: 5000, // $50.00
    credits: 52500,
    bonusPercentage: 5,
  },
  {
    code: 'business',
    name: 'Business',
    usdCents: 10000, // $100.00
    credits: 110000,
    bonusPercentage: 10,
  },
] as const;

// Rate card v1 configuration
export const RATE_CARD_V1 = {
  currency: 'USD',
  creditPerDollar: 1000,
  rounding: 'precise' as const,
  models: {
    'gpt-5-nano': { inputPer1k: 0.2, outputPer1k: 1.6 },
    'gpt-5-mini': { inputPer1k: 1.0, outputPer1k: 8.0 },
    'gpt-4o-mini': { inputPer1k: 2.4, outputPer1k: 9.6 },
    'gpt-5': { inputPer1k: 5.0, outputPer1k: 40.0 },
    'gpt-4o': { inputPer1k: 20.0, outputPer1k: 80.0 },
  },
};

export type AppConfig = typeof appConfig;