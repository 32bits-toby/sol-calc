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

import { CalculatorProvider } from './state/store';
import { Toolbar } from './components/Toolbar';
import { Expression } from './components/Expression';
import { Variables } from './components/Variables';
import { Results } from './components/Results';
import { Footer } from './components/Footer';
import './App.css';

function AppContent() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-icon">🧮</div>
        <div className="app-title">
          <h1>SolCalc</h1>
          <p className="app-subtitle text-secondary">Mixed-Decimal Calculator</p>
        </div>
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
