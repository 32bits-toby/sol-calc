/**
 * Tests for the tokenizer
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../parser/tokenize';
import { TokenType, ParseError } from '../types';

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

test('tokenize - position tracking', () => {
  const tokens = tokenize('123 + 456');
  assert.strictEqual(tokens[0]!.position, 0); // 123 at position 0
  assert.strictEqual(tokens[1]!.position, 4); // + at position 4
  assert.strictEqual(tokens[2]!.position, 6); // 456 at position 6
});
