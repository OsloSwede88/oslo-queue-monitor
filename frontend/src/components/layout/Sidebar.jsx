import './Sidebar.css';

function Sidebar({ isOpen, onClose, currentView, onNavigate, theme, onThemeToggle }) {
  const handleNavigation = (view) => {
    onNavigate(view);
    // Auto-close on mobile
    if (window.innerWidth < 768) {
      onClose();
    }
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
            className={`nav-item ${currentView === 'queue' ? 'active' : ''}`}
            onClick={() => handleNavigation('queue')}
          >
            <span className="nav-icon">⏱️</span>
            <span className="nav-label">Oslo Queue</span>
          </button>

          <div className="nav-divider"></div>

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
