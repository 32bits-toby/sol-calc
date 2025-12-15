/**
 * Toolbar Component
 *
 * Contains:
 * - Rounding selector (Floor, Ceil)
 * - Guide button
 */

import { useCalculator } from '../state/store';
import type { RoundingMode } from '@solcalc/core';
import './Toolbar.css';

interface ToolbarProps {
  onGuideClick: () => void;
}

export function Toolbar({ onGuideClick }: ToolbarProps) {
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

        <button
          className="guide-button"
          onClick={onGuideClick}
          title="Open SolCalc Guidelines"
        >
          Guide ?
        </button>
      </div>
    </div>
  );
}
