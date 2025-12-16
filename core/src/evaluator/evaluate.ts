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
  ComparisonResult,
  RoundingMode,
  OverflowWarning,
  DivisionByZeroError,
  UndefinedVariableError,
  MissingDecimalsError,
  InvalidExponentiationError,
  ComparisonDecimalMismatchError,
  NumberLiteralNode,
  TypeBoundLiteralNode,
  IdentifierNode,
  BinaryOpNode,
  ExponentiationNode,
  ComparisonNode,
} from '../types.js';
import {
  multiplyDecimals,
  divideDecimals,
  addDecimals,
  subtractDecimals,
  formatWithDecimals,
  trimTrailingZeros,
} from './decimals.js';
import { applyRounding, calculateRoundingLoss } from './rounding.js';

/**
 * Evaluates an expression AST with given variable values.
 *
 * @param ast - The AST to evaluate
 * @param variables - Map of variable names to their values and decimals
 * @param roundingMode - Rounding mode to apply for division (default: floor)
 * @returns Evaluation result
 */
export function evaluate(
  ast: ASTNode,
  variables: Map<string, Variable>,
  roundingMode: RoundingMode = 'floor'
): EvaluationResult {
  // Track type bounds used in the expression for overflow detection
  const typeBounds = new Set<string>();

  // Evaluate the AST to get raw value and decimals
  const result = evaluateNode(ast, variables, roundingMode, typeBounds);

  // Format human-readable representation
  const human = formatWithDecimals(result.value, result.decimals);

  // Calculate Solidity-accurate result (no rounding if decimals already 0)
  // For the "solidity" field, we don't change decimals - we just show what
  // Solidity would produce. The rounding applies when scaling to a specific target.
  const solidity = result.value;

  // Calculate rounding loss from division remainder if present
  let roundingLoss = '0';
  if (result.divisionRemainder && result.divisionDivisor && result.divisionResultDecimals !== undefined) {
    const rawLoss = calculateDivisionLoss(
      result.divisionRemainder,
      result.divisionDivisor,
      result.divisionResultDecimals,
      roundingMode
    );
    // Trim trailing zeros for clean display (e.g., "0.5" instead of "0.500000...")
    roundingLoss = trimTrailingZeros(rawLoss);
  }

  // Check for overflow/underflow if type bounds were used AND result is a pure scalar
  // Only scalars (decimals = 0) can overflow in Solidity integer arithmetic
  const warning = result.decimals === 0 ? detectOverflow(result.value, typeBounds) : undefined;

  return {
    raw: result.value,
    decimals: result.decimals,
    human,
    solidity,
    roundingLoss,
    warning,
  };
}

/**
 * Recursively evaluates an AST node.
 *
 * @param node - The AST node to evaluate
 * @param variables - Variable definitions
 * @param roundingMode - Rounding mode for division operations
 * @returns Evaluated value with decimals
 */
