import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './FlightMap.css';

// OpenSky Network API - Use serverless proxy to handle OAuth securely
const OPENSKY_PROXY = '/api/opensky-proxy';

// Transform OpenSky state vector to our flight format
const transformOpenSkyData = (states) => {
  if (!states) return [];

  return states
    .filter(state => {
      // Filter out flights on ground and null positions
      const onGround = state[8];
      const lat = state[6];
      const lon = state[5];
      return !onGround && lat !== null && lon !== null;
    })
    .map(state => {
      const [
        icao24,           // [0] ICAO24 hex
        callsign,         // [1] Callsign
        origin_country,   // [2] Country
        time_position,    // [3] Time position
        last_contact,     // [4] Last contact
        longitude,        // [5] Longitude
        latitude,         // [6] Latitude
        baro_altitude,    // [7] Barometric altitude (meters)
        on_ground,        // [8] On ground
        velocity,         // [9] Velocity (m/s)
        true_track,       // [10] True track (degrees)
        vertical_rate,    // [11] Vertical rate (m/s)
        sensors,          // [12] Sensors
        geo_altitude,     // [13] Geometric altitude (meters)
        squawk,           // [14] Squawk code
        spi,              // [15] SPI
        position_source   // [16] Position source
      ] = state;

      return {
        // Unique ID
        fr24_id: icao24 || `os-${Math.random()}`,

        // Flight info
        flight: callsign?.trim() || null,
        callsign: callsign?.trim() || null,

        // Position
        lat: latitude,
        lon: longitude,
        alt: baro_altitude ? Math.round(baro_altitude * 3.28084) : 0, // meters to feet
        track: true_track || 0,

        // Speed
        gspeed: velocity ? Math.round(velocity * 1.94384) : 0, // m/s to knots
        vspeed: vertical_rate ? Math.round(vertical_rate * 196.85) : 0, // m/s to ft/min

        // Aircraft
        hex: icao24?.toUpperCase() || null,
        squawk: squawk || null,

        // Metadata
        source: 'OpenSky',
        timestamp: new Date(last_contact * 1000).toISOString(),
        origin_country: origin_country || null,

        // Placeholders (OpenSky doesn't provide these)
        type: null,
        reg: null,
        painted_as: null,
        operating_as: null,
        orig_iata: null,
        orig_icao: null,
        dest_iata: null,
        dest_icao: null,
        eta: null
      };
    });
};

