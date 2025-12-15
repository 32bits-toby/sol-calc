/**
 * SolCalc Core Types
 *
 * This file defines all types used throughout the core engine.
 * These types are the contract between parser, evaluator, and consumers.
 */

// ============================================================================
// Rounding Mode
// ============================================================================

export type RoundingMode = 'floor' | 'ceil';

// ============================================================================
// Variable Definition
// ============================================================================

/**
 * A variable with its value and decimal scale.
 *
 * Invariants:
 * - value is always a bigint (never floating point)
 * - decimals >= 0 (negative decimals not allowed for variables)
 * - decimals = 0 means dimensionless scalar
 * - decimals > 0 means unit-bearing value
 */
export interface Variable {
  name: string;
  value: bigint;
  decimals: number;
}

// ============================================================================
// Token Types (Lexer Output)
// ============================================================================

export enum TokenType {
  NUMBER = 'NUMBER',           // Integer literal or scientific notation
  IDENTIFIER = 'IDENTIFIER',   // Variable name
  PLUS = 'PLUS',               // +
  MINUS = 'MINUS',             // -
  MULTIPLY = 'MULTIPLY',       // *
  DIVIDE = 'DIVIDE',           // /
  POWER = 'POWER',             // **
  LPAREN = 'LPAREN',           // (
  RPAREN = 'RPAREN',           // )
  EOF = 'EOF',                 // End of input
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ============================================================================
// AST Node Types (Parser Output)
// ============================================================================

export enum ASTNodeType {
  NUMBER_LITERAL = 'NUMBER_LITERAL',
  IDENTIFIER = 'IDENTIFIER',
  BINARY_OP = 'BINARY_OP',
  EXPONENTIATION = 'EXPONENTIATION',
}

/**
 * Represents a numeric literal in the expression.
 *
 * Examples:
 * - "1000" → { value: 1000n, decimals: 0 }
 * - "1e18" → { value: 1000000000000000000n, decimals: 0 }
 */
export interface NumberLiteralNode {
  type: ASTNodeType.NUMBER_LITERAL;
  value: bigint;
  decimals: number;  // Always 0 for literals
}

/**
 * Represents a variable reference in the expression.
 */
export interface IdentifierNode {
  type: ASTNodeType.IDENTIFIER;
  name: string;
}

/**
 * Represents a binary operation (+, -, *, /).
 */
export interface BinaryOpNode {
  type: ASTNodeType.BINARY_OP;
  operator: '+' | '-' | '*' | '/';
  left: ASTNode;
  right: ASTNode;
}

/**
 * Represents exponentiation.
 *
 * CRITICAL RESTRICTION: Only `10 ** n` is allowed where:
 * - base must be literal 10
 * - exponent must evaluate to a dimensionless integer (decimals = 0)
 *
 * This is not general exponentiation - it's explicit decimal scaling.
 */
export interface ExponentiationNode {
  type: ASTNodeType.EXPONENTIATION;
  base: ASTNode;      // Must be NumberLiteralNode with value 10n
  exponent: ASTNode;  // Must evaluate to decimals = 0
}

export type ASTNode =
  | NumberLiteralNode
  | IdentifierNode
  | BinaryOpNode
  | ExponentiationNode;

// ============================================================================
// Evaluated Value (Internal)
// ============================================================================

/**
 * Represents a value during evaluation with its decimal scale.
 *
 * This is the internal representation used during computation.
 * All arithmetic operations produce an EvaluatedValue.
 */
export interface EvaluatedValue {
  value: bigint;
  decimals: number;

  /**
   * If this value resulted from a division with a non-zero remainder,
   * these fields track the remainder for loss calculation.
   */
  divisionRemainder?: bigint;
  divisionDivisor?: bigint;
  divisionResultDecimals?: number;
}

// ============================================================================
// Evaluation Result (Output)
// ============================================================================

/**
 * The final result of evaluating an expression.
 *
 * This is what the UI consumes.
 */
export interface EvaluationResult {
  /**
   * The raw integer result (no decimal adjustment).
   */
  raw: bigint;

  /**
   * The number of decimals in the result.
   */
  decimals: number;

  /**
   * Human-readable decimal representation.
   * Example: "1.5" for value=1500000000000000000n, decimals=18
   */
  human: string;

  /**
   * The Solidity-accurate result after applying rounding.
   * This is what Solidity would produce with the given rounding mode.
   */
  solidity: bigint;

  /**
   * Description of rounding loss, if any.
   * Example: "0.000000000000000001" or "0" if no loss
   */
  roundingLoss: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class SolCalcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolCalcError';
  }
}

export class ParseError extends SolCalcError {
  constructor(message: string, public position?: number) {
    super(message);
    this.name = 'ParseError';
  }
}

export class EvaluationError extends SolCalcError {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationError';
  }
}

export class DecimalMismatchError extends EvaluationError {
  constructor(
    public leftDecimals: number,
    public rightDecimals: number,
    public operator: '+' | '-'
  ) {
    super(
      `Decimal mismatch in ${operator}: left has ${leftDecimals} decimals, right has ${rightDecimals} decimals. ` +
      `Addition and subtraction require matching decimals.`
    );
    this.name = 'DecimalMismatchError';
  }
}

export class InvalidExponentiationError extends EvaluationError {
  constructor(message: string) {
    super(`Invalid exponentiation: ${message}. Only \`10 ** n\` with dimensionless integer n is supported.`);
    this.name = 'InvalidExponentiationError';
  }
}

export class DivisionByZeroError extends EvaluationError {
  constructor() {
    super('Division by zero');
    this.name = 'DivisionByZeroError';
  }
}

export class UndefinedVariableError extends EvaluationError {
  constructor(public variableName: string) {
    super(`Variable "${variableName}" is not defined. All variables must have explicit values and decimals.`);
    this.name = 'UndefinedVariableError';
  }
}

export class MissingDecimalsError extends EvaluationError {
  constructor(public variableName: string) {
    super(`Variable "${variableName}" is missing decimals. All variables must have explicit decimals >= 0.`);
    this.name = 'MissingDecimalsError';
  }
}
