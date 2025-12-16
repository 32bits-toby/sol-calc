/**
 * Tests for the tokenizer
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../parser/tokenize.js';
import { TokenType, ParseError } from '../types.js';

test('tokenize - simple number', () => {
  const tokens = tokenize('123');
  assert.strictEqual(tokens.length, 2); // NUMBER + EOF
  assert.strictEqual(tokens[0]!.type, TokenType.NUMBER);
  assert.strictEqual(tokens[0]!.value, '123');
  assert.strictEqual(tokens[1]!.type, TokenType.EOF);
});

test('tokenize - scientific notation', () => {
  const tokens = tokenize('1e18');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.NUMBER);
  assert.strictEqual(tokens[0]!.value, '1e18');
});

test('tokenize - scientific notation with E', () => {
  const tokens = tokenize('5E6');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.NUMBER);
  assert.strictEqual(tokens[0]!.value, '5E6');
});

test('tokenize - scientific notation with negative exponent', () => {
  const tokens = tokenize('1e-6');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.NUMBER);
  assert.strictEqual(tokens[0]!.value, '1e-6');
});

test('tokenize - identifier', () => {
  const tokens = tokenize('amount');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.IDENTIFIER);
  assert.strictEqual(tokens[0]!.value, 'amount');
});

test('tokenize - identifier with underscore', () => {
  const tokens = tokenize('total_supply');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.IDENTIFIER);
  assert.strictEqual(tokens[0]!.value, 'total_supply');
});

test('tokenize - identifier starting with underscore', () => {
  const tokens = tokenize('_value');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.IDENTIFIER);
  assert.strictEqual(tokens[0]!.value, '_value');
});

test('tokenize - identifier with numbers', () => {
  const tokens = tokenize('var123');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.IDENTIFIER);
  assert.strictEqual(tokens[0]!.value, 'var123');
});

test('tokenize - operators', () => {
  const tokens = tokenize('+ - * / **');
  assert.strictEqual(tokens.length, 6); // 5 operators + EOF
  assert.strictEqual(tokens[0]!.type, TokenType.PLUS);
  assert.strictEqual(tokens[1]!.type, TokenType.MINUS);
  assert.strictEqual(tokens[2]!.type, TokenType.MULTIPLY);
  assert.strictEqual(tokens[3]!.type, TokenType.DIVIDE);
  assert.strictEqual(tokens[4]!.type, TokenType.POWER);
  assert.strictEqual(tokens[4]!.value, '**');
});

test('tokenize - parentheses', () => {
  const tokens = tokenize('(123)');
  assert.strictEqual(tokens.length, 4); // LPAREN, NUMBER, RPAREN, EOF
  assert.strictEqual(tokens[0]!.type, TokenType.LPAREN);
  assert.strictEqual(tokens[1]!.type, TokenType.NUMBER);
  assert.strictEqual(tokens[2]!.type, TokenType.RPAREN);
});

test('tokenize - complex expression', () => {
  const tokens = tokenize('amount * price / 1e18');
  assert.strictEqual(tokens.length, 6); // amount, *, price, /, 1e18, EOF
  assert.strictEqual(tokens[0]!.type, TokenType.IDENTIFIER);
  assert.strictEqual(tokens[0]!.value, 'amount');
  assert.strictEqual(tokens[1]!.type, TokenType.MULTIPLY);
  assert.strictEqual(tokens[2]!.type, TokenType.IDENTIFIER);
  assert.strictEqual(tokens[2]!.value, 'price');
  assert.strictEqual(tokens[3]!.type, TokenType.DIVIDE);
  assert.strictEqual(tokens[4]!.type, TokenType.NUMBER);
  assert.strictEqual(tokens[4]!.value, '1e18');
});

test('tokenize - whitespace handling', () => {
  const tokens = tokenize('  123   +   456  ');
  assert.strictEqual(tokens.length, 4); // 123, +, 456, EOF
  assert.strictEqual(tokens[0]!.type, TokenType.NUMBER);
  assert.strictEqual(tokens[1]!.type, TokenType.PLUS);
  assert.strictEqual(tokens[2]!.type, TokenType.NUMBER);
});

test('tokenize - multiline expression', () => {
  const tokens = tokenize('amount *\n  price /\n  1e18');
  assert.strictEqual(tokens.length, 6);
  assert.strictEqual(tokens[0]!.value, 'amount');
  assert.strictEqual(tokens[2]!.value, 'price');
  assert.strictEqual(tokens[4]!.value, '1e18');
});

test('tokenize - exponentiation', () => {
  const tokens = tokenize('10 ** 18');
  assert.strictEqual(tokens.length, 4); // 10, **, 18, EOF
  assert.strictEqual(tokens[0]!.type, TokenType.NUMBER);
  assert.strictEqual(tokens[0]!.value, '10');
  assert.strictEqual(tokens[1]!.type, TokenType.POWER);
  assert.strictEqual(tokens[2]!.type, TokenType.NUMBER);
  assert.strictEqual(tokens[2]!.value, '18');
});

test('tokenize - error on invalid character', () => {
  assert.throws(
    () => tokenize('123 @ 456'),
    (err: Error) => {
      return err instanceof ParseError && err.message.includes('Unexpected character');
    }
  );
});

test('tokenize - error on incomplete scientific notation', () => {
  assert.throws(
    () => tokenize('1e'),
    (err: Error) => {
      return err instanceof ParseError && err.message.includes('scientific notation');
    }
  );
});

test('tokenize - decimal literal (8.5) creates DECIMAL_LITERAL token', () => {
  const tokens = tokenize('8.5');
  assert.strictEqual(tokens.length, 2); // DECIMAL_LITERAL + EOF
  assert.strictEqual(tokens[0]!.type, TokenType.DECIMAL_LITERAL);
  assert.strictEqual(tokens[0]!.value, '8.5');
});

test('tokenize - decimal literal (0.25) creates DECIMAL_LITERAL token', () => {
  const tokens = tokenize('0.25');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.DECIMAL_LITERAL);
  assert.strictEqual(tokens[0]!.value, '0.25');
});

test('tokenize - decimal literal in expression (8.5 * 1e18)', () => {
  const tokens = tokenize('8.5 * 1e18');
  assert.strictEqual(tokens.length, 4); // DECIMAL_LITERAL, *, NUMBER, EOF
  assert.strictEqual(tokens[0]!.type, TokenType.DECIMAL_LITERAL);
  assert.strictEqual(tokens[0]!.value, '8.5');
  assert.strictEqual(tokens[1]!.type, TokenType.MULTIPLY);
  assert.strictEqual(tokens[2]!.type, TokenType.NUMBER);
  assert.strictEqual(tokens[2]!.value, '1e18');
});

test('tokenize - type(uint256).max should not trigger decimal tokenization', () => {
  // Regression test: ensure type bounds with `.max` don't get confused with decimal literals
  const tokens = tokenize('type(uint256).max');
  assert.strictEqual(tokens.length, 2); // TYPE_BOUND + EOF
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
});

test('tokenize - position tracking', () => {
  const tokens = tokenize('123 + 456');
  assert.strictEqual(tokens[0]!.position, 0); // 123 at position 0
  assert.strictEqual(tokens[1]!.position, 4); // + at position 4
  assert.strictEqual(tokens[2]!.position, 6); // 456 at position 6
});

// ============================================================================
// Type Bounds Tests
// ============================================================================

test('tokenize - type(uint256).max', () => {
  const tokens = tokenize('type(uint256).max');
  assert.strictEqual(tokens.length, 2); // TYPE_BOUND + EOF
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[0]!.value, 'type(uint256).max');
});

test('tokenize - type(uint256).min', () => {
  const tokens = tokenize('type(uint256).min');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[0]!.value, 'type(uint256).min');
});

test('tokenize - type(int256).max', () => {
  const tokens = tokenize('type(int256).max');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[0]!.value, 'type(int256).max');
});

test('tokenize - type(int256).min', () => {
  const tokens = tokenize('type(int256).min');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[0]!.value, 'type(int256).min');
});

test('tokenize - type(uint).max (alias)', () => {
  const tokens = tokenize('type(uint).max');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[0]!.value, 'type(uint256).max');
});

test('tokenize - type(int).min (alias)', () => {
  const tokens = tokenize('type(int).min');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[0]!.value, 'type(int256).min');
});

test('tokenize - type(uint8).max', () => {
  const tokens = tokenize('type(uint8).max');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[0]!.value, 'type(uint8).max');
});

test('tokenize - type(uint128).max', () => {
  const tokens = tokenize('type(uint128).max');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[0]!.value, 'type(uint128).max');
});

test('tokenize - type(int8).min', () => {
  const tokens = tokenize('type(int8).min');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[0]!.value, 'type(int8).min');
});

test('tokenize - type(int128).max', () => {
  const tokens = tokenize('type(int128).max');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[0]!.value, 'type(int128).max');
});

test('tokenize - type bound in expression', () => {
  const tokens = tokenize('type(uint256).max + 1');
  assert.strictEqual(tokens.length, 4); // TYPE_BOUND, +, NUMBER, EOF
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[0]!.value, 'type(uint256).max');
  assert.strictEqual(tokens[1]!.type, TokenType.PLUS);
  assert.strictEqual(tokens[2]!.type, TokenType.NUMBER);
  assert.strictEqual(tokens[2]!.value, '1');
});

test('tokenize - type bound with arithmetic', () => {
  const tokens = tokenize('type(uint128).max * 2');
  assert.strictEqual(tokens.length, 4);
  assert.strictEqual(tokens[0]!.type, TokenType.TYPE_BOUND);
  assert.strictEqual(tokens[1]!.type, TokenType.MULTIPLY);
  assert.strictEqual(tokens[2]!.type, TokenType.NUMBER);
});

test('tokenize - invalid type bound (non-multiple of 8)', () => {
  assert.throws(
    () => tokenize('type(uint7).max'),
    (err: Error) => {
      return err instanceof ParseError && err.message.includes('Invalid Solidity type');
    }
  );
});

test('tokenize - invalid type bound (too large)', () => {
  assert.throws(
    () => tokenize('type(uint512).max'),
    (err: Error) => {
      return err instanceof ParseError && err.message.includes('Invalid Solidity type');
    }
  );
});

test('tokenize - invalid type bound (too small)', () => {
  assert.throws(
    () => tokenize('type(uint4).max'),
    (err: Error) => {
      return err instanceof ParseError && err.message.includes('Invalid Solidity type');
    }
  );
});

test('tokenize - type keyword without bound pattern', () => {
  // "type" alone should be treated as identifier
  const tokens = tokenize('type');
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0]!.type, TokenType.IDENTIFIER);
  assert.strictEqual(tokens[0]!.value, 'type');
});

test('tokenize - type bound position tracking', () => {
  const tokens = tokenize('type(uint256).max + 5');
  assert.strictEqual(tokens[0]!.position, 0); // type(uint256).max at position 0
  assert.strictEqual(tokens[1]!.position, 18); // + at position 18
  assert.strictEqual(tokens[2]!.position, 20); // 5 at position 20
});
