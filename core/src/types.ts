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
  NUMBER = 'NUMBER',                   // Integer literal or scientific notation
  DECIMAL_LITERAL = 'DECIMAL_LITERAL', // Decimal literal (8.5) - only allowed when absorbed by power-of-10
  IDENTIFIER = 'IDENTIFIER',           // Variable name
  TYPE_BOUND = 'TYPE_BOUND',           // type(uintX).max/min or type(intX).max/min
  PLUS = 'PLUS',                       // +
  MINUS = 'MINUS',                     // -
  MULTIPLY = 'MULTIPLY',               // *
  DIVIDE = 'DIVIDE',                   // /
  POWER = 'POWER',                     // **
  LPAREN = 'LPAREN',                   // (
  RPAREN = 'RPAREN',                   // )
  EQUAL = 'EQUAL',                     // ==
  NOT_EQUAL = 'NOT_EQUAL',             // !=
  LESS_THAN = 'LESS_THAN',             // <
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',     // <=
  GREATER_THAN = 'GREATER_THAN',       // >
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL', // >=
  EOF = 'EOF',                         // End of input
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
  TYPE_BOUND_LITERAL = 'TYPE_BOUND_LITERAL',
  IDENTIFIER = 'IDENTIFIER',
  BINARY_OP = 'BINARY_OP',
  EXPONENTIATION = 'EXPONENTIATION',
  COMPARISON = 'COMPARISON',
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
 * Represents a Solidity type bound (type(uintX).max/min or type(intX).max/min).
 *
 * Examples:
 * - "type(uint256).max" → { value: 2n**256n - 1n, decimals: 0, solidityType: "uint256", bound: "max" }
 * - "type(int128).min" → { value: -(2n**127n), decimals: 0, solidityType: "int128", bound: "min" }
 *
 * CRITICAL: Type bounds are ALWAYS scalars (decimals = 0).
 */
export interface TypeBoundLiteralNode {
  type: ASTNodeType.TYPE_BOUND_LITERAL;
  value: bigint;
  decimals: number;  // Always 0 for type bounds
  solidityType: string;  // e.g., "uint256", "int128"
  bound: 'max' | 'min';
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

/**
 * Represents a comparison operation (==, !=, <, <=, >, >=).
 *
 * CRITICAL RESTRICTIONS:
 * - Exactly ONE comparison per expression (no chaining)
 * - Both sides must evaluate to the same decimal scale
 * - Comparisons are evaluated AFTER numeric evaluation (Phase 2)
 * - Result is boolean, not numeric
 *
 * This is not arithmetic - it's a read-only comparison layer.
 */
export interface ComparisonNode {
  type: ASTNodeType.COMPARISON;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=';
  left: ASTNode;   // Arithmetic expression (no nested comparisons)
  right: ASTNode;  // Arithmetic expression (no nested comparisons)
}

export type ASTNode =
  | NumberLiteralNode
  | TypeBoundLiteralNode
  | IdentifierNode
  | BinaryOpNode
  | ExponentiationNode
  | ComparisonNode;

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
 * Warning about overflow/underflow when using type bounds.
 */
export interface OverflowWarning {
  /**
   * The Solidity type that would overflow/underflow.
   */
  solidityType: string;

  /**
   * Whether this is an overflow (exceeds max) or underflow (below min).
   */
  kind: 'overflow' | 'underflow';

  /**
   * The value after wrapping according to Solidity semantics.
   */
  wrappedValue: bigint;

  /**
   * Human-readable wrapped value.
   */
  wrappedHuman: string;
}

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

  /**
   * Optional warning if the result would overflow/underflow in Solidity.
   * This is informational only and does not affect the computed result.
   */
  warning?: OverflowWarning;
}

/**
 * The final result of evaluating a comparison expression.
 *
 * This is separate from EvaluationResult because comparisons produce boolean results.
 * Phase 1 (numeric evaluation) must complete successfully before Phase 2 (comparison).
 */
export interface ComparisonResult {
  /**
   * The boolean result of the comparison.
   */
  result: boolean;

  /**
   * The comparison operator used.
   */
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=';

  /**
   * Human-readable representation of the left operand.
   */
  leftHuman: string;

  /**
   * Human-readable representation of the right operand.
   */
  rightHuman: string;

  /**
   * The decimal scale (both sides must match, so we only store one value).
   */
  decimals: number;

  /**
   * Optional overflow warning from the numeric evaluation phase.
   */
  warning?: OverflowWarning;
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

export class ComparisonError extends EvaluationError {
  constructor(message: string) {
    super(message);
    this.name = 'ComparisonError';
  }
}

export class ComparisonDecimalMismatchError extends ComparisonError {
  constructor(
    public leftDecimals: number,
    public rightDecimals: number
  ) {
    super(
      `Cannot compare values with different decimals (${leftDecimals} vs ${rightDecimals}). ` +
      `Normalize decimals explicitly before comparison.`
    );
    this.name = 'ComparisonDecimalMismatchError';
  }
}
