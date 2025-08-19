// Decimal utility functions for precise credit calculations

import { Decimal } from 'decimal.js';
import { appConfig } from '@/config';

// Configure Decimal.js for precise financial calculations
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9e15,
  toExpPos: 9e15,
});

/**
 * Create a Decimal from a number or string with validation
 */
export function createDecimal(value: number | string | Decimal): Decimal {
  try {
    const decimal = new Decimal(value);
    if (!decimal.isFinite()) {
      throw new Error(`Invalid decimal value: ${value}`);
    }
    return decimal;
  } catch (error) {
    throw new Error(`Failed to create decimal from ${value}: ${error}`);
  }
}

/**
 * Convert USD cents to credits (1000 credits = $1.00)
 */
export function usdCentsToCredits(usdCents: number): Decimal {
  return createDecimal(usdCents).div(100).mul(1000);
}

/**
 * Convert credits to USD cents
 */
export function creditsToUsdCents(credits: Decimal): number {
  return credits.div(1000).mul(100).toNumber();
}

/**
 * Calculate usage cost in credits with 4x markup
 */
export function calculateUsageCost(
  inputTokens: number,
  outputTokens: number,
  inputRatePer1k: number,
  outputRatePer1k: number
): Decimal {
  const inputCost = createDecimal(inputTokens)
    .div(1000)
    .mul(inputRatePer1k);
    
  const outputCost = createDecimal(outputTokens)
    .div(1000)
    .mul(outputRatePer1k);
    
  const totalCost = inputCost.add(outputCost);
  
  // Apply 4x markup
  const markedUpCost = totalCost.mul(4);
  
  return markedUpCost;
}

/**
 * Apply rounding policy based on configuration
 */
export function applyRounding(amount: Decimal): Decimal {
  if (appConfig.BILLING_ROUNDING_MODE === 'ceil') {
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
 * Format credits for storage/API (full precision)
 */
export function formatCreditsForStorage(credits: Decimal): string {
  return credits.toString();
}

/**
 * Validate that a decimal is positive
 */
export function validatePositiveDecimal(value: Decimal, fieldName: string): void {
  if (value.isNegative() || value.isZero()) {
    throw new Error(`${fieldName} must be positive`);
  }
}

/**
 * Compare decimals safely (timing-safe for security-sensitive operations)
 */
export function timingSafeDecimalCompare(a: Decimal, b: Decimal): boolean {
  const aStr = a.toString().padEnd(50, '0');
  const bStr = b.toString().padEnd(50, '0');
  
  let result = 0;
  for (let i = 0; i < Math.max(aStr.length, bStr.length); i++) {
    result |= (aStr.charCodeAt(i) || 0) ^ (bStr.charCodeAt(i) || 0);
  }
  
  return result === 0;
}

/**
 * Add two decimals with overflow protection
 */
export function safeAdd(a: Decimal, b: Decimal): Decimal {
  const result = a.add(b);
  
  // Check for reasonable bounds (prevent overflow)
  if (result.gt(new Decimal('1e15'))) {
    throw new Error('Calculation overflow detected');
  }
  
  return result;
}

/**
 * Subtract two decimals with underflow protection
 */
export function safeSubtract(a: Decimal, b: Decimal): Decimal {
  const result = a.sub(b);
  
  // Prevent negative balances in most contexts
  if (result.isNegative()) {
    throw new Error('Insufficient balance for operation');
  }
  
  return result;
}