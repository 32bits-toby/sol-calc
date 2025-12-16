/**
 * Comparison Operator Tests
 *
 * Tests for the two-phase comparison evaluation system.
 * Phase 1: Numeric evaluation
 * Phase 2: Boolean comparison
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { evaluateExpression } from '../index.js';
import { Variable, ComparisonResult } from '../types.js';

function vars(obj: Record<string, { value: bigint; decimals: number }>): Map<string, Variable> {
  const map = new Map<string, Variable>();
  for (const [name, { value, decimals }] of Object.entries(obj)) {
    map.set(name, { name, value, decimals });
  }
  return map;
}

function isComparisonResult(result: any): result is ComparisonResult {
  return 'result' in result && 'operator' in result;
}

// ============================================================================
// Basic Comparison Operators
// ============================================================================

test('comparison - equality (==) with matching decimals', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 1000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a == b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
  assert.strictEqual(result.operator, '==');
  assert.strictEqual(result.decimals, 18);
});

test('comparison - equality (==) false', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 2000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a == b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, false);
});

test('comparison - not equal (!=) true', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 2000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a != b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
  assert.strictEqual(result.operator, '!=');
});

test('comparison - not equal (!=) false', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 1000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a != b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, false);
});

test('comparison - less than (<) true', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 2000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a < b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
  assert.strictEqual(result.operator, '<');
});

test('comparison - less than (<) false', () => {
  const variables = vars({
    a: { value: 2000000000000000000n, decimals: 18 },
    b: { value: 1000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a < b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, false);
});

test('comparison - less than or equal (<=) with equal values', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 1000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a <= b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
  assert.strictEqual(result.operator, '<=');
});

test('comparison - less than or equal (<=) with less than', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 2000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a <= b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
});

test('comparison - greater than (>) true', () => {
  const variables = vars({
    a: { value: 2000000000000000000n, decimals: 18 },
    b: { value: 1000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a > b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
  assert.strictEqual(result.operator, '>');
});

test('comparison - greater than (>) false', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 1000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a > b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, false);
});

test('comparison - greater than or equal (>=) with equal values', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 1000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a >= b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
  assert.strictEqual(result.operator, '>=');
});

test('comparison - greater than or equal (>=) with greater than', () => {
  const variables = vars({
    a: { value: 2000000000000000000n, decimals: 18 },
    b: { value: 1000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a >= b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
});

// ============================================================================
// Arithmetic in Comparisons (Phase 1 must work correctly)
// ============================================================================

test('comparison - with arithmetic on left side', () => {
  const variables = vars({
    amount: { value: 5000000000000000000n, decimals: 18 },
    price: { value: 2000000000000000000n, decimals: 18 },
    max: { value: 10000000000000000000000000000000000000n, decimals: 36 }, // 10 * 10^36
  });

  // amount * price should be 36 decimals, max is 36 decimals
  const result = evaluateExpression('amount * price == max', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
  assert.strictEqual(result.decimals, 36);
});

test('comparison - with arithmetic on both sides', () => {
  const variables = vars({
    a: { value: 10000000000000000000n, decimals: 18 },
    b: { value: 5000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a + b > a', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
});

test('comparison - complex arithmetic', () => {
  const variables = vars({
    amount: { value: 1000000000000000000n, decimals: 18 },
    rate: { value: 500n, decimals: 0 },
  });

  const result = evaluateExpression('amount * rate / 10000 < amount', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
});

// ============================================================================
// Type Bounds with Comparisons
// ============================================================================

test('comparison - with type(uint256).max', () => {
  const variables = vars({
    amount: { value: 1000000000000000000n, decimals: 0 },
  });

  const result = evaluateExpression('amount < type(uint256).max', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
});

test('comparison - exponentiation with type bound', () => {
  const variables = vars({
    amount: { value: 1000000000000000000n, decimals: 18 },
  });

  // amount has 18 decimals, type(uint256).max * 1e18 has 18 decimals
  const result = evaluateExpression('amount <= type(uint256).max * 1e18', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
  assert.strictEqual(result.decimals, 18);
});

// ============================================================================
// Auto-Normalization for Decimal Mismatches (Comparison-Only)
// ============================================================================

test('comparison - auto-normalize different decimals (6 vs 18)', () => {
  const variables = vars({
    usdc: { value: 1000000n, decimals: 6 }, // 1.000000 (6 decimals)
    weth: { value: 1000000000000000000n, decimals: 18 }, // 1.000000000000000000 (18 decimals)
  });

  // Both represent "1", but with different decimal scales
  // Should auto-normalize to 18 decimals and compare
  const result = evaluateExpression('usdc == weth', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true); // Both are 1, so equal
  assert.strictEqual(result.decimals, 18); // Normalized to higher scale
});

test('comparison - auto-normalize with negative decimals', () => {
  const variables = vars({
    amount: { value: 1000000000000000000n, decimals: 18 }, // 1.0 with 18 decimals
  });

  // type(uint256).max / 1e18 produces -18 decimals
  // Should auto-normalize and compare successfully
  const result = evaluateExpression('amount <= type(uint256).max / 1e18', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
  // Normalized to 18 decimals (the higher of 18 and -18)
  assert.strictEqual(result.decimals, 18);
});

test('comparison - auto-normalize preserves inequality', () => {
  const variables = vars({
    a: { value: 1n, decimals: 6 }, // 0.000001 (6 decimals)
    b: { value: 1n, decimals: 18 }, // 0.000000000000000001 (18 decimals)
  });

  // After normalization to 18 decimals:
  // a = 1 * 10^12 = 1000000000000
  // b = 1
  // So a > b
  const result = evaluateExpression('a > b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
  assert.strictEqual(result.decimals, 18);
});

// ============================================================================
// Human-Readable Output
// ============================================================================

test('comparison - leftHuman and rightHuman populated', () => {
  const variables = vars({
    a: { value: 1500000000000000000n, decimals: 18 },
    b: { value: 2000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a < b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.leftHuman, '1.500000000000000000');
  assert.strictEqual(result.rightHuman, '2.000000000000000000');
});

// ============================================================================
// Edge Cases
// ============================================================================

test('comparison - with zero', () => {
  const variables = vars({
    a: { value: 0n, decimals: 18 },
    b: { value: 1n, decimals: 18 },
  });

  const result = evaluateExpression('a < b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
});

test('comparison - with negative values', () => {
  const variables = vars({
    a: { value: -1000000000000000000n, decimals: 18 },
    b: { value: 1000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a < b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
});

test('comparison - equality with large numbers', () => {
  const max = (2n ** 256n) - 1n;
  const variables = vars({
    a: { value: max, decimals: 0 },
    b: { value: max, decimals: 0 },
  });

  const result = evaluateExpression('a == b', variables);

  assert.ok(isComparisonResult(result));
  assert.strictEqual(result.result, true);
});

// ============================================================================
// No Regression: Non-Comparison Expressions Still Work
// ============================================================================

test('comparison - non-comparison expression returns numeric result', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 2000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a + b', variables);

  assert.ok(!isComparisonResult(result));
  assert.strictEqual(result.raw, 3000000000000000000n);
  assert.strictEqual(result.decimals, 18);
});
