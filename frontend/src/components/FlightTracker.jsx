import { useState } from 'react';
import './FlightTracker.css';

function FlightTracker() {
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [flightData, setFlightData] = useState(null);
  const [weatherData, setWeatherData] = useState({ departure: null, arrival: null });
  const [error, setError] = useState(null);

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
        `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNumber.toUpperCase()}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('AviationStack response:', data);

      if (data.data && data.data.length > 0) {
        const flight = data.data[0];

        // Convert AviationStack format to our format
        const flightInfo = {
          callsign: flight.flight?.iata || flightNumber,
          estDepartureAirport: flight.departure?.iata || 'N/A',
          estArrivalAirport: flight.arrival?.iata || 'N/A',
          firstSeen: flight.departure?.scheduled ? new Date(flight.departure.scheduled).getTime() / 1000 : null,
          lastSeen: flight.arrival?.scheduled ? new Date(flight.arrival.scheduled).getTime() / 1000 : null,
          icao24: flight.flight?.icao || flight.aircraft?.registration || 'N/A',
          flightStatus: flight.flight_status,
          airline: flight.airline?.name,
          aircraft: flight.aircraft?.registration
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

      {flightData && (
        <div className="flight-results">
          <div className="flight-card">
            <div className="flight-card-header">
              <h3>{flightData.callsign?.trim() || 'Unknown Flight'}</h3>
              <span className="flight-status live">🟢 Live</span>
            </div>

            <div className="flight-details">
              <div className="flight-detail-row">
                <div className="detail-item">
                  <span className="detail-icon">🛫</span>
                  <div className="detail-content">
                    <span className="detail-label">Departure</span>
                    <span className="detail-value">{flightData.estDepartureAirport || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">🛬</span>
                  <div className="detail-content">
                    <span className="detail-label">Arrival</span>
                    <span className="detail-value">{flightData.estArrivalAirport || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flight-detail-row">
                <div className="detail-item">
                  <span className="detail-icon">⏰</span>
                  <div className="detail-content">
                    <span className="detail-label">First Seen</span>
                    <span className="detail-value">{formatTimestamp(flightData.firstSeen)}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">🕐</span>
                  <div className="detail-content">
                    <span className="detail-label">Last Seen</span>
                    <span className="detail-value">{formatTimestamp(flightData.lastSeen)}</span>
                  </div>
                </div>
              </div>

              {flightData.icao24 && (
                <div className="flight-detail-row">
                  <div className="detail-item full-width">
                    <span className="detail-icon">📡</span>
                    <div className="detail-content">
                      <span className="detail-label">Aircraft ID (ICAO24)</span>
                      <span className="detail-value">{flightData.icao24.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flight-actions">
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
