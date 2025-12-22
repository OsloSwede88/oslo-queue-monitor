import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './FlightMap.css';
import { MAP_CONFIG, TIMING, ALTITUDE, AIRCRAFT_ICON } from '../../constants/config';
import { AIRPORT_COORDS } from '../../data/airportCoords';

// Completely override default Leaflet icon with transparent pixel
const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconUrl: transparentPixel,
  iconRetinaUrl: transparentPixel,
  shadowUrl: transparentPixel,
  iconSize: [1, 1],
  iconAnchor: [0, 0],
  shadowSize: [1, 1],
  shadowAnchor: [0, 0]
});

// FlightRadar24 API - Use serverless proxy to keep token secure
const FR24_PROXY = '/api/flightradar24-proxy';

// Component to handle map resize issues
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    // Fix map rendering by invalidating size after mount
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, TIMING.MAP_RESIZE_DELAY);

    // Also invalidate on window resize
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

// Component to fetch and display a specific flight on the map
function FlightsLayer({ onFlightsUpdate, onStatusUpdate, searchFlightNumber, flightData }) {
  const map = useMap();

  // Fetch flight when searchFlightNumber changes
  useEffect(() => {
    if (!searchFlightNumber) {
      // Clear flights when no search
      onFlightsUpdate([]);
      return;
    }

    // Helper function to show last known location when flight not in FR24
    const showLastKnownLocation = () => {
      if (!flightData) return;

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

      // Try to get coordinates from AIRPORT_COORDS first, then fall back to flight data
      let coords = null;
      let airportName = null;

      if (airportCoords) {
        coords = { lat: airportCoords.lat, lon: airportCoords.lon };
        airportName = airportCoords.name;
      } else if (airportCode) {
        // Airport code exists but not in our lookup - try to use flight data coordinates
        if (status === 'landed' && flightData.estArrivalLat && flightData.estArrivalLon) {
          coords = { lat: flightData.estArrivalLat, lon: flightData.estArrivalLon };
          airportName = flightData.estArrivalAirportName || airportCode;
        } else if (flightData.estDepartureLat && flightData.estDepartureLon) {
          coords = { lat: flightData.estDepartureLat, lon: flightData.estDepartureLon };
          airportName = flightData.estDepartureAirportName || airportCode;
        }
      }

      if (coords) {
        // Create a fallback flight marker at the airport
        const fallbackFlight = {
          fr24_id: 'fallback',
          flight: searchFlightNumber,
          callsign: searchFlightNumber,
          lat: coords.lat,
          lon: coords.lon,
          track: 0,
          alt: 0,
          gspeed: 0,
          type: flightData.aircraftModel || 'N/A',
          squawk: null,
          origin_country: airportName,
          isLastKnown: true,
          locationName: locationName,
          airportName: airportName
        };

        map.flyTo([coords.lat, coords.lon], MAP_CONFIG.AIRPORT_ZOOM, {
          duration: TIMING.MAP_FLY_DURATION
        });

        if (onStatusUpdate) {
          onStatusUpdate(`Last known location: ${airportName}`);
        }
        onFlightsUpdate([fallbackFlight]);
      } else if (airportCode) {
        // We have airport code but no coordinates
        const airportDisplayName = flightData.estDepartureAirportName || flightData.estArrivalAirportName || airportCode;
        if (onStatusUpdate) onStatusUpdate(`At ${airportDisplayName} (${airportCode})`);
        onFlightsUpdate([]);
      } else {
        if (onStatusUpdate) onStatusUpdate('Flight not currently airborne');
        onFlightsUpdate([]);
      }
    };

    const fetchFlight = async () => {
      try {
        // Search for specific flight
        const url = `${FR24_PROXY}?flights=${searchFlightNumber}`;

        if (onStatusUpdate) onStatusUpdate('Searching...');

        const response = await fetch(url);

        if (response.status === 429) {
          if (onStatusUpdate) onStatusUpdate('Rate limited - try later');
          onFlightsUpdate([]);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const flights = data.data || [];

          if (flights.length > 0) {
            // Center map on live flight location
            const flight = flights[0];
            map.flyTo([flight.lat, flight.lon], MAP_CONFIG.FLIGHT_ZOOM, {
              duration: TIMING.MAP_FLY_DURATION
            });
            if (onStatusUpdate) onStatusUpdate(null);
            onFlightsUpdate(flights);
          } else {
            // No live flight found - show last known location
            showLastKnownLocation();
          }
        } else {
          const errorText = await response.text();
          // API error - try to show last known location if we have flight data
          if (flightData) {
            showLastKnownLocation();
          } else {
            if (onStatusUpdate) onStatusUpdate(null);
            onFlightsUpdate([]);
          }
        }
      } catch (error) {
        // Connection error - try to show last known location if we have flight data
        if (flightData) {
          showLastKnownLocation();
        } else {
          if (onStatusUpdate) onStatusUpdate(null);
          onFlightsUpdate([]);
        }
      }
    };

    fetchFlight();
  }, [searchFlightNumber, flightData, map, onFlightsUpdate, onStatusUpdate]);

  return null;
}

