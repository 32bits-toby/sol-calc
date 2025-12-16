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
    <div className="footer-container">
      <div className="footer">
        <div className="footer-status">
          <span className="status-indicator" />
          <span className="text-secondary">Auto-evaluating</span>
        </div>

        <button className="evaluate-button primary" onClick={evaluate} disabled={isEvaluating}>
          Evaluate ↵
        </button>
      </div>

      <div className="footer-credit">
        <span className="text-secondary">
          Created by{' '}
          <a
            href="https://x.com/32bits_Toby"
            target="_blank"
            rel="noopener noreferrer"
            className="credit-link"
          >
            32bits-toby
          </a>
        </span>
      </div>
    </div>
  );
}
