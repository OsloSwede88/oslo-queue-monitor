import { useState, useEffect, useRef } from 'react';
import './App.css';
import FlightTracker from './components/FlightTracker';
import PullToRefresh from 'pulltorefreshjs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_URL = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');

function App() {
  const [queueData, setQueueData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'dark'
    return localStorage.getItem('theme') || 'dark';
  });
  const wsRef = useRef(null);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

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
      mainElement: '.main',
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
            if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
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

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        setNotificationsEnabled(true);

        // Show test notification
        new Notification('Notifications Enabled', {
          body: 'You will be notified when queue time exceeds 15 minutes',
          icon: '/icon-192x192.png'
        });
      } else if (permission === 'denied') {
        alert('Notification permission denied. On iOS:\n\n1. Go to Settings > Safari > Advanced > Website Data\n2. Search for "192.168.1.16"\n3. Swipe left and delete\n4. Reload the app and try again\n\nOR add this site to your Home Screen first, then enable notifications.');
      } else {
        alert('Notification permission dismissed. Please try again.');
      }
    } catch (error) {
      console.error('Notification error:', error);
      alert('On iOS, notifications work best when:\n\n1. Add this site to your Home Screen\n2. Open it from the Home Screen icon\n3. Then enable notifications\n\nWould you like instructions?');
    }
  };

  const getQueueColor = (minutes) => {
    if (!minutes) return 'gray';
    if (minutes <= 10) return 'green';
    if (minutes <= 15) return 'yellow';
    return 'red';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('no-NO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>✈️ Oslo Airport Queue</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className={`theme-toggle ${theme}`}
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <div className="theme-toggle-slider">
                <span className="theme-toggle-icon">
                  {theme === 'dark' ? '🌙' : '☀️'}
                </span>
              </div>
            </button>
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <span className="tab-icon">⏱️</span>
            Security Queue
          </button>
          <button
            className={`tab-btn ${activeTab === 'flights' ? 'active' : ''}`}
            onClick={() => setActiveTab('flights')}
          >
            <span className="tab-icon">✈️</span>
            Flight Tracker
          </button>
        </div>

        {activeTab === 'queue' && (
          <>
            <div className="queue-card">
          <div className="card-header">
            <h2>Security Checkpoint</h2>
            <p className="airport-name">Oslo Airport (OSL)</p>
          </div>

          {queueData ? (
            <>
              <div className={`queue-time ${getQueueColor(queueData.minutes)}`}>
                <div className="time-value">{queueData.text}</div>
                <div className="time-label">Estimated Wait Time</div>
              </div>

              <div className="queue-details">
                <div className="detail-item">
                  <span className="detail-label">Last Updated:</span>
                  <span className="detail-value">{formatTime(queueData.timestamp)}</span>
                </div>

                {queueData.minutes && (
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">
                      {queueData.minutes <= 10 ? '🟢 Short wait' : queueData.minutes <= 15 ? '🟡 Moderate wait' : '🔴 Long wait'}
                    </span>
                  </div>
                )}
              </div>

              {queueData.error && (
                <div className="warning">
                  ⚠️ {queueData.error}
                </div>
              )}
            </>
          ) : (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading queue data...</p>
            </div>
          )}
        </div>

        <div className="notification-card">
          <h3>🔔 Push Notifications</h3>
          <p>Get notified when wait time exceeds 15 minutes</p>

          {isIOS && !isStandalone ? (
            <div className="ios-instructions">
              <div className="warning-box">
                <strong>📱 iOS Users: Install as App First!</strong>
                <ol style={{ textAlign: 'left', marginTop: '1rem', paddingLeft: '1.5rem' }}>
                  <li>Tap the <strong>Share button</strong> (📤) below</li>
                  <li>Scroll and tap <strong>"Add to Home Screen"</strong></li>
                  <li><strong>Close Safari</strong> completely</li>
                  <li>Open the app from your <strong>Home Screen</strong></li>
                  <li>Then tap "Enable Notifications"</li>
                </ol>
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', opacity: 0.8 }}>
                  iOS only allows notifications for installed PWAs, not Safari tabs.
                </p>
              </div>
            </div>
          ) : !notificationsEnabled ? (
            <button
              className="btn btn-primary"
              onClick={requestNotificationPermission}
            >
              Enable Notifications
            </button>
          ) : (
            <div className="notifications-active">
              ✅ Notifications are active
            </div>
          )}
        </div>

        <div className="info-card">
          <h3>📊 How It Works</h3>
          <ul>
            <li>Real-time updates every 30 seconds</li>
            <li>Data from official Avinor website</li>
            <li>Automatic alerts for long wait times</li>
            <li>Works offline with cached data</li>
          </ul>
        </div>
          </>
        )}

        {activeTab === 'flights' && (
          <FlightTracker />
        )}
      </main>

      <footer className="footer">
        <p className="disclaimer">Unofficial monitoring tool. Always arrive according to airline recommendations.</p>
      </footer>
    </div>
  );
}

export default App;
