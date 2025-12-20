import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './FlightMap.css';

// FlightRadar24 API - Use serverless proxy to keep token secure
const FR24_PROXY = '/api/flightradar24-proxy';

// Component to fetch and display a specific flight on the map
function FlightsLayer({ onFlightsUpdate, onStatusUpdate, searchFlightNumber }) {
  const map = useMap();
  const lastFetchRef = useRef(0);

  // Fetch flight when searchFlightNumber changes
  useEffect(() => {
    if (!searchFlightNumber) {
      // Clear flights when no search
      onFlightsUpdate([]);
      return;
    }

    const fetchFlight = async () => {
      // Rate limiting: minimum 5 seconds between requests
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchRef.current;
      const minInterval = 5000; // 5 seconds

      if (timeSinceLastFetch < minInterval) {
        const waitTime = Math.ceil((minInterval - timeSinceLastFetch) / 1000);
        console.log(`[FR24] Rate limit: waiting ${waitTime}s`);
        if (onStatusUpdate) onStatusUpdate(`Cooldown: ${waitTime}s`);
        return;
      }

      try {
        // Search for specific flight
        const url = `${FR24_PROXY}?flights=${searchFlightNumber}`;

        console.log('[FR24] Searching for flight:', searchFlightNumber);
        if (onStatusUpdate) onStatusUpdate('Searching...');
        lastFetchRef.current = now;

        const response = await fetch(url);

        console.log('[FR24] Response status:', response.status);

        if (response.status === 429) {
          console.warn('[FR24] Rate limited (429).');
          if (onStatusUpdate) onStatusUpdate('Rate limited - try later');
          onFlightsUpdate([]);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const flights = data.data || [];
          console.log(`[FR24] ✅ Found ${flights.length} flight(s)`);

          if (flights.length > 0) {
            // Center map on flight location
            const flight = flights[0];
            map.flyTo([flight.lat, flight.lon], 8, {
              duration: 1.5
            });
            if (onStatusUpdate) onStatusUpdate(null);
          } else {
            if (onStatusUpdate) onStatusUpdate('Flight not found');
          }

          onFlightsUpdate(flights);
        } else {
          const errorText = await response.text();
          console.error('[FR24] ❌ API error:', response.status, errorText);
          if (onStatusUpdate) onStatusUpdate(`Error: ${response.status}`);
          onFlightsUpdate([]);
        }
      } catch (error) {
        console.error('[FR24] ❌ Error fetching flight:', error);
        if (onStatusUpdate) onStatusUpdate('Connection error');
        onFlightsUpdate([]);
      }
    };

    fetchFlight();
  }, [searchFlightNumber, map, onFlightsUpdate, onStatusUpdate]);

  return null;
}

// Create custom aircraft icon that rotates based on heading
function createAircraftIcon(heading, altitude) {
  const iconHtml = `
    <div class="aircraft-marker" style="transform: rotate(${heading}deg)">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
      </svg>
      <span class="aircraft-alt">${Math.round(altitude / 100)}</span>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'aircraft-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function FlightMap({ onFlightSelect, searchFlightNumber }) {
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [status, setStatus] = useState(null);

  const handleFlightClick = (flight) => {
    setSelectedFlight(flight);
    if (onFlightSelect) {
      onFlightSelect(flight);
    }
  };

  const formatSpeed = (speed) => {
    return speed ? `${Math.round(speed)} kts` : 'N/A';
  };

  const formatAltitude = (altitude) => {
    return altitude ? `${Math.round(altitude)} ft` : 'N/A';
  };

  return (
    <div className="flight-map-container">
      {flights.length === 0 && !status && (
        <div className="flight-map-empty-state">
          <div className="empty-state-content">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5, marginBottom: '1rem' }}>
              <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
            </svg>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Track a Flight</h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.7, maxWidth: '300px', textAlign: 'center' }}>
              Search for a flight number above to see its live position on the map
            </p>
          </div>
        </div>
      )}
      <MapContainer
        center={[63.0, 10.0]} // Center on Norway
        zoom={5}
        className="flight-map"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlightsLayer
          onFlightsUpdate={setFlights}
          onStatusUpdate={setStatus}
          searchFlightNumber={searchFlightNumber}
        />

        {flights.map((flight) => (
          <Marker
            key={flight.fr24_id}
            position={[flight.lat, flight.lon]}
            icon={createAircraftIcon(flight.track || 0, flight.alt || 0)}
            eventHandlers={{
              click: () => handleFlightClick(flight)
            }}
          >
            <Popup className="flight-popup">
              <div className="flight-popup-content">
                <div className="flight-popup-header">
                  <h3>{flight.flight || flight.callsign || 'Unknown Flight'}</h3>
                  {flight.origin_country && (
                    <span className="flight-popup-airline">{flight.origin_country}</span>
                  )}
                </div>

                <div className="flight-popup-body">
                  {flight.hex && (
                    <div className="flight-popup-row">
                      <span className="label">ICAO24:</span>
                      <span className="value">{flight.hex}</span>
                    </div>
                  )}
                  <div className="flight-popup-row">
                    <span className="label">Altitude:</span>
                    <span className="value">{formatAltitude(flight.alt)}</span>
                  </div>
                  <div className="flight-popup-row">
                    <span className="label">Speed:</span>
                    <span className="value">{formatSpeed(flight.gspeed)}</span>
                  </div>
                  <div className="flight-popup-row">
                    <span className="label">Heading:</span>
                    <span className="value">{Math.round(flight.track || 0)}°</span>
                  </div>
                  {flight.squawk && (
                    <div className="flight-popup-row">
                      <span className="label">Squawk:</span>
                      <span className="value">{flight.squawk}</span>
                    </div>
                  )}
                </div>

                {onFlightSelect && (
                  <>
                    <div className="flight-popup-note">
                      Click below to search for detailed flight info (route, aircraft type, etc.)
                    </div>
                    <button
                      className="flight-popup-details-btn"
                      onClick={() => handleFlightClick(flight)}
                    >
                      View Full Details
                    </button>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="flight-map-stats">
        {flights.length > 0 ? (
          <>
            <span className="flights-count">
              ✈️ {flights[0].flight || flights[0].callsign} - {flights[0].type || 'Unknown'}
            </span>
            {selectedFlight && (
              <span className="selected-flight">
                {formatAltitude(selectedFlight.alt)} • {formatSpeed(selectedFlight.gspeed)}
              </span>
            )}
          </>
        ) : (
          <span className="flights-count" style={{ opacity: 0.6 }}>
            {searchFlightNumber ? 'Searching...' : 'Search for a flight above to see it on the map'}
          </span>
        )}
        {status && (
          <span className="data-source" style={{ color: status.includes('Error') || status.includes('Rate limited') || status.includes('not found') ? '#ef4444' : '#fbbf24' }}>
            {status}
          </span>
        )}
        {!status && flights.length > 0 && (
          <span className="data-source">
            Live via FlightRadar24
          </span>
        )}
      </div>
    </div>
  );
}

export default FlightMap;
