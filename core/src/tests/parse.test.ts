/**
 * Tests for the parser
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../parser/tokenize';
import { parse } from '../parser/parse';
import { ASTNodeType, ParseError } from '../types';

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
  assert.strictEqual((ast as any).value, 1000000000000000000n);
  assert.strictEqual((ast as any).decimals, 0);
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
