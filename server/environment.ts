import { z } from "zod";

// Environment validation schema
const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['production', 'staging', 'development']).default('development'),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  
  // Authentication
  SESSION_SECRET: z.string().min(32),
  REPLIT_DOMAINS: z.string().min(1),
  REPL_ID: z.string().min(1),
  ISSUER_URL: z.string().url().optional(),
  
  // Third-party services
  OPENAI_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().regex(/^(sk_|rk_)/),
  VITE_STRIPE_PUBLIC_KEY: z.string().regex(/^pk_/).optional(),
  
  // Stripe TEST keys for development/testing (required in development)
  USE_STRIPE_TEST_KEYS: z.string().optional().default('true'),
  TESTING_STRIPE_SECRET_KEY: z.string().regex(/^(sk_test_|rk_test_)/),
  TESTING_VITE_STRIPE_PUBLIC_KEY: z.string().regex(/^pk_test_/),
  
  // Object storage
  DEFAULT_OBJECT_STORAGE_BUCKET_ID: z.string().optional(),
  PRIVATE_OBJECT_DIR: z.string().optional(),
  PUBLIC_OBJECT_SEARCH_PATHS: z.string().optional(),
  
  // Agent Bridge
  COMMAND_CENTER_URL: z.string().url().optional(),
  SHARED_SECRET: z.string().min(32).optional(), // Enforce minimum length for security
  AGENT_NAME: z.string().min(1).optional(),
  AGENT_ID: z.string().min(1).optional(),
  AGENT_BASE_URL: z.string().url().optional(),
  REPL_SLUG: z.string().optional(),
  REPL_OWNER: z.string().optional(),
  
  // Database connection
  PGDATABASE: z.string().optional(),
  PGHOST: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGPORT: z.coerce.number().optional(),
  PGUSER: z.string().optional(),
});

// Validate and export environment variables
let env: z.infer<typeof EnvironmentSchema>;

try {
  env = EnvironmentSchema.parse(process.env);
  console.log('✅ Environment validation passed');
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export { env };

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

// Helper to get appropriate Stripe keys based on environment
export function getStripeKeys() {
  // Force TEST keys in development environment for security
  const useTestKeys = env.USE_STRIPE_TEST_KEYS === 'true' || isDevelopment;
  
  if (useTestKeys) {
    if (!env.TESTING_STRIPE_SECRET_KEY || !env.TESTING_VITE_STRIPE_PUBLIC_KEY) {
      throw new Error('TEST Stripe keys are required in development environment');
    }
    return {
      secretKey: env.TESTING_STRIPE_SECRET_KEY,
      publicKey: env.TESTING_VITE_STRIPE_PUBLIC_KEY,
      isTestMode: true
    };
  }
  
  // Production mode - use LIVE keys
  return {
    secretKey: env.STRIPE_SECRET_KEY,
    publicKey: env.VITE_STRIPE_PUBLIC_KEY,
    isTestMode: false
  };
}

// Safe environment variable access
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Redact sensitive values for logging
export function redactSecrets(obj: any): any {
  const redacted = { ...obj };
  const sensitiveKeys = [
    'password', 'secret', 'key', 'token', 'auth', 'credential',
    'DATABASE_URL', 'OPENAI_API_KEY', 'STRIPE_SECRET_KEY', 
    'SESSION_SECRET', 'SHARED_SECRET'
  ];
  
  Object.keys(redacted).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      redacted[key] = '[REDACTED]';
    }
  });
  
  return redacted;
}