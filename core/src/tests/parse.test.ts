/**
 * Tests for the parser
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../parser/tokenize.js';
import { parse } from '../parser/parse.js';
import { ASTNodeType, ParseError } from '../types.js';

test('parse - number literal', () => {
  const tokens = tokenize('123');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.NUMBER_LITERAL);
  assert.strictEqual((ast as any).value, 123n);
  assert.strictEqual((ast as any).decimals, 0);
});

test('parse - scientific notation 1e18', () => {
  const tokens = tokenize('1e18');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.NUMBER_LITERAL);
  // 1e18 is a scale constant: {value: 10^18, decimals: 18}
  // This represents "1 with 18 decimals" → human value = 10^18 / 10^18 = 1
  assert.strictEqual((ast as any).value, 1000000000000000000n);
  assert.strictEqual((ast as any).decimals, 18);
});

test('parse - scientific notation 5e3', () => {
  const tokens = tokenize('5e3');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.NUMBER_LITERAL);
  assert.strictEqual((ast as any).value, 5000n);
});

test('parse - identifier', () => {
  const tokens = tokenize('amount');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.IDENTIFIER);
  assert.strictEqual((ast as any).name, 'amount');
});

test('parse - addition', () => {
  const tokens = tokenize('a + b');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '+');
  assert.strictEqual((ast as any).left.type, ASTNodeType.IDENTIFIER);
  assert.strictEqual((ast as any).left.name, 'a');
  assert.strictEqual((ast as any).right.type, ASTNodeType.IDENTIFIER);
  assert.strictEqual((ast as any).right.name, 'b');
});

test('parse - subtraction', () => {
  const tokens = tokenize('10 - 5');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '-');
});

test('parse - multiplication', () => {
  const tokens = tokenize('x * y');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '*');
});

test('parse - division', () => {
  const tokens = tokenize('a / b');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '/');
});

test('parse - exponentiation', () => {
  const tokens = tokenize('10 ** 18');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.EXPONENTIATION);
  assert.strictEqual((ast as any).base.type, ASTNodeType.NUMBER_LITERAL);
  assert.strictEqual((ast as any).base.value, 10n);
  assert.strictEqual((ast as any).exponent.type, ASTNodeType.NUMBER_LITERAL);
  assert.strictEqual((ast as any).exponent.value, 18n);
});

test('parse - operator precedence: multiplication before addition', () => {
  const tokens = tokenize('a + b * c');
  const ast = parse(tokens);
  // Should parse as: a + (b * c)
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '+');
  assert.strictEqual((ast as any).left.name, 'a');
  assert.strictEqual((ast as any).right.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).right.operator, '*');
  assert.strictEqual((ast as any).right.left.name, 'b');
  assert.strictEqual((ast as any).right.right.name, 'c');
});

test('parse - operator precedence: division before subtraction', () => {
  const tokens = tokenize('a - b / c');
  const ast = parse(tokens);
  // Should parse as: a - (b / c)
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '-');
  assert.strictEqual((ast as any).right.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).right.operator, '/');
});

test('parse - operator precedence: exponentiation before multiplication', () => {
  const tokens = tokenize('a * 10 ** 18');
  const ast = parse(tokens);
  // Should parse as: a * (10 ** 18)
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '*');
  assert.strictEqual((ast as any).right.type, ASTNodeType.EXPONENTIATION);
});

test('parse - parentheses override precedence', () => {
  const tokens = tokenize('(a + b) * c');
  const ast = parse(tokens);
  // Should parse as: (a + b) * c
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '*');
  assert.strictEqual((ast as any).left.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).left.operator, '+');
  assert.strictEqual((ast as any).right.name, 'c');
});

test('parse - nested parentheses', () => {
  const tokens = tokenize('((a + b) * c)');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '*');
});

test('parse - complex expression', () => {
  const tokens = tokenize('amount * price / 1e18 + fee');
  const ast = parse(tokens);
  // Should parse as: ((amount * price) / 1e18) + fee
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '+');
  assert.strictEqual((ast as any).right.name, 'fee');

  const left = (ast as any).left;
  assert.strictEqual(left.type, ASTNodeType.BINARY_OP);
  assert.strictEqual(left.operator, '/');
});

test('parse - error on missing closing parenthesis', () => {
  const tokens = tokenize('(a + b');
  assert.throws(
    () => parse(tokens),
    (err: Error) => {
      return err instanceof ParseError && err.message.includes('closing parenthesis');
    }
  );
});

test('parse - error on unexpected token', () => {
  const tokens = tokenize('a + + b');
  assert.throws(
    () => parse(tokens),
    (err: Error) => {
      return err instanceof ParseError && err.message.includes('Unexpected token');
    }
  );
});

test('parse - error on negative exponent in literal', () => {
  const tokens = tokenize('1e-6');
  assert.throws(
    () => parse(tokens),
    (err: Error) => {
      return err instanceof ParseError && (
        err.message.includes('Negative exponents') ||
        err.message.includes('Invalid number')
      );
    }
  );
});

test('parse - associativity: left for addition', () => {
  const tokens = tokenize('a + b + c');
  const ast = parse(tokens);
  // Should parse as: (a + b) + c (left-associative)
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '+');
  assert.strictEqual((ast as any).left.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).left.operator, '+');
  assert.strictEqual((ast as any).right.name, 'c');
});

test('parse - associativity: left for multiplication', () => {
  const tokens = tokenize('a * b * c');
  const ast = parse(tokens);
  // Should parse as: (a * b) * c (left-associative)
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '*');
  assert.strictEqual((ast as any).left.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).left.operator, '*');
});

test('parse - associativity: right for exponentiation', () => {
  const tokens = tokenize('10 ** 10 ** 2');
  const ast = parse(tokens);
  // Should parse as: 10 ** (10 ** 2) (right-associative)
  assert.strictEqual(ast.type, ASTNodeType.EXPONENTIATION);
  assert.strictEqual((ast as any).base.type, ASTNodeType.NUMBER_LITERAL);
  assert.strictEqual((ast as any).base.value, 10n);
  assert.strictEqual((ast as any).exponent.type, ASTNodeType.EXPONENTIATION);
});

// ============================================================================
// Type Bounds Parser Tests
// ============================================================================

test('parse - type(uint256).max', () => {
  const tokens = tokenize('type(uint256).max');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.TYPE_BOUND_LITERAL);
  assert.strictEqual((ast as any).value, (2n ** 256n) - 1n);
  assert.strictEqual((ast as any).decimals, 0);
  assert.strictEqual((ast as any).solidityType, 'uint256');
  assert.strictEqual((ast as any).bound, 'max');
});

test('parse - type(uint256).min', () => {
  const tokens = tokenize('type(uint256).min');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.TYPE_BOUND_LITERAL);
  assert.strictEqual((ast as any).value, 0n);
  assert.strictEqual((ast as any).decimals, 0);
  assert.strictEqual((ast as any).solidityType, 'uint256');
  assert.strictEqual((ast as any).bound, 'min');
});

test('parse - type(int256).max', () => {
  const tokens = tokenize('type(int256).max');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.TYPE_BOUND_LITERAL);
  assert.strictEqual((ast as any).value, (2n ** 255n) - 1n);
  assert.strictEqual((ast as any).decimals, 0);
  assert.strictEqual((ast as any).solidityType, 'int256');
  assert.strictEqual((ast as any).bound, 'max');
});

test('parse - type(int256).min', () => {
  const tokens = tokenize('type(int256).min');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.TYPE_BOUND_LITERAL);
  assert.strictEqual((ast as any).value, -(2n ** 255n));
  assert.strictEqual((ast as any).decimals, 0);
  assert.strictEqual((ast as any).solidityType, 'int256');
  assert.strictEqual((ast as any).bound, 'min');
});

test('parse - type(uint8).max', () => {
  const tokens = tokenize('type(uint8).max');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.TYPE_BOUND_LITERAL);
  assert.strictEqual((ast as any).value, 255n);
  assert.strictEqual((ast as any).decimals, 0);
  assert.strictEqual((ast as any).solidityType, 'uint8');
});

test('parse - type(uint128).max', () => {
  const tokens = tokenize('type(uint128).max');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.TYPE_BOUND_LITERAL);
  assert.strictEqual((ast as any).value, (2n ** 128n) - 1n);
  assert.strictEqual((ast as any).decimals, 0);
  assert.strictEqual((ast as any).solidityType, 'uint128');
});

test('parse - type(int8).min', () => {
  const tokens = tokenize('type(int8).min');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.TYPE_BOUND_LITERAL);
  assert.strictEqual((ast as any).value, -128n);
  assert.strictEqual((ast as any).decimals, 0);
  assert.strictEqual((ast as any).solidityType, 'int8');
});

test('parse - type(int8).max', () => {
  const tokens = tokenize('type(int8).max');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.TYPE_BOUND_LITERAL);
  assert.strictEqual((ast as any).value, 127n);
  assert.strictEqual((ast as any).decimals, 0);
});

test('parse - type bound alias uint', () => {
  const tokens = tokenize('type(uint).max');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.TYPE_BOUND_LITERAL);
  assert.strictEqual((ast as any).value, (2n ** 256n) - 1n);
  assert.strictEqual((ast as any).solidityType, 'uint256');
});

test('parse - type bound alias int', () => {
  const tokens = tokenize('type(int).min');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.TYPE_BOUND_LITERAL);
  assert.strictEqual((ast as any).value, -(2n ** 255n));
  assert.strictEqual((ast as any).solidityType, 'int256');
});

test('parse - type bound in addition', () => {
  const tokens = tokenize('type(uint256).max + 1');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '+');
  assert.strictEqual((ast as any).left.type, ASTNodeType.TYPE_BOUND_LITERAL);
  assert.strictEqual((ast as any).right.type, ASTNodeType.NUMBER_LITERAL);
});

test('parse - type bound in subtraction', () => {
  const tokens = tokenize('type(int256).min - 1');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '-');
  assert.strictEqual((ast as any).left.type, ASTNodeType.TYPE_BOUND_LITERAL);
});

test('parse - type bound in multiplication', () => {
  const tokens = tokenize('type(uint128).max * 2');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '*');
  assert.strictEqual((ast as any).left.type, ASTNodeType.TYPE_BOUND_LITERAL);
});

test('parse - type bound in division', () => {
  const tokens = tokenize('type(uint256).max / 1e18');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '/');
});

test('parse - type bound in parentheses', () => {
  const tokens = tokenize('(type(uint256).max + 1) / 2');
  const ast = parse(tokens);
  assert.strictEqual(ast.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).operator, '/');
  assert.strictEqual((ast as any).left.type, ASTNodeType.BINARY_OP);
  assert.strictEqual((ast as any).left.operator, '+');
});
