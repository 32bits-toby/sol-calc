/**
 * Tests for the evaluator - AUDIT CRITICAL
 *
 * These tests verify the core arithmetic logic that auditors rely on.
 * Every operation must be mechanically correct and reproducible.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { evaluateExpression, evaluateExpressionWithTarget } from '../index';
import {
  Variable,
  DivisionByZeroError,
  DecimalMismatchError,
  InvalidExponentiationError,
  UndefinedVariableError,
} from '../types';

// Helper to create variable map
function vars(obj: Record<string, { value: bigint; decimals: number }>): Map<string, Variable> {
  const map = new Map<string, Variable>();
  for (const [name, { value, decimals }] of Object.entries(obj)) {
    map.set(name, { name, value, decimals });
  }
  return map;
}

// ============================================================================
// Basic Arithmetic
// ============================================================================

test('evaluate - simple addition with same decimals', () => {
  const variables = vars({
    a: { value: 1000000n, decimals: 6 },
    b: { value: 2000000n, decimals: 6 },
  });

  const result = evaluateExpression('a + b', variables);

  assert.strictEqual(result.raw, 3000000n);
  assert.strictEqual(result.decimals, 6);
  assert.strictEqual(result.human, '3.000000');
});

test('evaluate - simple subtraction with same decimals', () => {
  const variables = vars({
    a: { value: 5000000n, decimals: 6 },
    b: { value: 2000000n, decimals: 6 },
  });

  const result = evaluateExpression('a - b', variables);

  assert.strictEqual(result.raw, 3000000n);
  assert.strictEqual(result.decimals, 6);
  assert.strictEqual(result.human, '3.000000');
});

test('evaluate - multiplication adds decimals', () => {
  const variables = vars({
    a: { value: 1000000n, decimals: 6 },
    b: { value: 2000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a * b', variables);

  assert.strictEqual(result.raw, 2000000000000000000000000n);
  assert.strictEqual(result.decimals, 24); // 6 + 18
  assert.strictEqual(result.human, '2.000000000000000000000000');
});

test('evaluate - division subtracts decimals', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 1000000n, decimals: 6 },
  });

  const result = evaluateExpression('a / b', variables);

  assert.strictEqual(result.raw, 1000000000000n);
  assert.strictEqual(result.decimals, 12); // 18 - 6
});

test('evaluate - division with truncation', () => {
  const variables = vars({
    a: { value: 10n, decimals: 0 },
    b: { value: 3n, decimals: 0 },
  });

  const result = evaluateExpression('a / b', variables);

  assert.strictEqual(result.raw, 3n); // 10 / 3 = 3 (truncates)
  assert.strictEqual(result.decimals, 0);
});

// ============================================================================
// Error Cases
// ============================================================================

test('evaluate - error on addition with different decimals', () => {
  const variables = vars({
    a: { value: 1000000n, decimals: 6 },
    b: { value: 1000000000000000000n, decimals: 18 },
  });

  assert.throws(
    () => evaluateExpression('a + b', variables),
    (err: Error) => {
      return err instanceof DecimalMismatchError &&
        err.leftDecimals === 6 &&
        err.rightDecimals === 18;
    }
  );
});

test('evaluate - error on subtraction with different decimals', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 1000000n, decimals: 6 },
  });

  assert.throws(
    () => evaluateExpression('a - b', variables),
    DecimalMismatchError
  );
});

test('evaluate - error on division by zero', () => {
  const variables = vars({
    a: { value: 1000000n, decimals: 6 },
    b: { value: 0n, decimals: 6 },
  });

  assert.throws(
    () => evaluateExpression('a / b', variables),
    DivisionByZeroError
  );
});

test('evaluate - error on undefined variable', () => {
  const variables = vars({
    a: { value: 1000000n, decimals: 6 },
  });

  assert.throws(
    () => evaluateExpression('a + b', variables),
    (err: Error) => {
      return err instanceof UndefinedVariableError &&
        err.variableName === 'b';
    }
  );
});

// ============================================================================
// Exponentiation (10 ** n) - CRITICAL RESTRICTION
// ============================================================================

test('evaluate - 10 ** 18 with literal exponent', () => {
  const variables = vars({});

  const result = evaluateExpression('10 ** 18', variables);

  assert.strictEqual(result.raw, 1n);
  assert.strictEqual(result.decimals, 18);
});

test('evaluate - 10 ** n with dimensionless variable', () => {
  const variables = vars({
    n: { value: 18n, decimals: 0 }, // Dimensionless
  });

  const result = evaluateExpression('10 ** n', variables);

  assert.strictEqual(result.raw, 1n);
  assert.strictEqual(result.decimals, 18);
});

test('evaluate - error on 10 ** n where n has decimals', () => {
  const variables = vars({
    n: { value: 18n, decimals: 6 }, // NOT dimensionless
  });

  assert.throws(
    () => evaluateExpression('10 ** n', variables),
    (err: Error) => {
      return err instanceof InvalidExponentiationError &&
        err.message.includes('dimensionless');
    }
  );
});

test('evaluate - error on non-10 base exponentiation', () => {
  const variables = vars({
    x: { value: 2n, decimals: 0 },
  });

  assert.throws(
    () => evaluateExpression('x ** 2', variables),
    (err: Error) => {
      return err instanceof InvalidExponentiationError &&
        (err.message.includes('base must be 10') || err.message.includes('base must be literal 10'));
    }
  );
});

test('evaluate - error on non-literal base exponentiation', () => {
  const variables = vars({
    base: { value: 10n, decimals: 0 },
  });

  assert.throws(
    () => evaluateExpression('base ** 18', variables),
    (err: Error) => {
      return err instanceof InvalidExponentiationError &&
        err.message.includes('base must be literal 10');
    }
  );
});

test('evaluate - 10 ** negative exponent allowed', () => {
  const variables = vars({
    n: { value: -6n, decimals: 0 },
  });

  const result = evaluateExpression('10 ** n', variables);

  assert.strictEqual(result.raw, 1n);
  assert.strictEqual(result.decimals, -6);
});

// ============================================================================
// WAD Math (18 decimals)
// ============================================================================

test('evaluate - WAD multiplication: amount * price / 1e18', () => {
  const variables = vars({
    amount: { value: 5000000000000000000n, decimals: 18 }, // 5 WAD
    price: { value: 2000000000000000000n, decimals: 18 },  // 2 WAD
  });

  const result = evaluateExpression('amount * price / 1e18', variables);

  // 5 * 2 = 10, but we maintain proper decimals
  // amount(18) * price(18) / 1e18(0) = 36 - 0 = 36 decimals
  // Wait, that's not right. Let me recalculate:
  // amount * price = 10000000000000000000000000000000000000n with 36 decimals
  // 1e18 is 1000000000000000000n with 0 decimals
  // Division: 10000000000000000000000000000000000000n / 1000000000000000000n = 10000000000000000000n
  // Decimals: 36 - 0 = 36

  assert.strictEqual(result.raw, 10000000000000000000n);
  assert.strictEqual(result.decimals, 36);
});

test('evaluate - WAD division scaling', () => {
  const variables = vars({
    amount: { value: 1000000n, decimals: 6 }, // 1 USDC
    decimals: { value: 18n, decimals: 0 },
  });

  const result = evaluateExpression('amount * (10 ** decimals) / (10 ** 6)', variables);

  // This converts 1 USDC (6 decimals) to 18 decimals
  // amount * (10 ** 18) / (10 ** 6)
  // 1000000 * 1(decimals=18) / 1(decimals=6)
  // Intermediate: 1000000 * 1 = 1000000 with decimals 6 + 18 = 24
  // Then: 1000000 / 1 = 1000000 with decimals 24 - 6 = 18
  assert.strictEqual(result.raw, 1000000n);
  assert.strictEqual(result.decimals, 18);
});

// ============================================================================
// BPS (Basis Points) Calculations
// ============================================================================

test('evaluate - BPS calculation: amount * bps / 10000', () => {
  const variables = vars({
    amount: { value: 1000000000000000000n, decimals: 18 }, // 1 WAD
    bps: { value: 500n, decimals: 0 }, // 5% = 500 bps, dimensionless
  });

  const result = evaluateExpression('amount * bps / 10000', variables);

  // 1 * 500 / 10000 = 0.05 WAD = 50000000000000000
  assert.strictEqual(result.raw, 50000000000000000n);
  assert.strictEqual(result.decimals, 18);
});

// ============================================================================
// Share Calculations (Vault Math)
// ============================================================================

test('evaluate - shares to assets: shares * totalAssets / totalSupply', () => {
  const variables = vars({
    shares: { value: 100000000000000000000n, decimals: 18 }, // 100 shares
    totalAssets: { value: 1000000000000000000000n, decimals: 18 }, // 1000 assets
    totalSupply: { value: 500000000000000000000n, decimals: 18 }, // 500 supply
  });

  const result = evaluateExpression('shares * totalAssets / totalSupply', variables);

  // 100 * 1000 / 500 = 200
  assert.strictEqual(result.raw, 200000000000000000000n);
  assert.strictEqual(result.decimals, 18);
});

// ============================================================================
// Complex Expressions
// ============================================================================

test('evaluate - complex: (a + b) * c / d', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
    b: { value: 2000000000000000000n, decimals: 18 },
    c: { value: 3000000000000000000n, decimals: 18 },
    d: { value: 6000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('(a + b) * c / d', variables);

  // (1 + 2) * 3 / 6 = 9 / 6 = 1.5
  assert.strictEqual(result.raw, 1500000000000000000n);
  assert.strictEqual(result.decimals, 18);
});

// ============================================================================
// Rounding with Target Decimals
// ============================================================================

test('evaluate - rounding floor mode', () => {
  const variables = vars({
    a: { value: 1000000000000000007n, decimals: 18 }, // 1.000000000000000007
  });

  const result = evaluateExpressionWithTarget('a', variables, 6, 'floor');

  // Scaling from 18 to 6 decimals: divide by 10^12
  // 1000000000000000007 / 1000000000000 = 1000000 (floor)
  // Loss: 7
  assert.strictEqual(result.solidity, 1000000n);
  assert.strictEqual(result.roundingLoss, '0.000000000000000007');
});

test('evaluate - rounding ceil mode', () => {
  const variables = vars({
    a: { value: 1000000000000000007n, decimals: 18 }, // 1.000000000000000007
  });

  const result = evaluateExpressionWithTarget('a', variables, 6, 'ceil');

  // Scaling from 18 to 6 decimals with ceil: divide by 10^12, round up
  // 1000000000000000007 / 1000000000000 = 1000001 (ceil)
  assert.strictEqual(result.solidity, 1000001n);
});

test('evaluate - no rounding loss when exact', () => {
  const variables = vars({
    a: { value: 1000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpressionWithTarget('a', variables, 6, 'floor');

  assert.strictEqual(result.solidity, 1000000n);
  // Loss is formatted with original decimals, so it's 0 with 18 decimals
  assert.strictEqual(result.roundingLoss, '0.000000000000000000');
});

// ============================================================================
// Edge Cases
// ============================================================================

test('evaluate - zero value', () => {
  const variables = vars({
    a: { value: 0n, decimals: 18 },
  });

  const result = evaluateExpression('a', variables);

  assert.strictEqual(result.raw, 0n);
  assert.strictEqual(result.decimals, 18);
  assert.strictEqual(result.human, '0.000000000000000000');
});

test('evaluate - negative value', () => {
  const variables = vars({
    a: { value: 5n, decimals: 0 },
    b: { value: 10n, decimals: 0 },
  });

  const result = evaluateExpression('a - b', variables);

  assert.strictEqual(result.raw, -5n);
  assert.strictEqual(result.decimals, 0);
  assert.strictEqual(result.human, '-5');
});

test('evaluate - very large numbers', () => {
  const variables = vars({
    a: { value: 1000000000000000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('a', variables);

  assert.strictEqual(result.raw, 1000000000000000000000000000000n);
  assert.strictEqual(result.decimals, 18);
});

test('evaluate - literal number in expression', () => {
  const variables = vars({
    amount: { value: 1000000000000000000n, decimals: 18 },
  });

  const result = evaluateExpression('amount * 2 / 100', variables);

  // 1 * 2 / 100 = 0.02
  assert.strictEqual(result.raw, 20000000000000000n);
  assert.strictEqual(result.decimals, 18);
});
