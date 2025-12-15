/**
 * Guideline Component
 *
 * Single-column drill-down navigation:
 * - Index view: Show all guidelines grouped by section
 * - Content view: Show individual guideline with back button
 */

import { useState } from 'react';
import { GUIDELINES, type Guideline } from '../data/guidelines';
import './Guideline.css';

interface GuidelineProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'index' | 'content';

export function Guideline({ isOpen, onClose }: GuidelineProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('index');
  const [selectedGuideline, setSelectedGuideline] = useState<Guideline | null>(null);

  const handleGuidelineClick = (guideline: Guideline) => {
    setSelectedGuideline(guideline);
    setViewMode('content');
  };

  const handleBackClick = () => {
    setViewMode('index');
    setSelectedGuideline(null);
  };

  const handleClose = () => {
    setViewMode('index');
    setSelectedGuideline(null);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="guideline-overlay" onClick={handleClose}>
      <div className="guideline-panel" onClick={(e) => e.stopPropagation()}>
        <div className="guideline-header">
          <h2>SolCalc Guidelines</h2>
          <button
            className="guideline-close"
            onClick={handleClose}
            aria-label="Close guidelines"
          >
            ×
          </button>
        </div>

        <div className="guideline-content">
          {viewMode === 'index' && <IndexView onGuidelineClick={handleGuidelineClick} />}
          {viewMode === 'content' && selectedGuideline && (
            <ContentView guideline={selectedGuideline} onBack={handleBackClick} />
          )}
        </div>
      </div>
    </div>
  );
}

interface IndexViewProps {
  onGuidelineClick: (guideline: Guideline) => void;
}

function IndexView({ onGuidelineClick }: IndexViewProps) {
  return (
    <div className="guideline-index">
      {GUIDELINES.map((section) => (
        <div key={section.id} className="guideline-section">
          <h3 className="section-title">{section.title}</h3>
          <ul className="guideline-list">
            {section.guidelines.map((guideline) => (
              <li key={guideline.id}>
                <button
                  className="guideline-item"
                  onClick={() => onGuidelineClick(guideline)}
                >
                  <span className="guideline-item-title">{guideline.title}</span>
                  <span className="guideline-item-arrow">→</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

interface ContentViewProps {
  guideline: Guideline;
  onBack: () => void;
}

function ContentView({ guideline, onBack }: ContentViewProps) {
  return (
    <div className="guideline-detail">
      <button className="guideline-back" onClick={onBack}>
        ← Back to Guidelines
      </button>

      <div className="guideline-detail-content">
        <h3 className="guideline-detail-title">{guideline.title}</h3>

        <div className="guideline-section-block">
          <h4>Rule</h4>
          <p>{guideline.rule}</p>
        </div>

        <div className="guideline-section-block">
          <h4>Explanation</h4>
          <p>{guideline.explanation}</p>
        </div>

        <div className="guideline-section-block">
          <h4>Examples</h4>
          {guideline.examples.map((example, index) => (
            <div key={index} className="guideline-example">
              <pre className="example-code">{example.code}</pre>
              {example.label && <p className="example-label">{example.label}</p>}
            </div>
          ))}
        </div>

        <div className="guideline-section-block">
          <h4>Audit Relevance</h4>
          <p>{guideline.auditRelevance}</p>
        </div>
      </div>
    </div>
  );
}
