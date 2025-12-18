import { useState } from 'react';
import './Header.css';

function Header({ onMenuClick, theme, onThemeToggle }) {
  return (
    <header className="app-header glass glass-light">
      <div className="header-content">
        <button
          className="hamburger-btn"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        <h1 className="header-title">✈️ Flight Tracker</h1>

        <button
          className={`theme-toggle ${theme}`}
          onClick={onThemeToggle}
          aria-label="Toggle theme"
        >
          <div className="theme-toggle-slider">
            <span className="theme-toggle-icon">
              {theme === 'dark' ? '🌙' : '☀️'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
}

export default Header;
