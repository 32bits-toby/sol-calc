/**
 * SolCalc Decimal Propagation
 *
 * This module handles decimal scale propagation through arithmetic operations.
 * This is the core logic that makes mixed-decimal arithmetic mechanically correct.
 *
 * Rules:
 * - Multiplication: decimals add
 * - Division: decimals subtract
 * - Addition/Subtraction: decimals must match exactly
 */

import { DecimalMismatchError } from '../types.js';

/**
 * Calculates the resulting decimals for a multiplication operation.
 *
 * Rule: decimals add
 *
 * Examples:
 * - (18 decimals) * (6 decimals) = 24 decimals
 * - (0 decimals) * (18 decimals) = 18 decimals
 *
 * @param leftDecimals - Decimals of the left operand
 * @param rightDecimals - Decimals of the right operand
 * @returns Resulting decimals
 */
export function multiplyDecimals(leftDecimals: number, rightDecimals: number): number {
  return leftDecimals + rightDecimals;
}

/**
 * Calculates the resulting decimals for a division operation.
 *
 * Rule: decimals subtract
 *
 * Examples:
 * - (18 decimals) / (18 decimals) = 0 decimals
 * - (24 decimals) / (6 decimals) = 18 decimals
 * - (6 decimals) / (18 decimals) = -12 decimals (allowed)
 *
 * Note: Negative decimals are allowed in intermediate results.
 * This represents fractional scaling and is mathematically valid.
 *
 * @param leftDecimals - Decimals of the left operand (dividend)
 * @param rightDecimals - Decimals of the right operand (divisor)
 * @returns Resulting decimals
 */
export function divideDecimals(leftDecimals: number, rightDecimals: number): number {
  return leftDecimals - rightDecimals;
}

/**
 * Validates that decimals match for addition operation.
 *
 * Rule: decimals must be exactly equal
 *
 * Addition only makes sense when values have the same scale.
 * You cannot add 1 WAD (18 decimals) to 1 USDC (6 decimals) without
 * explicit conversion.
 *
 * @param leftDecimals - Decimals of the left operand
 * @param rightDecimals - Decimals of the right operand
 * @returns The common decimals if they match
 * @throws DecimalMismatchError if decimals don't match
 */
export function addDecimals(leftDecimals: number, rightDecimals: number): number {
  if (leftDecimals !== rightDecimals) {
    throw new DecimalMismatchError(leftDecimals, rightDecimals, '+');
  }
  return leftDecimals;
}

/**
 * Validates that decimals match for subtraction operation.
 *
 * Rule: decimals must be exactly equal
 *
 * Subtraction only makes sense when values have the same scale.
 *
 * @param leftDecimals - Decimals of the left operand
 * @param rightDecimals - Decimals of the right operand
 * @returns The common decimals if they match
 * @throws DecimalMismatchError if decimals don't match
 */
export function subtractDecimals(leftDecimals: number, rightDecimals: number): number {
  if (leftDecimals !== rightDecimals) {
    throw new DecimalMismatchError(leftDecimals, rightDecimals, '-');
  }
  return leftDecimals;
}

/**
 * Formats a bigint value with its decimals into a human-readable string.
 *
 * Examples:
 * - value=1500000000000000000n, decimals=18 → "1.5"
 * - value=1000000n, decimals=6 → "1.0"
 * - value=1234n, decimals=2 → "12.34"
 * - value=1n, decimals=0 → "1"
 * - value=1n, decimals=-2 → "100" (negative decimals: multiply)
 *
 * @param value - The bigint value
 * @param decimals - Number of decimal places
 * @returns Human-readable decimal string
 */
export function formatWithDecimals(value: bigint, decimals: number): string {
  // Handle negative decimals (multiply by 10^|decimals|)
  if (decimals < 0) {
    const multiplier = 10n ** BigInt(-decimals);
    return (value * multiplier).toString();
  }

  // Handle zero decimals
  if (decimals === 0) {
    return value.toString();
  }

  // Handle positive decimals
  const isNegative = value < 0n;
  const absValue = isNegative ? -value : value;
  const valueStr = absValue.toString();

  // Pad with leading zeros if needed
  const paddedValue = valueStr.padStart(decimals + 1, '0');

  // Split into integer and decimal parts
  const integerPart = paddedValue.slice(0, -decimals) || '0';
  const decimalPart = paddedValue.slice(-decimals);

  const result = `${integerPart}.${decimalPart}`;
  return isNegative ? `-${result}` : result;
}

/**
 * Scales a value to a target number of decimals.
 *
 * This is used when you need to convert a value from one decimal scale to another.
 *
 * Examples:
 * - scaleToDecimals(1000000n, 6, 18) → 1000000000000000000n
 * - scaleToDecimals(1000000000000000000n, 18, 6) → 1000000n
 *
 * @param value - The value to scale
 * @param fromDecimals - Current decimal scale
 * @param toDecimals - Target decimal scale
 * @returns Scaled value
 */
export function scaleToDecimals(
  value: bigint,
  fromDecimals: number,
  toDecimals: number
): bigint {
  const decimalDiff = toDecimals - fromDecimals;

  if (decimalDiff === 0) {
    return value;
  }

  if (decimalDiff > 0) {
    // Scale up: multiply
    const multiplier = 10n ** BigInt(decimalDiff);
    return value * multiplier;
  } else {
    // Scale down: divide (with truncation)
    const divisor = 10n ** BigInt(-decimalDiff);
    return value / divisor;
  }
}

/**
 * Trims trailing zeros from a decimal string for clean display.
 *
 * Rules:
 * - Remove trailing zeros after the decimal point
 * - Remove trailing decimal point if no digits remain
 * - Never round or hide precision
 *
 * Examples:
 * - "0.500000000000" → "0.5"
 * - "0.250000" → "0.25"
 * - "0.428571428571000000" → "0.428571428571"
 * - "3.0" → "3"
 * - "0" → "0"
 *
 * @param decimalString - The decimal string to trim
 * @returns Trimmed string
 */
export function trimTrailingZeros(decimalString: string): string {
  // If no decimal point, return as-is
  if (!decimalString.includes('.')) {
    return decimalString;
  }

  // Remove trailing zeros after decimal point
  let trimmed = decimalString.replace(/\.?0+$/, '');

  // Handle edge case: if we removed everything after the decimal point
  if (trimmed.endsWith('.')) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed;
}
