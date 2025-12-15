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

  return (
    <div className="results-section">
      <div className="results-label">Result</div>
      <div className="results-output mono">
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
        <div className="result-line text-secondary">
          <span className="result-key">Decimals:</span>
          <span className="result-value">{result.decimals}</span>
        </div>
      </div>
    </div>
  );
}
