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

import { CalculatorProvider, useCalculator } from './state/store';
import { Toolbar } from './components/Toolbar';
import { Expression } from './components/Expression';
import { Variables } from './components/Variables';
import { Results } from './components/Results';
import { Footer } from './components/Footer';
import './App.css';

function AppContent() {
  const { theme, setTheme } = useCalculator();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
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

      <Toolbar />
      <Expression />
      <Variables />
      <Results />
      <Footer />
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
