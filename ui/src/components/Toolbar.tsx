/**
 * Toolbar Component
 *
 * Contains:
 * - Rounding selector (Floor, Ceil)
 */

import { useCalculator } from '../state/store';
import type { RoundingMode } from '@solcalc/core';
import './Toolbar.css';

export function Toolbar() {
  const { roundingMode, setRoundingMode } = useCalculator();

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
      </div>
    </div>
  );
}
