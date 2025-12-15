/**
 * SolCalc Evaluator
 *
 * This is the core evaluation engine that:
 * - Evaluates AST nodes recursively
 * - Applies decimal propagation rules
 * - Validates exponentiation restrictions
 * - Calculates final results with rounding
 */

import {
  ASTNode,
  ASTNodeType,
  Variable,
  EvaluatedValue,
  EvaluationResult,
  RoundingMode,
  DivisionByZeroError,
  UndefinedVariableError,
  MissingDecimalsError,
  InvalidExponentiationError,
  NumberLiteralNode,
  IdentifierNode,
  BinaryOpNode,
  ExponentiationNode,
} from '../types';
import {
  multiplyDecimals,
  divideDecimals,
  addDecimals,
  subtractDecimals,
  formatWithDecimals,
} from './decimals';
import { applyRounding, calculateRoundingLoss } from './rounding';

/**
 * Evaluates an expression AST with given variable values.
 *
 * @param ast - The AST to evaluate
 * @param variables - Map of variable names to their values and decimals
 * @returns Evaluation result
 */
export function evaluate(
  ast: ASTNode,
  variables: Map<string, Variable>
): EvaluationResult {
  // Evaluate the AST to get raw value and decimals
  const result = evaluateNode(ast, variables);

  // Format human-readable representation
  const human = formatWithDecimals(result.value, result.decimals);

  // Calculate Solidity-accurate result (no rounding if decimals already 0)
  // For the "solidity" field, we don't change decimals - we just show what
  // Solidity would produce. The rounding applies when scaling to a specific target.
  const solidity = result.value;

  // Rounding loss is 0 unless we're scaling to a different decimal count
  // For now, we'll calculate it as 0 since we're not scaling by default
  const roundingLoss = '0';

  return {
    raw: result.value,
    decimals: result.decimals,
    human,
    solidity,
    roundingLoss,
  };
}

/**
 * Recursively evaluates an AST node.
 *
 * @param node - The AST node to evaluate
 * @param variables - Variable definitions
 * @returns Evaluated value with decimals
 */
function evaluateNode(node: ASTNode, variables: Map<string, Variable>): EvaluatedValue {
  switch (node.type) {
    case ASTNodeType.NUMBER_LITERAL:
      return evaluateNumberLiteral(node as NumberLiteralNode);

    case ASTNodeType.IDENTIFIER:
      return evaluateIdentifier(node as IdentifierNode, variables);

    case ASTNodeType.BINARY_OP:
      return evaluateBinaryOp(node as BinaryOpNode, variables);

    case ASTNodeType.EXPONENTIATION:
      return evaluateExponentiation(node as ExponentiationNode, variables);

    default:
      // This should never happen with proper TypeScript typing
      throw new Error(`Unknown AST node type: ${(node as any).type}`);
  }
}

/**
 * Evaluates a number literal node.
 */
function evaluateNumberLiteral(node: NumberLiteralNode): EvaluatedValue {
  return {
    value: node.value,
    decimals: node.decimals, // Always 0 for literals
  };
}

/**
 * Evaluates an identifier (variable reference).
 */
function evaluateIdentifier(node: IdentifierNode, variables: Map<string, Variable>): EvaluatedValue {
  const variable = variables.get(node.name);

  if (!variable) {
    throw new UndefinedVariableError(node.name);
  }

  // Validate that decimals are set
  if (variable.decimals === null || variable.decimals === undefined) {
    throw new MissingDecimalsError(node.name);
  }

  if (variable.decimals < 0) {
    throw new Error(`Variable "${node.name}" has negative decimals: ${variable.decimals}. Variables must have decimals >= 0.`);
  }

  return {
    value: variable.value,
    decimals: variable.decimals,
  };
}

/**
 * Evaluates a binary operation (+, -, *, /).
 */
function evaluateBinaryOp(node: BinaryOpNode, variables: Map<string, Variable>): EvaluatedValue {
  const left = evaluateNode(node.left, variables);
  const right = evaluateNode(node.right, variables);

  switch (node.operator) {
    case '+':
      return {
        value: left.value + right.value,
        decimals: addDecimals(left.decimals, right.decimals),
      };

    case '-':
      return {
        value: left.value - right.value,
        decimals: subtractDecimals(left.decimals, right.decimals),
      };

    case '*':
      return {
        value: left.value * right.value,
        decimals: multiplyDecimals(left.decimals, right.decimals),
      };

    case '/':
      if (right.value === 0n) {
        throw new DivisionByZeroError();
      }
      return {
        value: left.value / right.value, // Integer division (truncates)
        decimals: divideDecimals(left.decimals, right.decimals),
      };

    default:
      throw new Error(`Unknown operator: ${node.operator}`);
  }
}

/**
 * Evaluates exponentiation with strict validation.
 *
 * CRITICAL RESTRICTION: Only `10 ** n` is allowed where:
 * - base must be literal 10
 * - exponent must evaluate to decimals = 0 (dimensionless)
 *
 * The result is treated as a scaling factor:
 * - value = 1
 * - decimals = n (the exponent value)
 */
function evaluateExponentiation(
  node: ExponentiationNode,
  variables: Map<string, Variable>
): EvaluatedValue {
  // Validate that base is a literal 10
  if (node.base.type !== ASTNodeType.NUMBER_LITERAL) {
    throw new InvalidExponentiationError('base must be literal 10');
  }

  const baseNode = node.base as NumberLiteralNode;
  if (baseNode.value !== 10n) {
    throw new InvalidExponentiationError(`base must be 10, got ${baseNode.value}`);
  }

  // Evaluate the exponent
  const exponent = evaluateNode(node.exponent, variables);

  // Validate that exponent is dimensionless (decimals = 0)
  if (exponent.decimals !== 0) {
    throw new InvalidExponentiationError(
      `exponent must be dimensionless (decimals = 0), got decimals = ${exponent.decimals}`
    );
  }

  // Convert exponent value to number (must fit in JavaScript number range)
  const exponentNum = Number(exponent.value);
  if (!Number.isSafeInteger(exponentNum)) {
    throw new InvalidExponentiationError(
      `exponent value too large: ${exponent.value}. Must fit in safe integer range.`
    );
  }

  // Return scaling factor: 10 ** n is represented as { value: 1, decimals: n }
  // This represents a pure scaling factor, not a computed power
  return {
    value: 1n,
    decimals: exponentNum,
  };
}

/**
 * Evaluates an expression and scales the result to target decimals.
 *
 * This is used when the UI specifies expected output decimals.
 *
 * @param ast - The AST to evaluate
 * @param variables - Variable definitions
 * @param targetDecimals - Expected output decimals
 * @param roundingMode - Rounding mode to apply
 * @returns Evaluation result scaled to target decimals
 */
export function evaluateWithTargetDecimals(
  ast: ASTNode,
  variables: Map<string, Variable>,
  targetDecimals: number,
  roundingMode: RoundingMode = 'floor'
): EvaluationResult {
  // Evaluate without scaling
  const result = evaluateNode(ast, variables);

  // Scale to target decimals with rounding
  const scaledValue = applyRounding(result.value, result.decimals, targetDecimals, roundingMode);

  // Calculate rounding loss
  const loss = calculateRoundingLoss(result.value, scaledValue, result.decimals, targetDecimals);

  // Format outputs
  const raw = result.value;
  const human = formatWithDecimals(result.value, result.decimals);
  const solidity = scaledValue;
  const roundingLoss = formatWithDecimals(loss, result.decimals);

  return {
    raw,
    decimals: result.decimals,
    human,
    solidity,
    roundingLoss,
  };
}
