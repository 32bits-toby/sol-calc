/**
 * Main App Component
 *
 * Layout structure (top to bottom):
 * 1. App Header
 * 2. Toolbar
 * 3. Expression
 * 4. Variables
 * 5. Results
 * 6. Footer
 */

import { useState } from 'react';
import { CalculatorProvider, useCalculator } from './state/store';
import { Toolbar } from './components/Toolbar';
import { Expression } from './components/Expression';
import { Variables } from './components/Variables';
import { Results } from './components/Results';
import { Footer } from './components/Footer';
import { Guideline } from './components/Guideline';
import './App.css';

function AppContent() {
  const { theme, setTheme } = useCalculator();
  const [isGuidelineOpen, setIsGuidelineOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const openGuideline = () => {
    setIsGuidelineOpen(true);
  };

  const closeGuideline = () => {
    setIsGuidelineOpen(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-branding">
          <div className="app-icon">🧮</div>
          <div className="app-title">
            <h1>SolCalc</h1>
            <p className="app-subtitle text-secondary">Mixed-Decimal Calculator</p>
          </div>
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <Toolbar onGuideClick={openGuideline} />
      <Expression />
      <Variables />
      <Results />
      <Footer />

      <Guideline isOpen={isGuidelineOpen} onClose={closeGuideline} />
    </div>
  );
}

export function App() {
  return (
    <CalculatorProvider>
      <AppContent />
    </CalculatorProvider>
  );
}
