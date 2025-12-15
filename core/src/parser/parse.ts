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
  IdentifierNode,
  BinaryOpNode,
  ExponentiationNode,
  ParseError,
} from '../types';

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
