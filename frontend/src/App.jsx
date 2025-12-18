import { useState, useEffect } from 'react';
import './App.css';
import Layout from './components/layout/Layout';
import FlightTracker from './components/FlightTracker';

function App() {
  const [currentView, setCurrentView] = useState('flights');
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'dark'
    return localStorage.getItem('theme') || 'dark';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="app">
      <Layout
        currentView={currentView}
        onNavigate={setCurrentView}
        theme={theme}
        onThemeToggle={toggleTheme}
      >
        <FlightTracker />

        <footer className="footer">
          <p className="disclaimer text-tertiary">
            Unofficial monitoring tool. Always arrive according to airline recommendations.
          </p>
        </footer>
      </Layout>
    </div>
  );
}

export default App;
