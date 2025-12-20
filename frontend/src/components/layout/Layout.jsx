import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

function Layout({ children, currentView, onNavigate, theme, onThemeToggle, searchHistory, onSearchFromHistory, onClearHistory }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  const handleSearchFromHistory = (historyItem) => {
    closeSidebar(); // Close sidebar when searching
    onSearchFromHistory(historyItem);
  };

  return (
    <div className="app-layout">
      <Header
        onMenuClick={openSidebar}
        theme={theme}
        onThemeToggle={onThemeToggle}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        currentView={currentView}
        onNavigate={onNavigate}
        theme={theme}
        onThemeToggle={onThemeToggle}
        searchHistory={searchHistory}
        onSearchFromHistory={handleSearchFromHistory}
        onClearHistory={onClearHistory}
      />

      <main className="layout-main">
        {children}
      </main>
    </div>
  );
}

export default Layout;