// Component to handle map bounds changes and fetch flights
function FlightsLayer({ onFlightsUpdate, onStatusUpdate, refreshTrigger }) {
  const map = useMap();
  const [bounds, setBounds] = useState(null);
  const lastFetchRef = useRef(0);

  // Debug: Component mounted
  useEffect(() => {
    console.log('[FlightsLayer] Component mounted');
  }, []);

  useEffect(() => {
    let debounceTimer;
    let initialBoundsSet = false;

    const updateBounds = () => {
      // Debounce: wait 2 seconds after user stops moving map
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const mapBounds = map.getBounds();
        const north = mapBounds.getNorth();
        const south = mapBounds.getSouth();
        const west = mapBounds.getWest();
        const east = mapBounds.getEast();

        console.log('[FlightsLayer] Bounds updated (debounced)');
        setBounds({ north, south, west, east });
      }, 2000);
    };

    // Initial bounds (with small delay to avoid double-fetch)
    setTimeout(() => {
      if (!initialBoundsSet) {
        const mapBounds = map.getBounds();
        console.log('[FlightsLayer] Setting initial bounds');
        setBounds({
          north: mapBounds.getNorth(),
          south: mapBounds.getSouth(),
          west: mapBounds.getWest(),
          east: mapBounds.getEast()
        });
        initialBoundsSet = true;
      }
    }, 500);

    // Update on map move/zoom (with debounce)
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);

    return () => {
      clearTimeout(debounceTimer);
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
    };
  }, [map]);

  useEffect(() => {
    if (!bounds) return;

    const fetchFlights = async () => {
      // Rate limiting: minimum 10 seconds between requests (with OAuth we have 4000 credits/day)
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchRef.current;
      const minInterval = 10000; // 10 seconds

      if (timeSinceLastFetch < minInterval) {
        const waitTime = Math.ceil((minInterval - timeSinceLastFetch) / 1000);
        console.log(`[OpenSky] Rate limit: waiting ${waitTime}s`);
        if (onStatusUpdate) onStatusUpdate(`Cooldown: ${waitTime}s`);
        return;
      }

      try {
        // Use serverless proxy to handle OAuth authentication securely
        const url = `${OPENSKY_PROXY}?lamin=${bounds.south}&lomin=${bounds.west}&lamax=${bounds.north}&lomax=${bounds.east}`;

        console.log('[OpenSky] Fetching flights via proxy:', url);
        if (onStatusUpdate) onStatusUpdate('Loading...');
        lastFetchRef.current = now;

        const response = await fetch(url);

        console.log('[OpenSky] Response status:', response.status);

        if (response.status === 429) {
          console.warn('[OpenSky] Rate limited (429). Daily limit may be reached.');
          if (onStatusUpdate) onStatusUpdate('Rate limited - try later');
          onFlightsUpdate([]);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const flights = transformOpenSkyData(data.states);
          console.log(`[OpenSky] ✅ Received ${flights.length} flights`);
          if (onStatusUpdate) onStatusUpdate(null);
          onFlightsUpdate(flights);
        } else {
          const errorText = await response.text();
          console.error('[OpenSky] ❌ API error:', response.status, errorText);
          if (onStatusUpdate) onStatusUpdate(`Error: ${response.status}`);
          onFlightsUpdate([]);
        }
      } catch (error) {
        console.error('[OpenSky] ❌ Error fetching flights:', error);
        if (onStatusUpdate) onStatusUpdate('Connection error');
        onFlightsUpdate([]);
      }
    };

    // Fetch immediately (with rate limit check)
    fetchFlights();

    // Auto-refresh every 60 seconds (very conservative to preserve daily API credits)
    const interval = setInterval(fetchFlights, 60000);

    return () => clearInterval(interval);
  }, [bounds, onFlightsUpdate, onStatusUpdate]);

  // Manual refresh trigger
  useEffect(() => {
    if (!refreshTrigger || !bounds) return;

    const fetchFlights = async () => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchRef.current;
      const minInterval = 10000;

      if (timeSinceLastFetch < minInterval) {
        const waitTime = Math.ceil((minInterval - timeSinceLastFetch) / 1000);
        console.log(`[OpenSky] Manual refresh blocked: wait ${waitTime}s`);
        if (onStatusUpdate) onStatusUpdate(`Wait ${waitTime}s before refresh`);
        return;
      }

      try {
        const url = `${OPENSKY_PROXY}?lamin=${bounds.south}&lomin=${bounds.west}&lamax=${bounds.north}&lomax=${bounds.east}`;
        console.log('[OpenSky] Manual refresh via proxy:', url);
        if (onStatusUpdate) onStatusUpdate('Loading...');
        lastFetchRef.current = now;

        const response = await fetch(url);

        console.log('[OpenSky] Manual refresh response:', response.status);

        if (response.status === 429) {
          console.warn('[OpenSky] ❌ Rate limited (429)');
          if (onStatusUpdate) onStatusUpdate('Rate limited - try later');
          onFlightsUpdate([]);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const flights = transformOpenSkyData(data.states);
          console.log(`[OpenSky] ✅ Manual refresh: ${flights.length} flights`);
          if (onStatusUpdate) onStatusUpdate(null);
          onFlightsUpdate(flights);
        } else {
          const errorText = await response.text();
          console.error('[OpenSky] ❌ API error:', response.status, errorText);
          if (onStatusUpdate) onStatusUpdate(`Error: ${response.status}`);
          onFlightsUpdate([]);
        }
      } catch (error) {
        console.error('[OpenSky] ❌ Error:', error);
        if (onStatusUpdate) onStatusUpdate('Connection error');
        onFlightsUpdate([]);
      }
    };

    fetchFlights();
  }, [refreshTrigger, bounds, onFlightsUpdate, onStatusUpdate]);

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

function FlightMap({ onFlightSelect }) {
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [status, setStatus] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Debug: Component mounted
  useEffect(() => {
    console.log('[FlightMap] Component mounted');
  }, []);

  const handleFlightClick = (flight) => {
    setSelectedFlight(flight);
    if (onFlightSelect) {
      onFlightSelect(flight);
    }
  };

  const handleManualRefresh = () => {
    console.log('[FlightMap] Manual refresh triggered');
    setRefreshTrigger(prev => prev + 1);
  };

  const formatSpeed = (speed) => {
    return speed ? `${Math.round(speed)} kts` : 'N/A';
  };

  const formatAltitude = (altitude) => {
    return altitude ? `${Math.round(altitude)} ft` : 'N/A';
  };

  return (
    <div className="flight-map-container">
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
          refreshTrigger={refreshTrigger}
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
        <span className="flights-count">
          {flights.length} aircraft visible
        </span>
        {selectedFlight && (
          <span className="selected-flight">
            Selected: {selectedFlight.flight || selectedFlight.callsign}
          </span>
        )}
        <button
          onClick={handleManualRefresh}
          className="map-refresh-btn"
          title="Refresh flight data (20s cooldown)"
        >
          ↻ Refresh
        </button>
        {status && (
          <span className="data-source" style={{ color: status.includes('Error') || status.includes('Rate limited') ? '#ef4444' : '#fbbf24' }}>
            {status}
          </span>
        )}
        {!status && (
          <span className="data-source">
            Data: OpenSky Network
          </span>
        )}
      </div>
    </div>
  );
}

export default FlightMap;
