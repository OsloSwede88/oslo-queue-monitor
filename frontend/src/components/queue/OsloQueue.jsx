import { useState } from 'react';
import './OsloQueue.css';

function OsloQueue({ queueData, isConnected }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

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
        alert('Notification permission denied. On iOS:\n\n1. Go to Settings > Safari > Advanced > Website Data\n2. Search for your domain\n3. Swipe left and delete\n4. Reload the app and try again\n\nOR add this site to your Home Screen first, then enable notifications.');
      } else {
        alert('Notification permission dismissed. Please try again.');
      }
    } catch (error) {
      alert('On iOS, notifications work best when:\n\n1. Add this site to your Home Screen\n2. Open it from the Home Screen icon\n3. Then enable notifications\n\nWould you like instructions?');
    }
  };

  return (
    <div className="oslo-queue">
      <div className="container">
        {/* Connection Status */}
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {isConnected ? 'Connected' : 'Connecting...'}
        </div>

        {/* Queue Card */}
        <div className="queue-card glass glass-card">
          <div className="card-header">
            <h2>Security Checkpoint</h2>
            <p className="airport-name text-secondary">Oslo Airport (OSL)</p>
          </div>

          {queueData ? (
            <>
              <div className={`queue-time ${getQueueColor(queueData.minutes)}`}>
                <div className="time-value">{queueData.text}</div>
                <div className="time-label text-secondary">Estimated Wait Time</div>
              </div>

              <div className="queue-details">
                <div className="detail-item">
                  <span className="detail-label text-secondary">Last Updated:</span>
                  <span className="detail-value">{formatTime(queueData.timestamp)}</span>
                </div>

                {queueData.minutes && (
                  <div className="detail-item">
                    <span className="detail-label text-secondary">Status:</span>
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
              <div className="spinner rotate"></div>
              <p className="text-secondary">Loading queue data...</p>
            </div>
          )}
        </div>

        {/* Notification Card */}
        <div className="notification-card glass glass-card">
          <h3>🔔 Push Notifications</h3>
          <p className="text-secondary">Get notified when wait time exceeds 15 minutes</p>

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
              className="btn btn-primary glass-button"
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

        {/* Info Card */}
        <div className="info-card glass glass-card">
          <h3>📊 How It Works</h3>
          <ul>
            <li>Real-time updates every 30 seconds</li>
            <li>Data from official Avinor website</li>
            <li>Automatic alerts for long wait times</li>
            <li>Works offline with cached data</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default OsloQueue;
