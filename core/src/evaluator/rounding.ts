/**
 * SolCalc Rounding Logic
 *
 * This module handles rounding operations to match Solidity arithmetic behavior.
 *
 * Rounding Modes:
 * - Floor: Round towards negative infinity (Solidity default integer division)
 * - Ceil: Round towards positive infinity (e.g., mulDivUp)
 */

import { RoundingMode } from '../types';
import { scaleToDecimals } from './decimals';

/**
 * Applies rounding when scaling a value to target decimals.
 *
 * This is the core rounding function that mimics Solidity's behavior.
 *
 * @param value - The value to round
 * @param fromDecimals - Current decimal scale
 * @param toDecimals - Target decimal scale
 * @param mode - Rounding mode
 * @returns Rounded value at target scale
 */
export function applyRounding(
  value: bigint,
  fromDecimals: number,
  toDecimals: number,
  mode: RoundingMode
): bigint {
  const decimalDiff = toDecimals - fromDecimals;

  // No rounding needed if scaling up or staying same
  if (decimalDiff >= 0) {
    return scaleToDecimals(value, fromDecimals, toDecimals);
  }

  // Scaling down: apply rounding
  const divisor = 10n ** BigInt(-decimalDiff);
  return divideWithRounding(value, divisor, mode);
}

/**
 * Divides two bigints with specified rounding mode.
 *
 * Floor mode: a / b (rounds towards negative infinity)
 * Ceil mode: (a + b - 1) / b for positive, custom logic for negative
 *
 * @param dividend - The value to divide
 * @param divisor - The divisor
 * @param mode - Rounding mode
 * @returns Rounded quotient
 */
export function divideWithRounding(
  dividend: bigint,
  divisor: bigint,
  mode: RoundingMode
): bigint {
  if (divisor === 0n) {
    throw new Error('Division by zero');
  }

  if (mode === 'floor') {
    return floorDivide(dividend, divisor);
  } else {
    return ceilDivide(dividend, divisor);
  }
}

/**
 * Floor division (rounds towards negative infinity).
 *
 * This matches Solidity's default integer division for positive numbers.
 *
 * Examples:
 * - floorDivide(7n, 3n) = 2n
 * - floorDivide(-7n, 3n) = -3n (rounds down)
 * - floorDivide(7n, -3n) = -3n (rounds down)
 *
 * @param dividend - The value to divide
 * @param divisor - The divisor
 * @returns Floor of quotient
 */
function floorDivide(dividend: bigint, divisor: bigint): bigint {
  // JavaScript's BigInt division already does truncation towards zero
  // For floor division, we need to adjust for negative results
  const quotient = dividend / divisor;
  const remainder = dividend % divisor;

  // If remainder is 0, no adjustment needed
  if (remainder === 0n) {
    return quotient;
  }

  // If signs differ and there's a remainder, round down (subtract 1)
  const differentSigns = (dividend < 0n) !== (divisor < 0n);
  if (differentSigns) {
    return quotient - 1n;
  }

  return quotient;
}

/**
 * Ceiling division (rounds towards positive infinity).
 *
 * This matches Solidity's mulDivUp and divWadUp behavior.
 *
 * Examples:
 * - ceilDivide(7n, 3n) = 3n
 * - ceilDivide(-7n, 3n) = -2n (rounds up)
 * - ceilDivide(7n, -3n) = -2n (rounds up)
 *
 * @param dividend - The value to divide
 * @param divisor - The divisor
 * @returns Ceiling of quotient
 */
function ceilDivide(dividend: bigint, divisor: bigint): bigint {
  const quotient = dividend / divisor;
  const remainder = dividend % divisor;

  // If remainder is 0, no adjustment needed
  if (remainder === 0n) {
    return quotient;
  }

  // If signs are the same and there's a remainder, round up (add 1)
  const sameSigns = (dividend < 0n) === (divisor < 0n);
  if (sameSigns) {
    return quotient + 1n;
  }

  return quotient;
}

/**
 * Calculates the rounding loss when scaling down.
 *
 * This shows what was lost due to rounding.
 *
 * @param originalValue - Original value before rounding
 * @param roundedValue - Value after rounding
 * @param fromDecimals - Original decimals
 * @param toDecimals - Target decimals (must be less than fromDecimals)
 * @returns The amount lost, in the original scale
 */
export function calculateRoundingLoss(
  originalValue: bigint,
  roundedValue: bigint,
  fromDecimals: number,
  toDecimals: number
): bigint {
  if (toDecimals >= fromDecimals) {
    return 0n; // No loss when scaling up
  }

  // Scale the rounded value back up to the original scale
  const roundedScaledBack = scaleToDecimals(roundedValue, toDecimals, fromDecimals);

  // Loss is the difference
  return originalValue - roundedScaledBack;
}

/**
 * Multiplies two values with rounding applied to the result.
 *
 * Useful for operations like mulDiv where intermediate precision is high
 * but the final result needs rounding.
 *
 * @param a - First value
 * @param b - Second value
 * @param divisor - Divisor to apply after multiplication
 * @param mode - Rounding mode
 * @returns (a * b) / divisor with rounding
 */
export function mulDivWithRounding(
  a: bigint,
  b: bigint,
  divisor: bigint,
  mode: RoundingMode
): bigint {
  const product = a * b;
  return divideWithRounding(product, divisor, mode);
}
