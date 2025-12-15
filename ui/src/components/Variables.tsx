/**
 * Variables Component
 *
 * Displays flat rows for each detected variable:
 * - Variable name (read-only)
 * - Value input
 * - Decimals input
 */

import { useCalculator } from '../state/store';
import './Variables.css';

export function Variables() {
  const {
    variables,
    setVariableValue,
    setVariableDecimals,
  } = useCalculator();

  const varArray = Array.from(variables.values());

  if (varArray.length === 0) {
    return null;
  }

  return (
    <div className="variables-section">
      <div className="variables-header">
        <span>Variables</span>
      </div>

      <div className="variables-list">
        {varArray.map((variable) => (
          <div key={variable.name} className="variable-row">
            <div className="variable-name mono">{variable.name}</div>
            <input
              type="text"
              className="variable-value mono"
              value={variable.value}
              onChange={(e) => setVariableValue(variable.name, e.target.value)}
              placeholder="value"
            />
            <label className="variable-decimals-label text-secondary">
              dec
              <input
                type="number"
                className="variable-decimals mono"
                value={variable.decimals}
                onChange={(e) => setVariableDecimals(variable.name, e.target.value)}
                placeholder="--"
                min="0"
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
