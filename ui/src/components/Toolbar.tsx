/**
 * Toolbar Component
 *
 * Contains:
 * - Rounding selector (Floor, Ceil)
 * - Theme toggle (Light, Dark)
 */

import { useCalculator } from '../state/store';
import type { RoundingMode } from '@solcalc/core';
import './Toolbar.css';

export function Toolbar() {
  const { roundingMode, setRoundingMode, theme, setTheme } = useCalculator();

  return (
    <div className="toolbar">
      <div className="toolbar-controls">
        <label>
          Rounding
          <select
            value={roundingMode}
            onChange={(e) => setRoundingMode(e.target.value as RoundingMode)}
          >
            <option value="floor">Floor</option>
            <option value="ceil">Ceil</option>
          </select>
        </label>

        <label>
          Theme
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
      </div>
    </div>
  );
}
