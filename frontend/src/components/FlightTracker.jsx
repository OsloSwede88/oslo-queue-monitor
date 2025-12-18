import { useState, useEffect, useRef } from 'react';
import './FlightTracker.css';

function FlightTracker() {
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [flightData, setFlightData] = useState(null);
  const [weatherData, setWeatherData] = useState({ departure: null, arrival: null });
  const [error, setError] = useState(null);
  const [subscribedFlights, setSubscribedFlights] = useState(() => {
    const saved = localStorage.getItem('subscribedFlights');
    return saved ? JSON.parse(saved) : [];
  });

  const wsRef = useRef(null);

  // WebSocket connection for flight subscriptions
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://oslo-queue-backend-production.up.railway.app';
    const wsUrl = API_URL.replace(/^http/, 'ws');

    console.log('[FlightTracker] Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[FlightTracker] WebSocket connected');

      // Re-subscribe to all saved flights
      subscribedFlights.forEach(sub => {
        console.log(`[FlightTracker] Re-subscribing to ${sub.flightNumber}`);
        ws.send(JSON.stringify({
          type: 'subscribe-flight',
          flightNumber: sub.flightNumber,
          flightData: sub.lastChecked
        }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'flight-update') {
          console.log('[FlightTracker] Flight update received:', message);
          handleFlightUpdate(message);
        } else if (message.type === 'subscription-confirmed') {
          console.log(`[FlightTracker] Subscription confirmed for ${message.flightNumber}`);
        } else if (message.type === 'unsubscription-confirmed') {
          console.log(`[FlightTracker] Unsubscription confirmed for ${message.flightNumber}`);
        }
      } catch (error) {
        console.error('[FlightTracker] Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[FlightTracker] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[FlightTracker] WebSocket disconnected');
    };

    return () => {
      console.log('[FlightTracker] Cleaning up WebSocket connection');
      ws.close();
    };
  }, []); // Only run on mount/unmount

  const handleFlightUpdate = (message) => {
    const { flightNumber, changes, flightData } = message;

    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const changesText = changes.map(c => `${c.icon} ${c.field}: ${c.old} → ${c.new}`).join('\n');

      const notification = new Notification(`Flight ${flightNumber} Updated`, {
        body: changesText,
        icon: '/flight-icon.png',
        tag: flightNumber,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else {
      // Fallback to alert if notifications not available
      const changesText = changes.map(c => `${c.icon} ${c.field}: ${c.old} → ${c.new}`).join('\n');
      alert(`✈️ Flight ${flightNumber} Updated!\n\n${changesText}`);
    }

    // Update the subscription in localStorage with new data
    const updated = subscribedFlights.map(sub =>
      sub.flightNumber === flightNumber
        ? { ...sub, lastChecked: flightData }
        : sub
    );
    setSubscribedFlights(updated);
    localStorage.setItem('subscribedFlights', JSON.stringify(updated));
  };

  const fetchWeatherData = async (icaoCode) => {
    if (!icaoCode) return null;

    const apiKey = import.meta.env.VITE_CHECKWX_API_KEY;
    if (!apiKey || apiKey === 'your_checkwx_api_key_here') {
      console.warn('CheckWX API key not configured. Weather data will not be available.');
      return null;
    }

    try {
      // Use CheckWX API for METAR data (free, 3000 requests/day)
      const response = await fetch(`https://api.checkwx.com/metar/${icaoCode}/decoded`, {
        headers: {
          'X-API-Key': apiKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.[0] || null;
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
    }
    return null;
  };

  const searchFlight = async () => {
    if (!flightNumber.trim()) {
      setError('Please enter a flight number');
      return;
    }

    setLoading(true);
    setError(null);
    setFlightData(null);
    setWeatherData({ departure: null, arrival: null });

    try {
      const apiKey = import.meta.env.VITE_AVIATIONSTACK_API_KEY;

      // Check if API key is configured
      if (!apiKey || apiKey === 'your_aviationstack_api_key_here') {
        setError('Flight tracking requires an AviationStack API key. Get a free key at aviationstack.com (100 requests/month) and add it to your .env file as VITE_AVIATIONSTACK_API_KEY.');
        setLoading(false);
        return;
      }

      // Use AviationStack API for real-time flight data
      const response = await fetch(
        `https://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNumber.toUpperCase()}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('AviationStack response:', data);

      if (data.data && data.data.length > 0) {
        const flight = data.data[0];

        // Log aircraft data to debug
        console.log('Aircraft data:', flight.aircraft);

        // Convert AviationStack format to our format
        const flightInfo = {
          callsign: flight.flight?.iata || flightNumber,
          estDepartureAirport: flight.departure?.iata || 'N/A',
          estArrivalAirport: flight.arrival?.iata || 'N/A',
          departureAirportName: flight.departure?.airport || 'N/A',
          arrivalAirportName: flight.arrival?.airport || 'N/A',

          // Departure times
          scheduledDeparture: flight.departure?.scheduled || null,
          estimatedDeparture: flight.departure?.estimated || null,
          actualDeparture: flight.departure?.actual || null,

          // Arrival times
          scheduledArrival: flight.arrival?.scheduled || null,
          estimatedArrival: flight.arrival?.estimated || null,
          actualArrival: flight.arrival?.actual || null,

          // Legacy fields for compatibility
          firstSeen: flight.departure?.scheduled ? new Date(flight.departure.scheduled).getTime() / 1000 : null,
          lastSeen: flight.arrival?.scheduled ? new Date(flight.arrival.scheduled).getTime() / 1000 : null,

          // Aircraft information - try multiple fields
          icao24: flight.aircraft?.registration || flight.aircraft?.iata || flight.aircraft?.icao || flight.flight?.icao || 'N/A',
          aircraftRegistration: flight.aircraft?.registration || null,
          aircraftIcao: flight.aircraft?.iata || flight.aircraft?.icao || null,
          aircraftModel: flight.aircraft?.model || null,

          // Flight details
          flightStatus: flight.flight_status,
          airline: flight.airline?.name,
          airlineIata: flight.airline?.iata,

          // Terminal/Gate info
          departureTerminal: flight.departure?.terminal || null,
          departureGate: flight.departure?.gate || null,
          arrivalTerminal: flight.arrival?.terminal || null,
          arrivalGate: flight.arrival?.gate || null,

          // Delay info
          departureDelay: flight.departure?.delay || null,
          arrivalDelay: flight.arrival?.delay || null
        };

        setFlightData(flightInfo);

        // Fetch weather data
        const [departureWeather, arrivalWeather] = await Promise.all([
          fetchWeatherData(flightInfo.estDepartureAirport),
          fetchWeatherData(flightInfo.estArrivalAirport)
        ]);

        setWeatherData({
          departure: departureWeather,
          arrival: arrivalWeather
        });
      } else {
        setError(`No flight found for ${flightNumber}. Try flight numbers like LH400, BA117, SK4035.`);
      }
    } catch (err) {
      console.error('Flight search error:', err);
      setError(`Unable to fetch flight data: ${err.message}. Please check your API key or try again later.`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchFlight();
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString('no-NO');
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    if (!status) return 'live';
    const s = status.toLowerCase();
    if (s === 'active' || s === 'scheduled') return 'live';
    if (s === 'landed') return 'landed';
    if (s === 'cancelled') return 'cancelled';
    if (s.includes('delay')) return 'delayed';
    return 'live';
  };

  const isSubscribed = (flightNumber) => {
    return subscribedFlights.some(f => f.flightNumber === flightNumber);
  };

  const subscribeToFlight = () => {
    if (!flightData || !flightNumber) return;

    const subscription = {
      flightNumber: flightData.callsign || flightNumber,
      flightDate: flightDate || new Date().toISOString().split('T')[0],
      subscribedAt: new Date().toISOString(),
      lastChecked: flightData,
      route: `${flightData.estDepartureAirport} → ${flightData.estArrivalAirport}`,
      airline: flightData.airline
    };

    const updated = [...subscribedFlights, subscription];
    setSubscribedFlights(updated);
    localStorage.setItem('subscribedFlights', JSON.stringify(updated));

    // Send subscription to backend via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe-flight',
        flightNumber: subscription.flightNumber,
        flightData: flightData
      }));
      console.log(`[FlightTracker] Sent subscription request for ${subscription.flightNumber}`);
    }

    // Request notification permission if not granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          alert(`✅ Subscribed to ${subscription.flightNumber}!\n\nYou'll receive push notifications for:\n• Gate/Terminal changes\n• Status updates\n• Delays\n• Boarding announcements`);
        } else {
          alert(`✅ Subscribed to ${subscription.flightNumber}!\n\nNote: Enable browser notifications to receive real-time alerts.`);
        }
      });
    } else {
      alert(`✅ Subscribed to ${subscription.flightNumber}!\n\nYou'll receive push notifications for:\n• Gate/Terminal changes\n• Status updates\n• Delays\n• Boarding announcements`);
    }
  };

  const unsubscribeFromFlight = (flightNumber) => {
    const updated = subscribedFlights.filter(f => f.flightNumber !== flightNumber);
    setSubscribedFlights(updated);
    localStorage.setItem('subscribedFlights', JSON.stringify(updated));

    // Send unsubscription to backend via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe-flight',
        flightNumber: flightNumber
      }));
      console.log(`[FlightTracker] Sent unsubscription request for ${flightNumber}`);
    }
  };

  return (
    <div className="flight-tracker">
      <div className="flight-tracker-header">
        <h2>✈️ Flight Tracker</h2>
        <p>Track any flight in real-time</p>
      </div>

      <div className="flight-search">
        <div className="search-inputs">
          <input
            type="text"
            className="flight-input"
            placeholder="Flight number (e.g., SK4035)"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <input
            type="date"
            className="flight-input"
            value={flightDate}
            onChange={(e) => setFlightDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <button
          className="btn btn-primary search-btn"
          onClick={searchFlight}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner-small"></div>
              Searching...
            </>
          ) : (
            '🔍 Track Flight'
          )}
        </button>
      </div>

      {error && (
        <div className="flight-error">
          ⚠️ {error}
        </div>
      )}

      {subscribedFlights.length > 0 && (
        <div className="subscriptions-card">
          <h3>📬 Your Flight Subscriptions</h3>
          <p className="subscriptions-desc">You'll receive push notifications when these flights change</p>
          <div className="subscriptions-list">
            {subscribedFlights.map((sub, index) => (
              <div key={index} className="subscription-item">
                <div className="subscription-info">
                  <div className="subscription-flight">
                    <span className="subscription-number">{sub.flightNumber}</span>
                    {sub.airline && <span className="subscription-airline">{sub.airline}</span>}
                  </div>
                  <div className="subscription-route">{sub.route}</div>
                  <div className="subscription-date">
                    Subscribed: {new Date(sub.subscribedAt).toLocaleDateString('no-NO')}
                  </div>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => unsubscribeFromFlight(sub.flightNumber)}
                  title="Unsubscribe"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {flightData && (
        <div className="flight-results">
          <div className="flight-card">
            <div className="flight-card-header">
              <div>
                <h3>{flightData.callsign?.trim() || 'Unknown Flight'}</h3>
                {flightData.airline && (
                  <p className="airline-name">{flightData.airline} {flightData.airlineIata && `(${flightData.airlineIata})`}</p>
                )}
              </div>
              <span className={`flight-status ${getStatusColor(flightData.flightStatus)}`}>
                {flightData.flightStatus === 'active' && '🟢 Live'}
                {flightData.flightStatus === 'scheduled' && '🔵 Scheduled'}
                {flightData.flightStatus === 'landed' && '⚪ Landed'}
                {flightData.flightStatus === 'cancelled' && '🔴 Cancelled'}
                {!flightData.flightStatus && '🟢 Live'}
              </span>
            </div>

            <div className="flight-details">
              {/* Route */}
              <div className="flight-detail-row">
                <div className="detail-item">
                  <span className="detail-icon">🛫</span>
                  <div className="detail-content">
                    <span className="detail-label">Departure</span>
                    <span className="detail-value">{flightData.estDepartureAirport || 'N/A'}</span>
                    {flightData.departureAirportName && flightData.departureAirportName !== 'N/A' && (
                      <span className="detail-subtext">{flightData.departureAirportName}</span>
                    )}
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">🛬</span>
                  <div className="detail-content">
                    <span className="detail-label">Arrival</span>
                    <span className="detail-value">{flightData.estArrivalAirport || 'N/A'}</span>
                    {flightData.arrivalAirportName && flightData.arrivalAirportName !== 'N/A' && (
                      <span className="detail-subtext">{flightData.arrivalAirportName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Departure Times */}
              <div className="flight-detail-row">
                <div className="detail-item">
                  <span className="detail-icon">🕐</span>
                  <div className="detail-content">
                    <span className="detail-label">Scheduled Departure</span>
                    <span className="detail-value">{formatTime(flightData.scheduledDeparture)}</span>
                    {flightData.departureDelay && (
                      <span className="detail-delay">Delayed {flightData.departureDelay} min</span>
                    )}
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">🕐</span>
                  <div className="detail-content">
                    <span className="detail-label">Scheduled Arrival</span>
                    <span className="detail-value">{formatTime(flightData.scheduledArrival)}</span>
                    {flightData.arrivalDelay && (
                      <span className="detail-delay">Delayed {flightData.arrivalDelay} min</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Terminal & Gate */}
              {(flightData.departureTerminal || flightData.departureGate || flightData.arrivalTerminal || flightData.arrivalGate) && (
                <div className="flight-detail-row">
                  {(flightData.departureTerminal || flightData.departureGate) && (
                    <div className="detail-item">
                      <span className="detail-icon">🚪</span>
                      <div className="detail-content">
                        <span className="detail-label">Departure Terminal/Gate</span>
                        <span className="detail-value">
                          {flightData.departureTerminal && `Terminal ${flightData.departureTerminal}`}
                          {flightData.departureTerminal && flightData.departureGate && ', '}
                          {flightData.departureGate && `Gate ${flightData.departureGate}`}
                          {!flightData.departureTerminal && !flightData.departureGate && 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}
                  {(flightData.arrivalTerminal || flightData.arrivalGate) && (
                    <div className="detail-item">
                      <span className="detail-icon">🚪</span>
                      <div className="detail-content">
                        <span className="detail-label">Arrival Terminal/Gate</span>
                        <span className="detail-value">
                          {flightData.arrivalTerminal && `Terminal ${flightData.arrivalTerminal}`}
                          {flightData.arrivalTerminal && flightData.arrivalGate && ', '}
                          {flightData.arrivalGate && `Gate ${flightData.arrivalGate}`}
                          {!flightData.arrivalTerminal && !flightData.arrivalGate && 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Aircraft Information */}
              <div className="flight-detail-row">
                <div className="detail-item full-width">
                  <span className="detail-icon">✈️</span>
                  <div className="detail-content">
                    <span className="detail-label">Aircraft</span>
                    <span className="detail-value">
                      {flightData.aircraftRegistration ? `Registration: ${flightData.aircraftRegistration}` : ''}
                      {flightData.aircraftRegistration && (flightData.aircraftIcao || flightData.aircraftModel) && ' • '}
                      {flightData.aircraftIcao && `ICAO: ${flightData.aircraftIcao}`}
                      {flightData.aircraftIcao && flightData.aircraftModel && ' • '}
                      {flightData.aircraftModel && `Model: ${flightData.aircraftModel}`}
                      {!flightData.aircraftRegistration && !flightData.aircraftIcao && !flightData.aircraftModel && 'Not available'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flight-actions">
              {!isSubscribed(flightData.callsign || flightNumber) ? (
                <button
                  className="btn btn-primary"
                  onClick={subscribeToFlight}
                >
                  🔔 Subscribe to Updates
                </button>
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() => unsubscribeFromFlight(flightData.callsign || flightNumber)}
                >
                  ✅ Subscribed • Unsubscribe
                </button>
              )}
              <a
                href={`https://www.flightradar24.com/data/flights/${flightNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                View on FlightRadar24 →
              </a>
            </div>
          </div>

          <div className="flight-info-cards">
            <div className="info-mini-card">
              <div className="mini-card-icon">📍</div>
              <div className="mini-card-content">
                <div className="mini-card-label">Route</div>
                <div className="mini-card-value">
                  {flightData.estDepartureAirport || '???'} → {flightData.estArrivalAirport || '???'}
                </div>
              </div>
            </div>

            <div className="info-mini-card">
              <div className="mini-card-icon">⏱️</div>
              <div className="mini-card-content">
                <div className="mini-card-label">Duration</div>
                <div className="mini-card-value">
                  {flightData.firstSeen && flightData.lastSeen
                    ? `${Math.round((flightData.lastSeen - flightData.firstSeen) / 60)} min`
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {(weatherData.departure || weatherData.arrival) && (
            <div className="weather-section">
              <h4 className="weather-section-title">🌤️ Weather Conditions</h4>
              <div className="weather-cards">
                {weatherData.departure && (
                  <div className="weather-card">
                    <div className="weather-card-header">
                      <span className="weather-icon">🛫</span>
                      <div>
                        <div className="weather-airport">{flightData.estDepartureAirport}</div>
                        <div className="weather-label">Departure Weather</div>
                      </div>
                    </div>
                    <div className="weather-details">
                      {weatherData.departure.temperature && (
                        <div className="weather-item">
                          <span className="weather-item-icon">🌡️</span>
                          <span>{weatherData.departure.temperature.celsius}°C</span>
                        </div>
                      )}
                      {weatherData.departure.wind && (
                        <div className="weather-item">
                          <span className="weather-item-icon">💨</span>
                          <span>{weatherData.departure.wind.speed_kts} kts {weatherData.departure.wind.degrees}°</span>
                        </div>
                      )}
                      {weatherData.departure.visibility && (
                        <div className="weather-item">
                          <span className="weather-item-icon">👁️</span>
                          <span>{weatherData.departure.visibility.meters_float}m</span>
                        </div>
                      )}
                      {weatherData.departure.conditions && (
                        <div className="weather-item">
                          <span className="weather-item-icon">☁️</span>
                          <span>{weatherData.departure.conditions.map(c => c.text).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {weatherData.arrival && (
                  <div className="weather-card">
                    <div className="weather-card-header">
                      <span className="weather-icon">🛬</span>
                      <div>
                        <div className="weather-airport">{flightData.estArrivalAirport}</div>
                        <div className="weather-label">Arrival Weather</div>
                      </div>
                    </div>
                    <div className="weather-details">
                      {weatherData.arrival.temperature && (
                        <div className="weather-item">
                          <span className="weather-item-icon">🌡️</span>
                          <span>{weatherData.arrival.temperature.celsius}°C</span>
                        </div>
                      )}
                      {weatherData.arrival.wind && (
                        <div className="weather-item">
                          <span className="weather-item-icon">💨</span>
                          <span>{weatherData.arrival.wind.speed_kts} kts {weatherData.arrival.wind.degrees}°</span>
                        </div>
                      )}
                      {weatherData.arrival.visibility && (
                        <div className="weather-item">
                          <span className="weather-item-icon">👁️</span>
                          <span>{weatherData.arrival.visibility.meters_float}m</span>
                        </div>
                      )}
                      {weatherData.arrival.conditions && (
                        <div className="weather-item">
                          <span className="weather-item-icon">☁️</span>
                          <span>{weatherData.arrival.conditions.map(c => c.text).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!flightData && !error && !loading && (
        <div className="flight-empty-state">
          <div className="empty-icon">✈️</div>
          <h3>Track Your Flight</h3>
          <p>Enter a flight number to see real-time tracking information</p>
          <div className="empty-examples">
            <strong>Examples:</strong> SK4035, DY1234, BA123
          </div>
        </div>
      )}
    </div>
  );
}

export default FlightTracker;
