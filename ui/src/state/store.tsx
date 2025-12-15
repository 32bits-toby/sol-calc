/**
 * Calculator State Management
 *
 * Uses React Context for simple, centralized state.
 * Integrates with the core engine for evaluation.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { evaluateExpression, extractVariables, type Variable, type RoundingMode } from '@solcalc/core';
import type { CalculatorState, CalculatorActions, VariableInput, Theme } from './types';

const CalculatorContext = createContext<(CalculatorState & CalculatorActions) | null>(null);

export function CalculatorProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme from localStorage or default to dark
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('solcalc-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [expression, setExpressionState] = useState('');
  const [roundingMode, setRoundingMode] = useState<RoundingMode>('floor');
  const [variables, setVariables] = useState<Map<string, VariableInput>>(new Map());
  const [result, setResult] = useState<CalculatorState['result']>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('solcalc-theme', theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  // Auto-detect variables when expression changes
  const setExpression = useCallback((newExpression: string) => {
    setExpressionState(newExpression);

    // Extract variables from the new expression
    const detectedVars = extractVariables(newExpression);

    setVariables((prevVars) => {
      const newVars = new Map(prevVars);

      // Remove variables no longer in the expression
      for (const varName of newVars.keys()) {
        if (!detectedVars.has(varName)) {
          newVars.delete(varName);
        }
      }

      // Add new variables (no default decimals)
      for (const varName of detectedVars) {
        if (!newVars.has(varName)) {
          newVars.set(varName, {
            name: varName,
            value: '',
            decimals: '',
          });
        }
      }

      return newVars;
    });
  }, []);

  // Set variable value
  const setVariableValue = useCallback((name: string, value: string) => {
    setVariables((prev) => {
      const newVars = new Map(prev);
      const existing = newVars.get(name);
      if (existing) {
        newVars.set(name, { ...existing, value });
      }
      return newVars;
    });
  }, []);

  // Set variable decimals
  const setVariableDecimals = useCallback((name: string, decimals: string) => {
    setVariables((prev) => {
      const newVars = new Map(prev);
      const existing = newVars.get(name);
      if (existing) {
        newVars.set(name, { ...existing, decimals });
      }
      return newVars;
    });
  }, []);

  // Evaluate expression
  const evaluate = useCallback(() => {
    setIsEvaluating(true);
    setError(null);
    setResult(null);

    try {
      // Convert VariableInput to Variable (with validation)
      const coreVariables = new Map<string, Variable>();

      for (const [name, varInput] of variables) {
        // Validate that value and decimals are set
        if (varInput.value === '') {
          throw new Error(`Variable "${name}" is missing a value`);
        }
        if (varInput.decimals === '') {
          throw new Error(`Variable "${name}" is missing decimals`);
        }

        // Parse decimals
        const decimals = parseInt(varInput.decimals, 10);
        if (isNaN(decimals) || decimals < 0) {
          throw new Error(`Variable "${name}" has invalid decimals: ${varInput.decimals}`);
        }

        // Convert human-readable value to raw bigint
        // User enters "2.5", we convert to 2.5 × 10^decimals
        const humanValue = parseFloat(varInput.value);
        if (isNaN(humanValue)) {
          throw new Error(`Variable "${name}" has invalid value: ${varInput.value}`);
        }

        // Calculate raw value: humanValue × 10^decimals
        // Handle decimal inputs by scaling up
        const scaleFactor = 10 ** decimals;
        const rawValue = BigInt(Math.round(humanValue * scaleFactor));

        coreVariables.set(name, { name, value: rawValue, decimals });
      }

      // Evaluate using core engine with rounding mode
      const evalResult = evaluateExpression(expression, coreVariables, roundingMode);
      setResult(evalResult);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setIsEvaluating(false);
    }
  }, [expression, variables, roundingMode]);

  // Auto-evaluate when inputs change (with debounce)
  useEffect(() => {
    if (!expression) {
      setResult(null);
      setError(null);
      return;
    }

    // Check if all variables have values and decimals
    let allSet = true;
    for (const varInput of variables.values()) {
      if (varInput.value === '' || varInput.decimals === '') {
        allSet = false;
        break;
      }
    }

    if (!allSet) {
      setResult(null);
      setError(null);
      return;
    }

    // Debounce evaluation
    const timeout = setTimeout(() => {
      evaluate();
    }, 300);

    return () => clearTimeout(timeout);
  }, [expression, variables, evaluate]);

  const value: CalculatorState & CalculatorActions = {
    // State
    expression,
    roundingMode,
    variables,
    theme,
    result,
    error,
    isEvaluating,

    // Actions
    setExpression,
    setRoundingMode,
    setVariableValue,
    setVariableDecimals,
    setTheme,
    evaluate,
  };

  return (
    <CalculatorContext.Provider value={value}>
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculator() {
  const context = useContext(CalculatorContext);
  if (!context) {
    throw new Error('useCalculator must be used within CalculatorProvider');
  }
  return context;
}
