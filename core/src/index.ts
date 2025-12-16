/**
 * SolCalc Core Engine
 *
 * Public API for the SolCalc calculation engine.
 * This is the only file that UI and extension code should import from.
 */

// Re-export types
export type {
  Variable,
  EvaluationResult,
  RoundingMode,
  Token,
  TokenType,
  ASTNode,
  EvaluatedValue,
} from './types.js';

// Re-export errors
export {
  SolCalcError,
  ParseError,
  EvaluationError,
  DecimalMismatchError,
  InvalidExponentiationError,
  DivisionByZeroError,
  UndefinedVariableError,
  MissingDecimalsError,
} from './types.js';

// Re-export core functions
export { tokenize } from './parser/tokenize.js';
export { parse } from './parser/parse.js';
export { evaluate, evaluateWithTargetDecimals } from './evaluator/evaluate.js';
export { formatWithDecimals } from './evaluator/decimals.js';

import { tokenize } from './parser/tokenize.js';
import { parse } from './parser/parse.js';
import { evaluate, evaluateWithTargetDecimals } from './evaluator/evaluate.js';
import { Variable, EvaluationResult, RoundingMode, ASTNode, IdentifierNode, ASTNodeType } from './types.js';

/**
 * High-level function to evaluate an expression string.
 *
 * This is the main entry point for simple evaluation.
 *
 * @param expression - The expression to evaluate
 * @param variables - Map of variable names to their definitions
 * @param roundingMode - Rounding mode for division (default: 'floor')
 * @returns Evaluation result
 */
export function evaluateExpression(
  expression: string,
  variables: Map<string, Variable>,
  roundingMode: RoundingMode = 'floor'
): EvaluationResult {
  const tokens = tokenize(expression);
  const ast = parse(tokens);
  return evaluate(ast, variables, roundingMode);
}

/**
 * High-level function to evaluate an expression with target decimals.
 *
 * @param expression - The expression to evaluate
 * @param variables - Map of variable names to their definitions
 * @param targetDecimals - Expected output decimals
 * @param roundingMode - Rounding mode (default: 'floor')
 * @returns Evaluation result scaled to target decimals
 */
export function evaluateExpressionWithTarget(
  expression: string,
  variables: Map<string, Variable>,
  targetDecimals: number,
  roundingMode: RoundingMode = 'floor'
): EvaluationResult {
  const tokens = tokenize(expression);
  const ast = parse(tokens);
  return evaluateWithTargetDecimals(ast, variables, targetDecimals, roundingMode);
}

/**
 * Extracts variable names from an expression.
 *
 * This is useful for the UI to know which variables need values/decimals.
 *
 * @param expression - The expression to analyze
 * @returns Set of variable names found in the expression
 */
export function extractVariables(expression: string): Set<string> {
  try {
    const tokens = tokenize(expression);
    const ast = parse(tokens);
    return extractVariablesFromAST(ast);
  } catch {
    // If parsing fails, return empty set
    return new Set();
  }
}

/**
 * Recursively extracts variable names from an AST.
 */
function extractVariablesFromAST(node: ASTNode): Set<string> {
  const variables = new Set<string>();

  function visit(n: ASTNode): void {
    if (n.type === ASTNodeType.IDENTIFIER) {
      variables.add((n as IdentifierNode).name);
    } else if (n.type === ASTNodeType.BINARY_OP) {
      const binOp = n as any;
      visit(binOp.left);
      visit(binOp.right);
    } else if (n.type === ASTNodeType.EXPONENTIATION) {
      const exp = n as any;
      visit(exp.base);
      visit(exp.exponent);
    }
    // NUMBER_LITERAL has no children to visit
  }

  visit(node);
  return variables;
}
