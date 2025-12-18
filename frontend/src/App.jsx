import { useState, useEffect, useRef } from 'react';
import './App.css';
import Layout from './components/layout/Layout';
import FlightTracker from './components/FlightTracker';
import OsloQueue from './components/queue/OsloQueue';
import PullToRefresh from 'pulltorefreshjs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_URL = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');

function App() {
  const [queueData, setQueueData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('flights'); // 'flights' or 'queue'
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'dark'
    return localStorage.getItem('theme') || 'dark';
  });
  const wsRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  // Manual refresh handler for pull-to-refresh
  const handleRefresh = () => {
    return new Promise((resolve) => {
      // Force a data refresh by requesting current data from server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'request-update' }));
      }

      // Wait a bit for the update to come through
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  };

  // Connect to WebSocket
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Initialize pull-to-refresh
  useEffect(() => {
    const ptr = PullToRefresh.init({
      mainElement: '.layout-main',
      onRefresh: handleRefresh,
      distThreshold: 60,
      distMax: 80,
      distReload: 50,
      instructionsPullToRefresh: 'Pull down to refresh',
      instructionsReleaseToRefresh: 'Release to refresh',
      instructionsRefreshing: 'Refreshing...',
      iconArrow: '↓',
      iconRefreshing: '↻',
      shouldPullToRefresh() {
        return !window.scrollY;
      }
    });

    return () => {
      ptr.destroy();
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'queue-update') {
            setQueueData(message.data);
          } else if (message.type === 'alert') {
            // Show browser notification if enabled
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Oslo Airport Security Queue Alert', {
                body: message.data.message,
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                tag: 'queue-alert',
                requireInteraction: true
              });
            }
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);

        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        setError('Connection error. Retrying...');
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Failed to connect:', err);
      setError('Failed to connect to server');
    }
  };

  return (
    <div className="app">
      <Layout
        currentView={currentView}
        onNavigate={setCurrentView}
        theme={theme}
        onThemeToggle={toggleTheme}
      >
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {currentView === 'flights' && (
          <FlightTracker />
        )}

        {currentView === 'queue' && (
          <OsloQueue
            queueData={queueData}
            isConnected={isConnected}
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