function evaluateNode(
  node: ASTNode,
  variables: Map<string, Variable>,
  roundingMode: RoundingMode,
  typeBounds?: Set<string>
): EvaluatedValue {
  switch (node.type) {
    case ASTNodeType.NUMBER_LITERAL:
      return evaluateNumberLiteral(node as NumberLiteralNode);

    case ASTNodeType.TYPE_BOUND_LITERAL:
      return evaluateTypeBoundLiteral(node as TypeBoundLiteralNode, typeBounds);

    case ASTNodeType.IDENTIFIER:
      return evaluateIdentifier(node as IdentifierNode, variables);

    case ASTNodeType.BINARY_OP:
      return evaluateBinaryOp(node as BinaryOpNode, variables, roundingMode, typeBounds);

    case ASTNodeType.EXPONENTIATION:
      return evaluateExponentiation(node as ExponentiationNode, variables, roundingMode, typeBounds);

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
 * Evaluates a type bound literal node.
 *
 * Type bounds are always scalars (decimals = 0).
 * If a typeBounds set is provided, track the type for overflow detection.
 */
function evaluateTypeBoundLiteral(node: TypeBoundLiteralNode, typeBounds?: Set<string>): EvaluatedValue {
  // Track the type bound for overflow detection
  if (typeBounds) {
    typeBounds.add(node.solidityType);
  }

  return {
    value: node.value,
    decimals: 0,  // Type bounds are always scalars
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
function evaluateBinaryOp(node: BinaryOpNode, variables: Map<string, Variable>, roundingMode: RoundingMode, typeBounds?: Set<string>): EvaluatedValue {
  // Special handling for addition/subtraction with scalar literal coercion
  if (node.operator === '+' || node.operator === '-') {
    const left = evaluateNode(node.left, variables, roundingMode, typeBounds);
    const right = evaluateNode(node.right, variables, roundingMode, typeBounds);

    // Scalar literal coercion: if a literal scalar is added/subtracted with a fixed-point value,
    // lift the scalar to match the fixed-point value's decimals.
    // This makes "1e18 + 1" work intuitively (meaning "add 1 wei" not "add 1 token").
    let finalLeft = left;
    let finalRight = right;

    // Check if left is a scalar literal (decimals=0 from a NumberLiteralNode)
    const leftIsScalarLiteral = node.left.type === ASTNodeType.NUMBER_LITERAL && left.decimals === 0;
    const rightIsScalarLiteral = node.right.type === ASTNodeType.NUMBER_LITERAL && right.decimals === 0;

    // If left is a scalar literal and right has decimals, lift left
    if (leftIsScalarLiteral && right.decimals > 0) {
      finalLeft = {
        ...left,
        decimals: right.decimals, // Lift to match right's decimals
      };
    }
    // If right is a scalar literal and left has decimals, lift right
    else if (rightIsScalarLiteral && left.decimals > 0) {
      finalRight = {
        ...right,
        decimals: left.decimals, // Lift to match left's decimals
      };
    }

    // Perform the operation with potentially lifted values
    if (node.operator === '+') {
      return {
        value: finalLeft.value + finalRight.value,
        decimals: addDecimals(finalLeft.decimals, finalRight.decimals),
      };
    } else {
      return {
        value: finalLeft.value - finalRight.value,
        decimals: subtractDecimals(finalLeft.decimals, finalRight.decimals),
      };
    }
  }

  // For other operators (*, /), evaluate normally
  const left = evaluateNode(node.left, variables, roundingMode, typeBounds);
  const right = evaluateNode(node.right, variables, roundingMode, typeBounds);

  if (node.operator === '*') {
    return {
      value: left.value * right.value,
      decimals: multiplyDecimals(left.decimals, right.decimals),
    };
  }

  if (node.operator === '/') {
    if (right.value === 0n) {
      throw new DivisionByZeroError();
    }

    const remainder = left.value % right.value;
    let quotient: bigint;

    // Apply rounding mode
    if (roundingMode === 'floor') {
      // Floor division (default BigInt behavior)
      quotient = left.value / right.value;
    } else {
      // Ceil division: (a + b - 1) / b
      // Only apply ceil adjustment if there's a remainder
      if (remainder === 0n) {
        quotient = left.value / right.value;
      } else {
        quotient = (left.value + right.value - 1n) / right.value;
      }
    }

    const resultDecimals = divideDecimals(left.decimals, right.decimals);

    return {
      value: quotient,
      decimals: resultDecimals,
      // Track remainder for loss calculation
      divisionRemainder: remainder !== 0n ? remainder : undefined,
      divisionDivisor: remainder !== 0n ? right.value : undefined,
      divisionResultDecimals: remainder !== 0n ? resultDecimals : undefined,
    };
  }

  throw new Error(`Unknown operator: ${node.operator}`);
}

/**
 * Evaluates exponentiation with strict validation.
 *
 * CRITICAL RESTRICTION: Only `10 ** n` is allowed where:
 * - base must be literal 10
 * - exponent must evaluate to decimals = 0 (dimensionless)
 *
 * The result is ALWAYS a pure scalar with decimals = 0:
 * - value = 10^n (computed power)
 * - decimals = 0 (NOT a scaled value)
 *
 * This is a scale constructor, not fixed-point math.
 */
function evaluateExponentiation(
  node: ExponentiationNode,
  variables: Map<string, Variable>,
  roundingMode: RoundingMode,
  typeBounds?: Set<string>
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
  const exponent = evaluateNode(node.exponent, variables, roundingMode, typeBounds);

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

  // Validate non-negative exponent
  if (exponentNum < 0) {
    throw new InvalidExponentiationError(
      `exponent must be non-negative, got ${exponentNum}`
    );
  }

  // Compute power as scale constant: 10 ** n → {10^n, decimals: n}
  // This represents "1 with n decimals of precision"
  // In fixed-point: 10^n / 10^n = 1
  // When dividing by this, we remove 10^n from raw AND subtract n from decimals
  const powerValue = 10n ** BigInt(exponentNum);
  return {
    value: powerValue,
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
  // Track type bounds for overflow detection
  const typeBounds = new Set<string>();

  // Evaluate without scaling
  const result = evaluateNode(ast, variables, roundingMode, typeBounds);

  // Scale to target decimals with rounding
  const scaledValue = applyRounding(result.value, result.decimals, targetDecimals, roundingMode);

  // Calculate rounding loss
  const loss = calculateRoundingLoss(result.value, scaledValue, result.decimals, targetDecimals);

  // Format outputs
  const raw = result.value;
  const human = formatWithDecimals(result.value, result.decimals);
  const solidity = scaledValue;
  const roundingLoss = formatWithDecimals(loss, result.decimals);

  // Check for overflow/underflow if type bounds were used AND result is a pure scalar
  // Only scalars (decimals = 0) can overflow in Solidity integer arithmetic
  const warning = result.decimals === 0 ? detectOverflow(result.value, typeBounds) : undefined;

  return {
    raw,
    decimals: result.decimals,
    human,
    solidity,
    roundingLoss,
    warning,
  };
}

/**
 * Calculates rounding loss from a division operation.
 *
 * When integer division has a non-zero remainder, this calculates the
 * fractional part that was lost due to truncation.
 *
 * Floor: loss = (remainder / divisor) / 10^resultDecimals (positive)
 * Ceil:  loss = -((divisor - remainder) / divisor) / 10^resultDecimals (negative)
 *
 * Example Floor: (3 * 1e18) / 7
 * - remainder = 3, divisor = 7, exact = 3.5, floor = 3
 * - loss = (3/7) / 10^18 ≈ +0.000000000000000428571...
 *
 * Example Ceil: 7 / 2
 * - remainder = 1, divisor = 2, exact = 3.5, ceil = 4
 * - loss = -(1/2) = -0.5 (over-allocation)
 *
 * @param remainder - The remainder from integer division
 * @param divisor - The divisor used in the division
 * @param resultDecimals - The decimal places in the result
 * @param roundingMode - The rounding mode applied
 * @returns Formatted loss as a decimal string
 */
function calculateDivisionLoss(
  remainder: bigint,
  divisor: bigint,
  resultDecimals: number,
  roundingMode: RoundingMode
): string {
  if (remainder === 0n) {
    return '0';
  }

  // For Floor: loss = remainder / divisor (positive - under-allocation)
  // For Ceil: loss = -(divisor - remainder) / divisor (negative - over-allocation)
  const lossNumerator = roundingMode === 'floor' ? remainder : -(divisor - remainder);
  const isNegative = lossNumerator < 0n;
  const absNumerator = isNegative ? -lossNumerator : lossNumerator;

  // Calculate (lossNumerator / divisor) with high precision
  const precision = 50; // 50 decimal places of precision
  const scaledNumerator = absNumerator * (10n ** BigInt(precision));
  const fractionWithPrecision = scaledNumerator / divisor;

  // Format as decimal: fractionWithPrecision / 10^(precision + resultDecimals)
  const formatted = formatWithDecimals(fractionWithPrecision, precision + resultDecimals);

  // Add negative sign for ceil
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Detects if a value would overflow/underflow any of the used Solidity types.
 *
 * Returns a warning if overflow is detected, otherwise undefined.
 *
 * @param value - The computed result value
 * @param typeBounds - Set of Solidity types used in the expression
 * @returns OverflowWarning if overflow detected, undefined otherwise
 */
function detectOverflow(value: bigint, typeBounds: Set<string>): OverflowWarning | undefined {
  if (typeBounds.size === 0) {
    return undefined;
  }

  // Check each type bound to see if the value overflows
  for (const solidityType of typeBounds) {
    const match = solidityType.match(/^(u?int)(\d+)$/);
    if (!match) {
      continue;
    }

    const isSigned = match[1] === 'int';
    const bits = parseInt(match[2]!, 10);

    let min: bigint;
    let max: bigint;

    if (!isSigned) {
      // Unsigned: uintX
      min = 0n;
      max = (2n ** BigInt(bits)) - 1n;
    } else {
      // Signed: intX
      min = -(2n ** BigInt(bits - 1));
      max = (2n ** BigInt(bits - 1)) - 1n;
    }

    // Check if value is outside the range
    if (value > max) {
      // Overflow
      const wrappedValue = calculateWrappedValue(value, bits, isSigned);
      const wrappedHuman = wrappedValue.toString();

      return {
        solidityType,
        kind: 'overflow',
        wrappedValue,
        wrappedHuman,
      };
    } else if (value < min) {
      // Underflow
      const wrappedValue = calculateWrappedValue(value, bits, isSigned);
      const wrappedHuman = wrappedValue.toString();

      return {
        solidityType,
        kind: 'underflow',
        wrappedValue,
        wrappedHuman,
      };
    }
  }

  return undefined;
}

/**
 * Calculates the wrapped value according to Solidity semantics.
 *
 * Unsigned (uintX): wrapped = value mod (2^bits)
 * Signed (intX):   wrapped = ((value mod range) + range) mod range
 *                  then convert to signed representation
 *
 * @param value - The value that overflows
 * @param bits - The bit size of the type
 * @param isSigned - Whether the type is signed
 * @returns The wrapped value
 */
function calculateWrappedValue(value: bigint, bits: number, isSigned: boolean): bigint {
  const range = 2n ** BigInt(bits);

  if (!isSigned) {
    // Unsigned: simple modulo
    let wrapped = value % range;
    // Handle negative values (bring into positive range)
    if (wrapped < 0n) {
      wrapped += range;
    }
    return wrapped;
  } else {
    // Signed: wrap to unsigned first, then convert to signed representation
    let wrappedUnsigned = value % range;
    if (wrappedUnsigned < 0n) {
      wrappedUnsigned += range;
    }

    // Convert to signed representation
    const half = 2n ** BigInt(bits - 1);
    if (wrappedUnsigned >= half) {
      return wrappedUnsigned - range;
    } else {
      return wrappedUnsigned;
    }
  }
}

/**
 * Evaluates a comparison expression (Phase 2).
 *
 * CRITICAL: This is called AFTER Phase 1 (numeric evaluation).
 * Both sides must:
 * - Evaluate successfully to numeric values
 * - Have matching decimal scales
 *
 * @param node - The comparison AST node
 * @param variables - Variable definitions
 * @param roundingMode - Rounding mode (passed to Phase 1)
 * @returns Comparison result (boolean)
 */
export function evaluateComparison(
  node: ComparisonNode,
  variables: Map<string, Variable>,
  roundingMode: RoundingMode = 'floor'
): ComparisonResult {
  // Phase 1: Evaluate both sides as numeric expressions
  const leftResult = evaluate(node.left, variables, roundingMode);
  const rightResult = evaluate(node.right, variables, roundingMode);

  // Check decimal equality (REQUIRED)
  if (leftResult.decimals !== rightResult.decimals) {
    throw new ComparisonDecimalMismatchError(
      leftResult.decimals,
      rightResult.decimals
    );
  }

  // Perform the comparison using raw values (unbounded, pre-rounding)
  const leftValue = leftResult.raw;
  const rightValue = rightResult.raw;
  let result: boolean;

  switch (node.operator) {
    case '==':
      result = leftValue === rightValue;
      break;
    case '!=':
      result = leftValue !== rightValue;
      break;
    case '<':
      result = leftValue < rightValue;
      break;
    case '<=':
      result = leftValue <= rightValue;
      break;
    case '>':
      result = leftValue > rightValue;
      break;
    case '>=':
      result = leftValue >= rightValue;
      break;
    default:
      throw new Error(`Unknown comparison operator: ${node.operator}`);
  }

  // Return comparison result
  return {
    result,
    operator: node.operator,
    leftHuman: leftResult.human,
    rightHuman: rightResult.human,
    decimals: leftResult.decimals,
    // Preserve overflow warning if present
    warning: leftResult.warning || rightResult.warning,
  };
}
