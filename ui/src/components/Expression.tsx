/**
 * Expression Component
 *
 * Contains:
 * - Multiline textarea for expression input
 */

import { useCalculator } from '../state/store';
import './Expression.css';

export function Expression() {
  const { expression, setExpression } = useCalculator();

  return (
    <div className="expression-section">
      <div className="expression-header">
        <label htmlFor="expression">Expression</label>
      </div>

      <textarea
        id="expression"
        className="expression-input mono"
        value={expression}
        onChange={(e) => setExpression(e.target.value)}
        placeholder="Enter expression (e.g., amount * price / 1e18)"
        rows={3}
        spellCheck={false}
      />
    </div>
  );
}
