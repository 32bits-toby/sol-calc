/**
 * Results Component
 *
 * Displays evaluation results in console-style output:
 * - Raw (integer value)
 * - Human (decimal-adjusted)
 * - Solidity (rounded)
 * - Loss (rounding loss)
 *
 * Also shows errors if evaluation fails
 */

import { useCalculator } from '../state/store';
import './Results.css';

// Type guard to check if result is a comparison result
function isComparisonResult(result: any): result is { result: boolean; operator: string; leftHuman: string; rightHuman: string; decimals: number; warning?: any } {
  return 'result' in result && 'operator' in result && typeof result.result === 'boolean';
}

export function Results() {
  const { result, error } = useCalculator();

  if (error) {
    return (
      <div className="results-section">
        <div className="results-label">Error</div>
        <div className="results-output">
          <div className="result-error text-error">{error}</div>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  // Handle comparison results differently
  if (isComparisonResult(result)) {
    const hasOverflow = result.warning !== undefined;

    return (
      <div className="results-section">
        <div className="results-label">Comparison Result</div>
        <div className={`results-output mono ${hasOverflow ? 'results-overflow' : ''}`}>
          <div className="result-line">
            <span className="result-key">Result:</span>
            <span className={`result-value ${result.result ? 'text-success' : 'text-error'}`}>
              {result.result ? 'true' : 'false'}
            </span>
          </div>
          <div className="result-line">
            <span className="result-key">Operator:</span>
            <span className="result-value">{result.operator}</span>
          </div>
          <div className="result-line">
            <span className="result-key">Left:</span>
            <span className="result-value">{result.leftHuman}</span>
          </div>
          <div className="result-line">
            <span className="result-key">Right:</span>
            <span className="result-value">{result.rightHuman}</span>
          </div>
          <div className="result-line text-secondary">
            <span className="result-key">Decimals:</span>
            <span className="result-value">{result.decimals}</span>
          </div>
        </div>

        {/* Overflow Information Panel */}
        {result.warning && (
          <div className="overflow-panel">
            <div className="overflow-warning">
              <span className="overflow-icon">⚠️</span>
              <span>
                Arithmetic {result.warning.kind} detected in {result.warning.solidityType} —
                computation exceeds the {result.warning.kind === 'overflow' ? 'maximum' : 'minimum'} value
                representable by {result.warning.solidityType}. Solidity arithmetic wraps modulo 2^
                {result.warning.solidityType.match(/\d+/)?.[0] || '256'}.
              </span>
            </div>
            <div className="overflow-wrapped">
              <span className="overflow-wrapped-label">Wrapped Solidity Result:</span>
              <span className="overflow-wrapped-value mono">{result.warning.wrappedHuman}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const hasOverflow = result.warning !== undefined;

  // For scalar type bound expressions (decimals=0 with type bounds)
  // Show simplified display
  const isScalarTypeBound = result.decimals === 0 && hasOverflow;

  return (
    <div className="results-section">
      <div className="results-label">Result</div>
      <div className={`results-output mono ${hasOverflow ? 'results-overflow' : ''}`}>
        {isScalarTypeBound ? (
          // Simplified display for type bound scalar expressions
          <>
            <div className="result-line">
              <span className="result-key">Value:</span>
              <span className="result-value">{result.raw.toString()}</span>
            </div>
            {result.warning && (
              <div className="result-line">
                <span className="result-key">Type:</span>
                <span className="result-value">{result.warning.solidityType}</span>
              </div>
            )}
            <div className="result-line text-secondary">
              <span className="result-key">Decimals:</span>
              <span className="result-value">{result.decimals}</span>
            </div>
          </>
        ) : (
          // Full display for mixed-decimal expressions
          <>
            <div className="result-line">
              <span className="result-key">Raw:</span>
              <span className="result-value">{result.raw.toString()}</span>
            </div>
            <div className="result-line">
              <span className="result-key">Human:</span>
              <span className="result-value">{result.human}</span>
            </div>
            <div className="result-line">
              <span className="result-key">Solidity:</span>
              <span className="result-value">{result.solidity.toString()}</span>
            </div>
            <div className="result-line">
              <span className="result-key">Loss:</span>
              <span className="result-value">{result.roundingLoss}</span>
            </div>
            {/* Only show decimals if non-negative (negative decimals are internal edge case) */}
            {result.decimals >= 0 && (
              <div className="result-line text-secondary">
                <span className="result-key">Decimals:</span>
                <span className="result-value">{result.decimals}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Overflow Information Panel */}
      {result.warning && (
        <div className="overflow-panel">
          <div className="overflow-warning">
            <span className="overflow-icon">⚠️</span>
            <span>
              Arithmetic {result.warning.kind} detected in {result.warning.solidityType} —
              computation exceeds the {result.warning.kind === 'overflow' ? 'maximum' : 'minimum'} value
              representable by {result.warning.solidityType}. Solidity arithmetic wraps modulo 2^
              {result.warning.solidityType.match(/\d+/)?.[0] || '256'}.
            </span>
          </div>
          <div className="overflow-wrapped">
            <span className="overflow-wrapped-label">Wrapped Solidity Result:</span>
            <span className="overflow-wrapped-value mono">{result.warning.wrappedHuman}</span>
          </div>
        </div>
      )}
    </div>
  );
}
