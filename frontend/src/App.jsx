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
  const [searchHistory, setSearchHistory] = useState(() => {
    // Load search history from localStorage
    return JSON.parse(localStorage.getItem('flightSearchHistory') || '[]');
  });
  const [searchFromHistoryTrigger, setSearchFromHistoryTrigger] = useState(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const handleSearchHistoryUpdate = (newHistory) => {
    setSearchHistory(newHistory);
  };

  const handleSearchFromHistory = (historyItem) => {
    setSearchFromHistoryTrigger(historyItem);
    setCurrentView('flights'); // Switch to flights view
  };

  const clearSearchHistory = () => {
    localStorage.removeItem('flightSearchHistory');
    setSearchHistory([]);
  };

  return (
    <div className="app">
      <Layout
        currentView={currentView}
        onNavigate={setCurrentView}
        theme={theme}
        onThemeToggle={toggleTheme}
        searchHistory={searchHistory}
        onSearchFromHistory={handleSearchFromHistory}
        onClearHistory={clearSearchHistory}
      >
        <FlightTracker
          onSearchHistoryUpdate={handleSearchHistoryUpdate}
          searchFromHistoryTrigger={searchFromHistoryTrigger}
        />

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
