/**
 * Footer Component
 *
 * Contains:
 * - Status indicator (auto-evaluating)
 * - Evaluate button with keyboard hint
 */

import { useCalculator } from '../state/store';
import './Footer.css';

export function Footer() {
  const { evaluate, isEvaluating } = useCalculator();

  return (
    <div className="footer">
      <div className="footer-status">
        <span className="status-indicator" />
        <span className="text-secondary">Auto-evaluating</span>
      </div>

      <button className="evaluate-button primary" onClick={evaluate} disabled={isEvaluating}>
        Evaluate ↵
      </button>
    </div>
  );
}
