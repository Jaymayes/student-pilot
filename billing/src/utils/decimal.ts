// Decimal utility functions for precise credit calculations

import Decimal from 'decimal.js';
import { appConfig } from '@/config';

// Configure Decimal for financial calculations
Decimal.config({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -28,
  toExpPos: 28,
});

/**
 * Create a new Decimal instance from various input types
 */
export function decimal(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

/**
 * Convert USD cents to credits (1000 credits per dollar)
 */
export function usdCentsToCredits(cents: number): Decimal {
  return decimal(cents).dividedBy(100).times(1000);
}

/**
 * Convert credits to USD cents
 */
export function creditsToUsdCents(credits: Decimal): number {
  return credits.dividedBy(1000).times(100).toNumber();
}

/**
 * Calculate usage cost based on token counts and rates
 */
export function calculateUsageCost(
  inputTokens: number,
  outputTokens: number,
  inputRate: number,
  outputRate: number
): Decimal {
  const inputCost = decimal(inputTokens).dividedBy(1000).times(inputRate);
  const outputCost = decimal(outputTokens).dividedBy(1000).times(outputRate);
  
  const totalCost = inputCost.plus(outputCost);
  
  // Apply 4x markup as specified in requirements
  return totalCost.times(4);
}

/**
 * Apply rounding policy for display
 */
export function applyRoundingPolicy(amount: Decimal, mode: 'precise' | 'ceil'): Decimal {
  if (mode === 'ceil' && !amount.isInteger()) {
    return amount.ceil();
  }
  
  return amount;
}

/**
 * Format credits for display (2 decimal places)
 */
export function formatCreditsForDisplay(credits: Decimal): string {
  return credits.toFixed(2);
}

/**
 * Format USD amount for display
 */
export function formatUsdForDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Validate that a decimal string represents a valid credit amount
 */
export function isValidCreditAmount(value: string): boolean {
  try {
    const amount = new Decimal(value);
    
    // Must be finite and not NaN
    if (!amount.isFinite()) return false;
    
    // Must not be negative
    if (amount.isNegative()) return false;
    
    // Must have reasonable precision (max 18 decimal places)
    if (amount.decimalPlaces() > 18) return false;
    
    // Must be within reasonable bounds (max 1 trillion credits)
    if (amount.greaterThan('1000000000000')) return false;
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Safely parse a decimal string
 */
export function parseDecimal(value: string): Decimal | null {
  try {
    if (!isValidCreditAmount(value)) {
      return null;
    }
    
    return new Decimal(value);
  } catch (error) {
    return null;
  }
}

/**
 * Calculate percentage bonus
 */
export function calculateBonus(amount: Decimal, bonusPercentage: number): Decimal {
  const bonus = amount.times(bonusPercentage).dividedBy(100);
  return amount.plus(bonus);
}

/**
 * Check if user has sufficient credits for an operation
 */
export function hasSufficientCredits(
  available: Decimal,
  required: Decimal
): boolean {
  return available.greaterThanOrEqualTo(required);
}

/**
 * Calculate credit shortfall
 */
export function calculateShortfall(
  available: Decimal,
  required: Decimal
): Decimal {
  const shortfall = required.minus(available);
  return shortfall.isPositive() ? shortfall : decimal(0);
}

/**
 * Aggregate multiple decimal values
 */
export function sumDecimals(values: Decimal[]): Decimal {
  return values.reduce((sum, value) => sum.plus(value), decimal(0));
}

/**
 * Convert Decimal to database-safe string
 */
export function toDbString(value: Decimal): string {
  return value.toString();
}

/**
 * Convert database string to Decimal
 */
export function fromDbString(value: string): Decimal {
  return new Decimal(value);
}

/**
 * Validate and normalize credit input from API
 */
export function normalizeCreditsFromAPI(input: string | number): Decimal | null {
  try {
    const value = typeof input === 'string' ? input : input.toString();
    
    if (!isValidCreditAmount(value)) {
      return null;
    }
    
    return new Decimal(value);
  } catch (error) {
    return null;
  }
}

/**
 * Create zero decimal
 */
export function zero(): Decimal {
  return new Decimal(0);
}

/**
 * Check if decimal is zero
 */
export function isZero(value: Decimal): boolean {
  return value.equals(0);
}

/**
 * Get minimum credit amount for operations
 */
export function getMinimumCreditAmount(): Decimal {
  return new Decimal('0.001'); // 0.001 credits minimum
}