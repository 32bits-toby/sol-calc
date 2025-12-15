/**
 * SolCalc Tokenizer
 *
 * Converts an expression string into a stream of tokens.
 * This is the first stage of parsing.
 *
 * Supported tokens:
 * - Numbers (integers and scientific notation: 1000, 1e18)
 * - Identifiers (variable names: amount, price)
 * - Operators: + - * / **
 * - Parentheses: ( )
 */

import { Token, TokenType, ParseError } from '../types';

/**
 * Tokenizes an expression string.
 *
 * @param input - The expression to tokenize
 * @returns Array of tokens
 * @throws ParseError on invalid characters or malformed numbers
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;

  while (position < input.length) {
    const char = input[position];

    // Skip whitespace
    if (isWhitespace(char!)) {
      position++;
      continue;
    }

    // Numbers (including scientific notation)
    if (isDigit(char!)) {
      const token = readNumber(input, position);
      tokens.push(token);
      position = token.position + token.value.length;
      continue;
    }

    // Identifiers (variable names)
    if (isIdentifierStart(char!)) {
      const token = readIdentifier(input, position);
      tokens.push(token);
      position = token.position + token.value.length;
      continue;
    }

    // Operators and parentheses
    switch (char) {
      case '+':
        tokens.push({ type: TokenType.PLUS, value: '+', position });
        position++;
        continue;

      case '-':
        tokens.push({ type: TokenType.MINUS, value: '-', position });
        position++;
        continue;

      case '/':
        tokens.push({ type: TokenType.DIVIDE, value: '/', position });
        position++;
        continue;

      case '(':
        tokens.push({ type: TokenType.LPAREN, value: '(', position });
        position++;
        continue;

      case ')':
        tokens.push({ type: TokenType.RPAREN, value: ')', position });
        position++;
        continue;

      case '*':
        // Check for ** (exponentiation)
        if (input[position + 1] === '*') {
          tokens.push({ type: TokenType.POWER, value: '**', position });
          position += 2;
        } else {
          tokens.push({ type: TokenType.MULTIPLY, value: '*', position });
          position++;
        }
        continue;

      default:
        throw new ParseError(`Unexpected character: '${char}'`, position);
    }
  }

  // Add EOF token
  tokens.push({ type: TokenType.EOF, value: '', position });

  return tokens;
}

/**
 * Reads a number token (integer or scientific notation).
 *
 * Supported formats:
 * - 1000
 * - 1e18
 * - 1E18
 * - 10e-6 (negative exponents allowed)
 */
function readNumber(input: string, startPos: number): Token {
  let position = startPos;
  let value = '';

  // Read integer part
  while (position < input.length && isDigit(input[position]!)) {
    value += input[position];
    position++;
  }

  // Check for scientific notation (e or E)
  if (position < input.length && (input[position] === 'e' || input[position] === 'E')) {
    value += input[position];
    position++;

    // Optional sign
    if (position < input.length && (input[position] === '+' || input[position] === '-')) {
      value += input[position];
      position++;
    }

    // Exponent digits (required)
    const exponentStart = position;
    while (position < input.length && isDigit(input[position]!)) {
      value += input[position];
      position++;
    }

    // Validate that we got exponent digits
    if (position === exponentStart) {
      throw new ParseError('Invalid scientific notation: missing exponent digits', startPos);
    }
  }

  return {
    type: TokenType.NUMBER,
    value,
    position: startPos,
  };
}

/**
 * Reads an identifier token (variable name).
 *
 * Identifiers match: [a-zA-Z_][a-zA-Z0-9_]*
 */
function readIdentifier(input: string, startPos: number): Token {
  let position = startPos;
  let value = '';

  // First character: [a-zA-Z_]
  value += input[position];
  position++;

  // Subsequent characters: [a-zA-Z0-9_]
  while (position < input.length && isIdentifierPart(input[position]!)) {
    value += input[position];
    position++;
  }

  return {
    type: TokenType.IDENTIFIER,
    value,
    position: startPos,
  };
}

// ============================================================================
// Character Classification Helpers
// ============================================================================

function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function isIdentifierStart(char: string): boolean {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
}

function isIdentifierPart(char: string): boolean {
  return isIdentifierStart(char) || isDigit(char);
}
