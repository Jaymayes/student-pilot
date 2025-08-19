// Rate card service for managing pricing and model rates

import { prisma } from './database';
import { RateCardConfig, ModelRate } from '@/types';
import { appConfig, RATE_CARD_V1 } from '@/config';
import pino from 'pino';

const logger = pino({ name: 'rate-card-service' });

// In-memory cache for active rate card
let cachedRateCard: { version: string; config: RateCardConfig } | null = null;

/**
 * Get active rate card (cached)
 */
export async function getActiveRateCard(): Promise<{ version: string; config: RateCardConfig }> {
  // Return from cache if available
  if (cachedRateCard) {
    return cachedRateCard;
  }

  // Fetch from database
  const rateCard = await prisma.rateCard.findFirst({
    orderBy: { activeFrom: 'desc' },
    where: {
      activeFrom: {
        lte: new Date(),
      },
    },
  });

  if (!rateCard) {
    // Fallback to default rate card
    logger.warn('No rate card found in database, using default');
    cachedRateCard = {
      version: appConfig.RATE_CARD_VERSION,
      config: RATE_CARD_V1,
    };
  } else {
    cachedRateCard = {
      version: rateCard.version,
      config: rateCard.config as RateCardConfig,
    };
  }

  return cachedRateCard;
}

/**
 * Get specific rate card by version
 */
export async function getRateCard(version: string) {
  const rateCard = await prisma.rateCard.findUnique({
    where: { version },
  });
  
  return rateCard;
}

/**
 * Create new rate card version
 */
export async function createRateCard(version: string, config: RateCardConfig) {
  return await prisma.rateCard.create({
    data: {
      version,
      config: config as any,
    },
  });
}

/**
 * Ensure rate card exists (for startup)
 */
export async function ensureRateCardExists() {
  const existing = await getRateCard(appConfig.RATE_CARD_VERSION);
  if (!existing) {
    logger.info('Creating default rate card');
    await createRateCard(appConfig.RATE_CARD_VERSION, RATE_CARD_V1);
  }
}

/**
 * Get model rates for a specific model
 */
export async function getModelRates(model: string): Promise<ModelRate> {
  const { config } = await getActiveRateCard();
  
  const modelRate = config.models[model];
  if (!modelRate) {
    throw new Error(`Model ${model} not found in rate card`);
  }

  return modelRate;
}

/**
 * Validate that a model exists in the rate card
 */
export async function validateModel(model: string): Promise<boolean> {
  try {
    await getModelRates(model);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all available models
 */
export async function getAvailableModels(): Promise<string[]> {
  const { config } = await getActiveRateCard();
  return Object.keys(config.models);
}

/**
 * Create new rate card version (admin only)
 */
export async function createRateCardVersion(
  version: string,
  config: RateCardConfig,
  activeFrom?: Date
): Promise<void> {
  try {
    // Validate config structure
    validateRateCardConfig(config);

    const rateCard = await prisma.rateCard.create({
      data: {
        version,
        config: config as any,
        activeFrom: activeFrom || new Date(),
      },
    });

    // Clear cache to force reload
    cachedRateCard = null;

    logger.info(
      { version, activeFrom: rateCard.activeFrom },
      'Created new rate card version'
    );
  } catch (error) {
    logger.error({ error, version }, 'Failed to create rate card version');
    throw error;
  }
}

/**
 * Validate rate card configuration
 */
function validateRateCardConfig(config: RateCardConfig): void {
  if (!config.currency || typeof config.currency !== 'string') {
    throw new Error('Rate card must have a valid currency');
  }

  if (!config.creditPerDollar || typeof config.creditPerDollar !== 'number' || config.creditPerDollar <= 0) {
    throw new Error('Rate card must have a valid creditPerDollar');
  }

  if (!['precise', 'ceil'].includes(config.rounding)) {
    throw new Error('Rate card rounding must be "precise" or "ceil"');
  }

  if (!config.models || typeof config.models !== 'object') {
    throw new Error('Rate card must have models configuration');
  }

  // Validate each model
  for (const [modelName, rates] of Object.entries(config.models)) {
    if (!rates.inputPer1k || typeof rates.inputPer1k !== 'number' || rates.inputPer1k < 0) {
      throw new Error(`Model ${modelName} must have valid inputPer1k rate`);
    }

    if (!rates.outputPer1k || typeof rates.outputPer1k !== 'number' || rates.outputPer1k < 0) {
      throw new Error(`Model ${modelName} must have valid outputPer1k rate`);
    }
  }
}

/**
 * Get rate card history
 */
export async function getRateCardHistory(): Promise<Array<{
  version: string;
  activeFrom: Date;
  createdAt: Date;
}>> {
  const rateCards = await prisma.rateCard.findMany({
    select: {
      version: true,
      activeFrom: true,
      createdAt: true,
    },
    orderBy: { activeFrom: 'desc' },
  });

  return rateCards;
}

/**
 * Initialize rate card (run on startup)
 */
export async function initializeRateCard(): Promise<void> {
  try {
    const existingRateCard = await prisma.rateCard.findFirst();
    
    if (!existingRateCard) {
      // Create default rate card
      await createRateCardVersion('v1', RATE_CARD_V1);
      logger.info('Created default rate card v1');
    }

    // Load into cache
    await getActiveRateCard();
    logger.info('Rate card service initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize rate card service');
    throw error;
  }
}