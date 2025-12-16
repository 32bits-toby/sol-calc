/**
 * SolCalc Parser
 *
 * Converts a stream of tokens into an Abstract Syntax Tree (AST).
 * This is the second stage of parsing.
 *
 * Grammar (with precedence):
 *   expression := term (('+' | '-') term)*
 *   term       := exponentiation (('*' | '/') exponentiation)*
 *   exponentiation := primary ('**' primary)?
 *   primary    := NUMBER | IDENTIFIER | '(' expression ')'
 *
 * CRITICAL: Exponentiation validation happens during evaluation, not parsing,
 * because we need to know if the exponent is dimensionless (decimals = 0).
 */

import {
  Token,
  TokenType,
  ASTNode,
  ASTNodeType,
  NumberLiteralNode,
  TypeBoundLiteralNode,
  IdentifierNode,
  BinaryOpNode,
  ExponentiationNode,
  ParseError,
} from '../types.js';

export class Parser {
  private tokens: Token[];
  private position: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.position = 0;
  }

  /**
   * Parses the token stream into an AST.
   */
  parse(): ASTNode {
    const ast = this.parseExpression();

    // Ensure we consumed all tokens (except EOF)
    if (this.currentToken().type !== TokenType.EOF) {
      throw new ParseError(
        `Unexpected token: ${this.currentToken().value}`,
        this.currentToken().position
      );
    }

    return ast;
  }

  /**
   * Parses an expression (lowest precedence: + -)
   */
  private parseExpression(): ASTNode {
    let left = this.parseTerm();

    while (
      this.currentToken().type === TokenType.PLUS ||
      this.currentToken().type === TokenType.MINUS
    ) {
      const operator = this.currentToken().type === TokenType.PLUS ? '+' : '-';
      this.advance();
      const right = this.parseTerm();

      left = {
        type: ASTNodeType.BINARY_OP,
        operator,
        left,
        right,
      } as BinaryOpNode;
    }

    return left;
  }

  /**
   * Parses a term (medium precedence: * /)
   */
  private parseTerm(): ASTNode {
    let left = this.parseExponentiation();

    while (
      this.currentToken().type === TokenType.MULTIPLY ||
      this.currentToken().type === TokenType.DIVIDE
    ) {
      const operator = this.currentToken().type === TokenType.MULTIPLY ? '*' : '/';
      this.advance();
      const right = this.parseExponentiation();

      left = {
        type: ASTNodeType.BINARY_OP,
        operator,
        left,
        right,
      } as BinaryOpNode;
    }

    return left;
  }

  /**
   * Parses exponentiation (highest precedence: **)
   *
   * Note: Right-associative (e.g., 2 ** 3 ** 2 = 2 ** (3 ** 2))
   * However, we only allow `10 ** n`, so associativity doesn't matter in practice.
   */
  private parseExponentiation(): ASTNode {
    let left = this.parsePrimary();

    if (this.currentToken().type === TokenType.POWER) {
      this.advance();
      const right = this.parseExponentiation(); // Right-associative

      left = {
        type: ASTNodeType.EXPONENTIATION,
        base: left,
        exponent: right,
      } as ExponentiationNode;
    }

    return left;
  }

  /**
   * Parses a primary expression (highest level: literals, identifiers, parentheses)
   */
  private parsePrimary(): ASTNode {
    const token = this.currentToken();

    // Number literal
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return this.parseNumberLiteral(token.value);
    }

    // Decimal literal (only allowed when multiplied by power-of-10)
    if (token.type === TokenType.DECIMAL_LITERAL) {
      return this.parseDecimalLiteral(token);
    }

    // Type bound (type(uintX|intX).max/min)
    if (token.type === TokenType.TYPE_BOUND) {
      this.advance();
      return this.parseTypeBound(token.value);
    }

    // Identifier (variable reference)
    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      return {
        type: ASTNodeType.IDENTIFIER,
        name: token.value,
      } as IdentifierNode;
    }

    // Parenthesized expression
    if (token.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpression();

      if (this.currentToken().type !== TokenType.RPAREN) {
        throw new ParseError('Expected closing parenthesis', this.currentToken().position);
      }

      this.advance();
      return expr;
    }

    throw new ParseError(
      `Unexpected token: ${token.value || token.type}`,
      token.position
    );
  }

  /**
   * Parses a number literal and converts to bigint.
   *
   * Handles:
   * - Regular integers: "1000" → 1000n with 0 decimals
   * - Scale constants: "1e18" → 1n with 18 decimals (treated as scale factor)
   * - Other scientific notation: "5e18" → 5000000000000000000n with 0 decimals
   */
  private parseNumberLiteral(value: string): NumberLiteralNode {
    try {
      // Check if this is a scale constant (1e<n> pattern)
      if (value.toLowerCase().includes('e')) {
        const [mantissaStr, exponentStr] = value.toLowerCase().split('e');

        // If mantissa is exactly "1", treat as scale constant
        if (mantissaStr === '1') {
          const exponent = parseInt(exponentStr!, 10);

          if (isNaN(exponent)) {
            throw new ParseError(`Invalid exponent in scale constant: ${value}`, this.position);
          }

          if (exponent < 0) {
            throw new ParseError(
              `Negative exponents in scale constants are not supported: ${value}`,
              this.position
            );
          }

          // Return as scale constant: 1e18 → {value: 10^18, decimals: 18}
          // This represents "1 with 18 decimals of precision"
          // In fixed-point: 10^18 / 10^18 = 1
          const rawValue = 10n ** BigInt(exponent);
          return {
            type: ASTNodeType.NUMBER_LITERAL,
            value: rawValue,
            decimals: exponent,
          };
        }

        // Otherwise, parse as regular scientific notation
        const bigintValue = this.parseScientificNotation(value);
        return {
          type: ASTNodeType.NUMBER_LITERAL,
          value: bigintValue,
          decimals: 0,
        };
      }

      // Regular integer
      const bigintValue = BigInt(value);
      return {
        type: ASTNodeType.NUMBER_LITERAL,
        value: bigintValue,
        decimals: 0,
      };
    } catch (error) {
      throw new ParseError(`Invalid number: ${value}`, this.position);
    }
  }

  /**
   * Parses a decimal literal (e.g., 8.5).
   *
   * Decimal literals are ONLY allowed when immediately multiplied by a power-of-10
   * that fully absorbs the decimal. This transforms the decimal into a scaled integer.
   *
   * Allowed:
   * - 8.5 * 1e18 → 85 * 1e17
   * - 0.25 * 1e18 → 25 * 1e16
   *
   * Disallowed:
   * - 8.5 / 2 → decimal survives
   * - 8.5 + 1 → decimal survives
   */
  private parseDecimalLiteral(decimalToken: Token): ASTNode {
    this.advance(); // Consume decimal token

    // Check if followed by multiplication
    if (this.currentToken().type !== TokenType.MULTIPLY) {
      throw new ParseError(
        'Decimal literal cannot be represented as an integer.\n\n' +
        'Solidity does not support floating-point math.\n' +
        'Decimals are only allowed when fully scaled by a power of 10.\n\n' +
        'Examples:\n' +
        `  • ${decimalToken.value} * 1e18 ✅\n` +
        `  • ${decimalToken.value} / 2 ❌`,
        decimalToken.position
      );
    }

    this.advance(); // Consume '*'

    // Next token must be a power-of-10 (NUMBER token in scientific notation or 10**n)
    const multiplierToken = this.currentToken();

    if (multiplierToken.type !== TokenType.NUMBER) {
      throw new ParseError(
        `Decimal literal ${decimalToken.value} must be multiplied by a power-of-10 constant (e.g., 1e18, 10**18)`,
        multiplierToken.position
      );
    }

    // Parse the decimal value to extract integer part and decimal places
    const [integerPart, fractionalPart] = decimalToken.value.split('.');
    if (!fractionalPart) {
      throw new ParseError(`Invalid decimal literal: ${decimalToken.value}`, decimalToken.position);
    }

    const decimalPlaces = fractionalPart.length;
    const numerator = BigInt(integerPart + fractionalPart); // e.g., "8.5" → 85n

    // Parse the multiplier (should be a scale constant like 1e18)
    const multiplierValue = this.parseNumberLiteral(multiplierToken.value);

    // Verify that the multiplier's raw value is sufficient to absorb the decimal
    // For scale constants like 1e18, the value is 10^18 and decimals is 18
    // Required: multiplier value >= 10^decimalPlaces
    const requiredMultiplier = 10n ** BigInt(decimalPlaces);

    if (multiplierValue.value < requiredMultiplier) {
      throw new ParseError(
        `Decimal literal ${decimalToken.value} requires multiplication by at least 10^${decimalPlaces} to eliminate decimals.\n` +
        `Use a scale constant like 1e${decimalPlaces} or larger.`,
        multiplierToken.position
      );
    }

    this.advance(); // Consume multiplier

    // Normalize: decimal * scale → (numerator * scale / 10^decimalPlaces)
    // e.g., 8.5 * 1e18 → 85 * (10^18 / 10) = 85 * 10^17
    // The result inherits the decimals from the scale constant
    const normalizedValue = (numerator * multiplierValue.value) / requiredMultiplier;

    return {
      type: ASTNodeType.NUMBER_LITERAL,
      value: normalizedValue,
      decimals: multiplierValue.decimals, // Inherit decimals from the scale constant
    } as NumberLiteralNode;
  }

  /**
   * Converts scientific notation to bigint.
   *
   * Examples:
   * - "1e18" → 1000000000000000000n
   * - "5e3" → 5000n
   * - "1e-6" → error (we don't support fractional literals)
   */
  private parseScientificNotation(value: string): bigint {
    const [mantissaStr, exponentStr] = value.toLowerCase().split('e');

    if (!mantissaStr || !exponentStr) {
      throw new ParseError(`Invalid scientific notation: ${value}`, this.position);
    }

    const mantissa = BigInt(mantissaStr);
    const exponent = parseInt(exponentStr, 10);

    if (isNaN(exponent)) {
      throw new ParseError(`Invalid exponent in scientific notation: ${value}`, this.position);
    }

    // Negative exponents would create fractional values, which we don't support in literals
    if (exponent < 0) {
      throw new ParseError(
        `Negative exponents in literals are not supported: ${value}. Use division instead.`,
        this.position
      );
    }

    // Calculate mantissa * 10^exponent
    const multiplier = 10n ** BigInt(exponent);
    return mantissa * multiplier;
  }

  /**
   * Parses a Solidity type bound and calculates its value.
   *
   * Examples:
   * - "type(uint256).max" → 2^256 - 1
   * - "type(uint128).max" → 2^128 - 1
   * - "type(int256).max" → 2^255 - 1
   * - "type(int256).min" → -2^255
   * - "type(uint256).min" → 0
   *
   * CRITICAL: All type bounds are scalars (decimals = 0).
   */
  private parseTypeBound(value: string): TypeBoundLiteralNode {
    // Extract components: type(uint256).max → type="uint256", bound="max"
    const match = value.match(/^type\((u?int)(\d+)?\)\.(max|min)$/);

    if (!match) {
      throw new ParseError(`Invalid type bound: ${value}`, this.position);
    }

    const isSigned = match[1] === 'int';
    const bitsStr = match[2] || '256';
    const bound = match[3] as 'max' | 'min';
    const bits = parseInt(bitsStr, 10);

    // Construct the type name
    const solidityType = `${isSigned ? 'int' : 'uint'}${bitsStr}`;

    // Calculate the bound value
    let boundValue: bigint;

    if (!isSigned) {
      // Unsigned: uintX
      if (bound === 'max') {
        // 2^bits - 1
        boundValue = (2n ** BigInt(bits)) - 1n;
      } else {
        // min is always 0 for unsigned
        boundValue = 0n;
      }
    } else {
      // Signed: intX
      if (bound === 'max') {
        // 2^(bits-1) - 1
        boundValue = (2n ** BigInt(bits - 1)) - 1n;
      } else {
        // -2^(bits-1)
        boundValue = -(2n ** BigInt(bits - 1));
      }
    }

    return {
      type: ASTNodeType.TYPE_BOUND_LITERAL,
      value: boundValue,
      decimals: 0,  // ALWAYS 0 - type bounds are scalars
      solidityType,
      bound,
    };
  }

  /**
   * Returns the current token without consuming it.
   */
  private currentToken(): Token {
    return this.tokens[this.position] || this.tokens[this.tokens.length - 1]!;
  }

  /**
   * Advances to the next token.
   */
  private advance(): void {
    if (this.position < this.tokens.length - 1) {
      this.position++;
    }
  }
}

/**
 * Main parsing function.
 *
 * @param tokens - Array of tokens from the tokenizer
 * @returns AST root node
 */
export function parse(tokens: Token[]): ASTNode {
  const parser = new Parser(tokens);
  return parser.parse();
}
