import { useState, useEffect } from 'react';
import './Settings.css';

function Settings({ settings, onSettingsChange }) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [stats, setStats] = useState({
    totalSearches: 0,
    mostSearchedFlights: [],
    mostSearchedRoutes: [],
    firstSearchDate: null
  });

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Calculate stats from search history
  useEffect(() => {
    const searchHistory = JSON.parse(localStorage.getItem('flightSearchHistory') || '[]');

    if (searchHistory.length === 0) {
      return;
    }

    // Total searches
    const totalSearches = searchHistory.length;

    // First search date
    const firstSearchDate = searchHistory.length > 0
      ? new Date(searchHistory[searchHistory.length - 1].timestamp).toLocaleDateString()
      : null;

    // Count flight occurrences
    const flightCounts = {};
    const routeCounts = {};

    searchHistory.forEach(item => {
      // Count flights
      flightCounts[item.flightNumber] = (flightCounts[item.flightNumber] || 0) + 1;

      // Count routes
      if (item.route) {
        routeCounts[item.route] = (routeCounts[item.route] || 0) + 1;
      }
    });

    // Get top 5 most searched flights
    const mostSearchedFlights = Object.entries(flightCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([flight, count]) => {
        const lastSearch = searchHistory.find(h => h.flightNumber === flight);
        return {
          flightNumber: flight,
          count,
          airline: lastSearch?.airline || 'Unknown'
        };
      });

    // Get top 5 most searched routes
    const mostSearchedRoutes = Object.entries(routeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([route, count]) => ({ route, count }));

    setStats({
      totalSearches,
      mostSearchedFlights,
      mostSearchedRoutes,
      firstSearchDate
    });
  }, []);

  const handleChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const exportData = () => {
    const searchHistory = JSON.parse(localStorage.getItem('flightSearchHistory') || '[]');
    const savedFlights = JSON.parse(localStorage.getItem('savedFlights') || '[]');
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');

    const exportData = {
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
      data: {
        searchHistory,
        savedFlights,
        settings: appSettings
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flight-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    if (window.confirm('This will clear ALL your data including search history, saved flights, and settings. This cannot be undone. Are you sure?')) {
      localStorage.removeItem('flightSearchHistory');
      localStorage.removeItem('savedFlights');
      localStorage.removeItem('appSettings');
      localStorage.removeItem('theme');
      window.location.reload();
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p className="settings-subtitle text-secondary">
          Customize your flight tracking experience
        </p>
      </div>

      <div className="settings-sections">
        {/* Display Settings */}
        <section className="settings-section glass glass-card">
          <div className="settings-section-header">
            <span className="settings-icon">🎨</span>
            <h2>Display</h2>
          </div>

          <div className="settings-items">
            <div className="settings-item">
              <div className="settings-item-info">
                <label htmlFor="units">Units</label>
                <p className="settings-item-description">
                  Choose between metric and imperial units for altitude and speed
                </p>
              </div>
              <select
                id="units"
                className="settings-select"
                value={localSettings.units}
                onChange={(e) => handleChange('units', e.target.value)}
              >
                <option value="metric">Metric (m, km/h)</option>
                <option value="imperial">Imperial (ft, knots)</option>
              </select>
            </div>

            <div className="settings-divider"></div>

            <div className="settings-item">
              <div className="settings-item-info">
                <label htmlFor="temperatureUnit">Temperature</label>
                <p className="settings-item-description">
                  Display temperature in Celsius or Fahrenheit
                </p>
              </div>
              <select
                id="temperatureUnit"
                className="settings-select"
                value={localSettings.temperatureUnit}
                onChange={(e) => handleChange('temperatureUnit', e.target.value)}
              >
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Map Settings */}
        <section className="settings-section glass glass-card">
          <div className="settings-section-header">
            <span className="settings-icon">🗺️</span>
            <h2>Map</h2>
          </div>

          <div className="settings-items">
            <div className="settings-item">
              <div className="settings-item-info">
                <label htmlFor="mapZoom">Default zoom level</label>
                <p className="settings-item-description">
                  Zoom level when centering on a flight (1-15)
                </p>
              </div>
              <div className="settings-slider-container">
                <input
                  type="range"
                  id="mapZoom"
                  className="settings-slider"
                  min="1"
                  max="15"
                  value={localSettings.mapZoom}
                  onChange={(e) => handleChange('mapZoom', parseInt(e.target.value))}
                />
                <span className="settings-slider-value">{localSettings.mapZoom}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats & Analytics */}
        {stats.totalSearches > 0 && (
          <section className="settings-section glass glass-card">
            <div className="settings-section-header">
              <span className="settings-icon">📊</span>
              <h2>Your Statistics</h2>
            </div>

            <div className="settings-items">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🔍</div>
                  <div className="stat-value">{stats.totalSearches}</div>
                  <div className="stat-label">Total Searches</div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-value">
                    {JSON.parse(localStorage.getItem('savedFlights') || '[]').length}
                  </div>
                  <div className="stat-label">Saved Flights</div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-value text-small">{stats.firstSearchDate}</div>
                  <div className="stat-label">Member Since</div>
                </div>
              </div>

              {stats.mostSearchedFlights.length > 0 && (
                <>
                  <div className="settings-divider"></div>
                  <div className="stats-section">
                    <h3 className="stats-subtitle">Most Searched Flights</h3>
                    <div className="stats-list">
                      {stats.mostSearchedFlights.map((item, index) => (
                        <div key={item.flightNumber} className="stats-list-item">
                          <div className="stats-rank">#{index + 1}</div>
                          <div className="stats-item-info">
                            <div className="stats-item-title">{item.flightNumber}</div>
                            {item.airline && (
                              <div className="stats-item-subtitle">{item.airline}</div>
                            )}
                          </div>
                          <div className="stats-count">{item.count}x</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {stats.mostSearchedRoutes.length > 0 && (
                <>
                  <div className="settings-divider"></div>
                  <div className="stats-section">
                    <h3 className="stats-subtitle">Most Searched Routes</h3>
                    <div className="stats-list">
                      {stats.mostSearchedRoutes.map((item, index) => (
                        <div key={item.route} className="stats-list-item">
                          <div className="stats-rank">#{index + 1}</div>
                          <div className="stats-item-info">
                            <div className="stats-item-title">{item.route}</div>
                          </div>
                          <div className="stats-count">{item.count}x</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Data & Privacy */}
        <section className="settings-section glass glass-card">
          <div className="settings-section-header">
            <span className="settings-icon">🔒</span>
            <h2>Data & Privacy</h2>
          </div>

          <div className="settings-items">
            <div className="settings-info-item">
              <h3>Data Sources</h3>
              <p className="settings-info-text">
                This app uses the following data sources:
              </p>
              <ul className="data-sources-list">
                <li>
                  <strong>FlightRadar24 API</strong> - Real-time flight positions
                </li>
                <li>
                  <strong>AirLabs API</strong> - Flight schedules and details
                </li>
                <li>
                  <strong>AviationStack API</strong> - Aircraft information
                </li>
                <li>
                  <strong>CheckWX API</strong> - Weather data (METAR)
                </li>
                <li>
                  <strong>Planespotters.net</strong> - Aircraft photos
                </li>
              </ul>
            </div>

            <div className="settings-divider"></div>

            <div className="settings-info-item">
              <h3>Local Storage</h3>
              <p className="settings-info-text">
                The following data is stored locally in your browser:
              </p>
              <ul className="data-sources-list">
                <li>Search history (last 15 searches)</li>
                <li>Favorite flights</li>
                <li>Settings preferences</li>
                <li>Theme preference</li>
              </ul>
              <p className="settings-info-note">
                No data is sent to any server. Everything stays on your device.
              </p>
            </div>

            <div className="settings-divider"></div>

            <div className="settings-info-item">
              <h3>Export & Manage Data</h3>
              <p className="settings-info-text" style={{ marginBottom: '1rem' }}>
                Download your data or clear all stored information
              </p>
              <div className="export-actions">
                <button className="export-btn" onClick={exportData}>
                  <span className="export-icon">📥</span>
                  <span>Export All Data</span>
                </button>
                <button className="danger-btn" onClick={clearAllData}>
                  <span className="export-icon">🗑️</span>
                  <span>Clear All Data</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="settings-section glass glass-card">
          <div className="settings-section-header">
            <span className="settings-icon">ℹ️</span>
            <h2>About</h2>
          </div>

          <div className="settings-items">
            <div className="settings-info-item">
              <h3>Flight Tracker</h3>
              <p className="settings-info-text">
                Version 1.0.0
              </p>
              <p className="settings-info-text text-tertiary" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                A modern flight tracking application with real-time data and Glass Terminal design.
              </p>
            </div>

            <div className="settings-divider"></div>

            <div className="settings-info-item">
              <h3>Credits</h3>
              <p className="settings-info-text text-tertiary" style={{ fontSize: '0.875rem' }}>
                Built with React, Vite, and Mapbox GL JS.<br />
                Design inspired by modern flight tracking apps.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Settings;
