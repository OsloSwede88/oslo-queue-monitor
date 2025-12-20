import { useState, useEffect } from 'react';
import './App.css';
import Layout from './components/layout/Layout';
import FlightTracker from './components/FlightTracker';
import Settings from './components/Settings';

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
  const [savedFlights, setSavedFlights] = useState(() => {
    // Load saved flights from localStorage
    return JSON.parse(localStorage.getItem('savedFlights') || '[]');
  });
  const [settings, setSettings] = useState(() => {
    // Load settings from localStorage or use defaults
    const saved = localStorage.getItem('appSettings');
    return saved ? JSON.parse(saved) : {
      units: 'metric',
      temperatureUnit: 'celsius',
      autoRefresh: false,
      mapZoom: 8
    };
  });

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

  const handleSavedFlightsUpdate = (newSaved) => {
    setSavedFlights(newSaved);
  };

  const handleSearchFromHistory = (historyItem) => {
    setSearchFromHistoryTrigger(historyItem);
    setCurrentView('flights'); // Switch to flights view
  };

  const handleSearchFromSaved = (savedItem) => {
    setSearchFromHistoryTrigger(savedItem);
    setCurrentView('flights'); // Switch to flights view
  };

  const clearSearchHistory = () => {
    localStorage.removeItem('flightSearchHistory');
    setSearchHistory([]);
  };

  const removeSavedFlight = (flightNumber) => {
    const newSaved = savedFlights.filter(f => f.flightNumber !== flightNumber);
    setSavedFlights(newSaved);
    localStorage.setItem('savedFlights', JSON.stringify(newSaved));
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
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
        savedFlights={savedFlights}
        onSearchFromSaved={handleSearchFromSaved}
        onRemoveSaved={removeSavedFlight}
      >
        {currentView === 'flights' && (
          <FlightTracker
            onSearchHistoryUpdate={handleSearchHistoryUpdate}
            onSavedFlightsUpdate={handleSavedFlightsUpdate}
            searchFromHistoryTrigger={searchFromHistoryTrigger}
            settings={settings}
          />
        )}

        {currentView === 'settings' && (
          <Settings
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        )}

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