// Create custom airport icon
function createAirportIcon() {
  const iconHtml = `
    <div class="airport-marker">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#6366f1" opacity="0.2"/>
        <circle cx="12" cy="12" r="6" fill="#6366f1" opacity="0.4"/>
        <circle cx="12" cy="12" r="3" fill="#6366f1"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'airport-icon leaflet-div-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
}

// Create custom aircraft icon that rotates based on heading - Simple solid silhouette
function createAircraftIcon(heading, altitude, isLastKnown = false) {
  const iconColor = isLastKnown ? AIRCRAFT_ICON.GROUNDED_COLOR : AIRCRAFT_ICON.DEFAULT_COLOR;
  const iconHtml = `
    <div class="aircraft-marker ${isLastKnown ? 'aircraft-grounded' : ''}" style="transform: rotate(${heading}deg); filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6));">
      <svg width="${AIRCRAFT_ICON.SIZE}" height="${AIRCRAFT_ICON.SIZE}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2C14.5 2 14 3 14 4.5L14 12L3 15C2 15.3 1.5 16 2 17C2.3 17.5 3 17.8 4 17.5L14 15V23L11 25.5V28L16 26.5L21 28V25.5L18 23V15L28 17.5C29 17.8 29.7 17.5 30 17C30.5 16 30 15.3 29 15L18 12V4.5C18 3 17.5 2 16 2Z"
              fill="${iconColor}"
              stroke="#000"
              stroke-width="0.5"
              stroke-linejoin="round"/>
      </svg>
      ${!isLastKnown ? `<span class="aircraft-alt" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8); font-weight: 600;">${Math.round(altitude / ALTITUDE.DISPLAY_DIVISOR)}</span>` : ''}
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'aircraft-icon leaflet-div-icon',
    iconSize: [AIRCRAFT_ICON.SIZE, AIRCRAFT_ICON.SIZE],
    iconAnchor: [AIRCRAFT_ICON.ANCHOR_OFFSET, AIRCRAFT_ICON.ANCHOR_OFFSET],
    popupAnchor: [0, AIRCRAFT_ICON.POPUP_ANCHOR_OFFSET],
    iconUrl: null,
    shadowUrl: null,
    iconRetinaUrl: null,
    shadowRetinaUrl: null,
    shadowSize: null,
    shadowAnchor: null
  });
}

function FlightMap({ onFlightSelect, searchFlightNumber, flightData }) {
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [status, setStatus] = useState(null);
  const [showAirports, setShowAirports] = useState(true);

  const handleFlightClick = (flight) => {
    setSelectedFlight(flight);
    if (onFlightSelect) {
      onFlightSelect(flight);
    }
  };

  // Get list of major airports to display (all airports would be too many)
  const getMajorAirports = () => {
    const airportList = Object.entries(AIRPORT_COORDS);
    // Show all airports when zoomed in, limit to major ones when zoomed out
    return airportList;
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
            <svg width="64" height="64" viewBox="0 0 32 32" fill="currentColor" style={{ opacity: 0.5, marginBottom: '1rem' }}>
              <path d="M16 3L15 13L3 17V20L15 17V25L11 27V29L16 28L21 29V27L17 25V17L29 20V17L17 13L16 3Z" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>
              <circle cx="16" cy="4" r="1.5" fill="currentColor" opacity="0.8"/>
            </svg>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Track a Flight</h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.7, maxWidth: '300px', textAlign: 'center' }}>
              Search for a flight number above to see its live position on the map
            </p>
          </div>
        </div>
      )}
      <MapContainer
        center={MAP_CONFIG.DEFAULT_CENTER}
        zoom={MAP_CONFIG.DEFAULT_ZOOM}
        className="flight-map"
        zoomControl={true}
      >
        <MapResizeHandler />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={MAP_CONFIG.MAX_ZOOM}
        />

        <FlightsLayer
          onFlightsUpdate={setFlights}
          onStatusUpdate={setStatus}
          searchFlightNumber={searchFlightNumber}
          flightData={flightData}
        />

        {/* Airport markers */}
        {showAirports && getMajorAirports().map(([code, airport]) => (
          <Marker
            key={`airport-${code}`}
            position={[airport.lat, airport.lon]}
            icon={createAirportIcon()}
          >
            <Popup className="airport-popup">
              <div className="airport-popup-content">
                <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600' }}>
                  {airport.name}
                </h3>
                <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                  <div>IATA: {code}</div>
                  <div>
                    {airport.lat.toFixed(4)}°, {airport.lon.toFixed(4)}°
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Flight markers */}
        {flights.map((flight) => {
          const icon = createAircraftIcon(flight.track || 0, flight.alt || 0, flight.isLastKnown);
          return (
          <Marker
            key={flight.fr24_id}
            position={[flight.lat, flight.lon]}
            icon={icon}
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
          );
        })}
      </MapContainer>

      {(flights.length > 0 || !searchFlightNumber || status) && (
        <div className="flight-map-stats">
          {flights.length > 0 ? (
            <>
              <span className="flights-count">
                ✈️ {flights[0].flight || flights[0].callsign}
                {flights[0].type && ` - ${flights[0].type}`}
                {flights[0].reg && !flights[0].type && ` - ${flights[0].reg}`}
              </span>
              {selectedFlight && (
                <span className="selected-flight">
                  {formatAltitude(selectedFlight.alt)} • {formatSpeed(selectedFlight.gspeed)}
                </span>
              )}
            </>
          ) : (
            <>
              {!status && !searchFlightNumber && (
                <span className="flights-count" style={{ opacity: 0.6 }}>
                  Search for a flight above to see it on the map
                </span>
              )}
              {status && (
                <span className="data-source" style={{ color: status.includes('Error') || status.includes('Rate limited') || status.includes('not found') ? '#ef4444' : '#fbbf24', borderLeft: 'none', paddingLeft: '0' }}>
                  {status}
                </span>
              )}
            </>
          )}
          {!status && flights.length > 0 && (
            <span className="data-source">
              Live via FlightRadar24
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default FlightMap;
