import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './FlightMap.css';

// FlightRadar24 API - Use serverless proxy to keep token secure
const FR24_PROXY = '/api/flightradar24-proxy';

// Airport coordinates lookup for common airports
const AIRPORT_COORDS = {
  'OSL': { lat: 60.1939, lon: 11.1004, name: 'Oslo Gardermoen' },
  'BGO': { lat: 60.2934, lon: 5.2181, name: 'Bergen Flesland' },
  'TRD': { lat: 63.4578, lon: 10.9239, name: 'Trondheim Værnes' },
  'SVG': { lat: 58.8767, lon: 5.6378, name: 'Stavanger Sola' },
  'CPH': { lat: 55.6181, lon: 12.6561, name: 'Copenhagen' },
  'ARN': { lat: 59.6519, lon: 17.9186, name: 'Stockholm Arlanda' },
  'HEL': { lat: 60.3172, lon: 24.9633, name: 'Helsinki-Vantaa' },
  'LHR': { lat: 51.4700, lon: -0.4543, name: 'London Heathrow' },
  'CDG': { lat: 49.0097, lon: 2.5479, name: 'Paris CDG' },
  'AMS': { lat: 52.3105, lon: 4.7683, name: 'Amsterdam Schiphol' },
  'FRA': { lat: 50.0379, lon: 8.5622, name: 'Frankfurt' },
  'MAD': { lat: 40.4983, lon: -3.5676, name: 'Madrid' },
  'BCN': { lat: 41.2971, lon: 2.0785, name: 'Barcelona' },
  'FCO': { lat: 41.8003, lon: 12.2389, name: 'Rome Fiumicino' },
  'MUC': { lat: 48.3537, lon: 11.7750, name: 'Munich' },
};

// Component to fetch and display a specific flight on the map
function FlightsLayer({ onFlightsUpdate, onStatusUpdate, searchFlightNumber, flightData }) {
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
            // Center map on live flight location
            const flight = flights[0];
            map.flyTo([flight.lat, flight.lon], 8, {
              duration: 1.5
            });
            if (onStatusUpdate) onStatusUpdate(null);
            onFlightsUpdate(flights);
          } else {
            // No live flight found - check if we have flight data to show last known location
            if (flightData) {
              const status = flightData.flightStatus;
              let airportCode = null;
              let locationName = null;

              // Determine which airport to show based on flight status
              if (status === 'landed') {
                airportCode = flightData.estArrivalAirport;
                locationName = 'arrival';
              } else if (status === 'scheduled' || !status) {
                airportCode = flightData.estDepartureAirport;
                locationName = 'departure';
              } else {
                // Active but not in FR24 - try arrival first, then departure
                airportCode = flightData.estArrivalAirport || flightData.estDepartureAirport;
                locationName = 'last known';
              }

              const airportCoords = airportCode ? AIRPORT_COORDS[airportCode] : null;

              if (airportCoords) {
                // Create a fallback flight marker at the airport
                const fallbackFlight = {
                  fr24_id: 'fallback',
                  flight: searchFlightNumber,
                  callsign: searchFlightNumber,
                  lat: airportCoords.lat,
                  lon: airportCoords.lon,
                  track: 0,
                  alt: 0,
                  gspeed: 0,
                  type: flightData.aircraftModel || 'N/A',
                  squawk: null,
                  origin_country: airportCoords.name,
                  isLastKnown: true,
                  locationName: locationName,
                  airportName: airportCoords.name
                };

                map.flyTo([airportCoords.lat, airportCoords.lon], 10, {
                  duration: 1.5
                });

                if (onStatusUpdate) {
                  onStatusUpdate(`Last known location: ${airportCoords.name}`);
                }
                onFlightsUpdate([fallbackFlight]);
              } else {
                if (onStatusUpdate) onStatusUpdate('Flight not currently airborne');
                onFlightsUpdate([]);
              }
            } else {
              if (onStatusUpdate) onStatusUpdate('Flight not found');
              onFlightsUpdate([]);
            }
          }
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
function createAircraftIcon(heading, altitude, isLastKnown = false) {
  const iconColor = isLastKnown ? 'var(--text-secondary, #888)' : 'var(--primary-color, #9D4EDD)';
  const iconHtml = `
    <div class="aircraft-marker ${isLastKnown ? 'aircraft-grounded' : ''}" style="transform: rotate(${heading}deg); color: ${iconColor}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
      </svg>
      ${!isLastKnown ? `<span class="aircraft-alt">${Math.round(altitude / 100)}</span>` : '<span class="aircraft-alt">📍</span>'}
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'aircraft-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function FlightMap({ onFlightSelect, searchFlightNumber, flightData }) {
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
          flightData={flightData}
        />

        {flights.map((flight) => (
          <Marker
            key={flight.fr24_id}
            position={[flight.lat, flight.lon]}
            icon={createAircraftIcon(flight.track || 0, flight.alt || 0, flight.isLastKnown)}
            eventHandlers={{
              click: () => handleFlightClick(flight)
            }}
          >
            <Popup className="flight-popup">
              <div className="flight-popup-content">
                <div className="flight-popup-header">
                  <h3>{flight.flight || flight.callsign || 'Unknown Flight'}</h3>
                  {flight.isLastKnown ? (
                    <span className="flight-popup-airline" style={{ color: '#888' }}>
                      📍 {flight.locationName} location
                    </span>
                  ) : (
                    flight.origin_country && (
                      <span className="flight-popup-airline">{flight.origin_country}</span>
                    )
                  )}
                </div>

                <div className="flight-popup-body">
                  {flight.isLastKnown ? (
                    <>
                      <div className="flight-popup-row">
                        <span className="label">Location:</span>
                        <span className="value">{flight.airportName}</span>
                      </div>
                      <div className="flight-popup-row">
                        <span className="label">Aircraft:</span>
                        <span className="value">{flight.type}</span>
                      </div>
                      <div className="flight-popup-note" style={{ marginTop: '1rem', opacity: 0.7 }}>
                        Flight not currently airborne. Showing {flight.locationName} airport location.
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>

                {onFlightSelect && !flight.isLastKnown && (
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
