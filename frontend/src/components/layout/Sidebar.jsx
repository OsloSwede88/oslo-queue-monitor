import './Sidebar.css';

function Sidebar({ isOpen, onClose, currentView, onNavigate, theme, onThemeToggle, searchHistory = [], onSearchFromHistory, onClearHistory, savedFlights = [], onSearchFromSaved, onRemoveSaved }) {
  const handleNavigation = (view) => {
    onNavigate(view);
    // Always close sidebar after navigation
    onClose();
  };

  const handleHistoryClick = (historyItem) => {
    onSearchFromHistory(historyItem);
  };

  const handleSavedClick = (savedItem) => {
    onSearchFromSaved(savedItem);
  };

  const handleRemoveSaved = (e, flightNumber) => {
    e.stopPropagation(); // Prevent triggering the search
    onRemoveSaved(flightNumber);
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all search history?')) {
      onClearHistory();
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="sidebar-backdrop fade-in" onClick={onClose}></div>

      {/* Sidebar Panel */}
      <aside
        className="sidebar glass glass-strong slide-in-left"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Close Button */}
        <button
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          <span className="close-icon">✕</span>
        </button>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${currentView === 'flights' ? 'active' : ''}`}
            onClick={() => handleNavigation('flights')}
          >
            <span className="nav-icon">✈️</span>
            <span className="nav-label">Flight Tracker</span>
          </button>

          <button
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavigation('settings')}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </button>

          <div className="nav-divider"></div>

          {/* Saved/Favorite Flights Section */}
          {savedFlights && savedFlights.length > 0 && (
            <>
              <div className="sidebar-section-header">
                <span className="section-title">Favorite Flights</span>
              </div>
              <div className="saved-flights-list">
                {savedFlights.map((item) => (
                  <button
                    key={`${item.flightNumber}-${item.savedAt}`}
                    className="saved-flight-item"
                    onClick={() => handleSavedClick(item)}
                  >
                    <div className="saved-flight-header">
                      <span className="saved-flight-icon">⭐</span>
                      <span className="saved-flight-number">{item.flightNumber}</span>
                      <button
                        className="remove-saved-btn"
                        onClick={(e) => handleRemoveSaved(e, item.flightNumber)}
                        aria-label="Remove from favorites"
                        title="Remove from favorites"
                      >
                        ✕
                      </button>
                    </div>
                    {item.airline && (
                      <div className="saved-flight-airline">{item.airline}</div>
                    )}
                    <div className="saved-flight-route">{item.route}</div>
                  </button>
                ))}
              </div>
              <div className="nav-divider"></div>
            </>
          )}

          {/* Search History Section */}
          {searchHistory && searchHistory.length > 0 && (
            <>
              <div className="sidebar-section-header">
                <span className="section-title">Recent Searches</span>
                <button
                  className="clear-history-btn"
                  onClick={handleClearHistory}
                  aria-label="Clear history"
                  title="Clear all search history"
                >
                  ✕
                </button>
              </div>
              <div className="history-list">
                {searchHistory.map((item, index) => (
                  <button
                    key={`${item.flightNumber}-${item.timestamp}`}
                    className="history-item"
                    onClick={() => handleHistoryClick(item)}
                  >
                    <div className="history-item-header">
                      <span className="history-flight-number">{item.flightNumber}</span>
                      <span className="history-timestamp">{formatTimestamp(item.timestamp)}</span>
                    </div>
                    {item.airline && (
                      <div className="history-airline">{item.airline}</div>
                    )}
                    <div className="history-route">{item.route}</div>
                  </button>
                ))}
              </div>
              <div className="nav-divider"></div>
            </>
          )}

          {/* Theme Toggle in Sidebar */}
          <div className="nav-item-inline">
            <span className="nav-icon">🌓</span>
            <span className="nav-label">Theme</span>
            <button
              className={`theme-toggle-inline ${theme}`}
              onClick={onThemeToggle}
              aria-label="Toggle theme"
            >
              <div className="theme-toggle-slider-inline">
                <span className="theme-icon-inline">
                  {theme === 'dark' ? '🌙' : '☀️'}
                </span>
              </div>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer text-tertiary">
          <p style={{ fontSize: '0.75rem', margin: 0 }}>
            Flight Tracker v1.0
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
