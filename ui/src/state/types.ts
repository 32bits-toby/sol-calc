/**
 * UI State Types
 */

import type { EvaluationResult, RoundingMode } from '@solcalc/core';

export interface VariableInput {
  name: string;
  value: string;       // Human-readable string input (e.g., "2.5")
  decimals: string;    // String input for decimals
}

export interface CalculatorState {
  // User inputs
  expression: string;
  roundingMode: RoundingMode;
  variables: Map<string, VariableInput>;

  // Computed/derived state
  result: EvaluationResult | null;
  error: string | null;
  isEvaluating: boolean;
}

export interface CalculatorActions {
  setExpression: (expression: string) => void;
  setRoundingMode: (mode: RoundingMode) => void;
  setVariableValue: (name: string, value: string) => void;
  setVariableDecimals: (name: string, decimals: string) => void;
  evaluate: () => void;
}
