import { useState, useEffect } from 'react';
import './App.css';
import Layout from './components/layout/Layout';
import FlightTracker from './components/FlightTracker';
import Settings from './components/Settings';
import { STORAGE_KEYS, THEMES } from './constants/config';
import { trackThemeToggle, trackNavigation } from './utils/analytics';

function App() {
  const [currentView, setCurrentView] = useState('flights');
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to dark
    return localStorage.getItem(STORAGE_KEYS.THEME) || THEMES.DEFAULT;
  });
  const [searchHistory, setSearchHistory] = useState(() => {
    // Load search history from localStorage
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY) || '[]');
  });
  const [searchFromHistoryTrigger, setSearchFromHistoryTrigger] = useState(null);
  const [savedFlights, setSavedFlights] = useState(() => {
    // Load saved flights from localStorage
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_FLIGHTS) || '[]');
  });
  const [settings, setSettings] = useState(() => {
    // Load settings from localStorage or use defaults
    const saved = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
    return saved ? JSON.parse(saved) : {
      units: 'metric',
      temperatureUnit: 'celsius',
      mapZoom: 8
    };
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
      trackThemeToggle(newTheme);
      return newTheme;
    });
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
    localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    setSearchHistory([]);
  };

  const removeSavedFlight = (flightNumber) => {
    const newSaved = savedFlights.filter(f => f.flightNumber !== flightNumber);
    setSavedFlights(newSaved);
    localStorage.setItem(STORAGE_KEYS.SAVED_FLIGHTS, JSON.stringify(newSaved));
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(newSettings));
  };

  const handleNavigate = (view) => {
    trackNavigation(view);
    setCurrentView(view);
  };

  return (
    <div className="app">
      <Layout
        currentView={currentView}
        onNavigate={handleNavigate}
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
