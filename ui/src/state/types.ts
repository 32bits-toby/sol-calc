/**
 * UI State Types
 */

import type { EvaluationResult, ComparisonResult, RoundingMode } from '@solcalc/core';

export interface VariableInput {
  name: string;
  value: string;       // Human-readable string input (e.g., "2.5")
  decimals: string;    // String input for decimals
}

export type Theme = 'light' | 'dark';

export interface CalculatorState {
  // User inputs
  expression: string;
  roundingMode: RoundingMode;
  variables: Map<string, VariableInput>;
  theme: Theme;

  // Computed/derived state
  result: EvaluationResult | ComparisonResult | null;
  error: string | null;
  isEvaluating: boolean;
}

export interface CalculatorActions {
  setExpression: (expression: string) => void;
  setRoundingMode: (mode: RoundingMode) => void;
  setVariableValue: (name: string, value: string) => void;
  setVariableDecimals: (name: string, decimals: string) => void;
  setTheme: (theme: Theme) => void;
  evaluate: () => void;
}
