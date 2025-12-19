import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './FlightMap.css';

// FlightRadar24 API - Use serverless proxy to keep token secure
const FR24_PROXY = '/api/flightradar24-proxy';

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
        // FlightRadar24 bounds format: north,south,west,east
        const boundsStr = `${bounds.north},${bounds.south},${bounds.west},${bounds.east}`;
        const url = `${FR24_PROXY}?bounds=${boundsStr}`;

        console.log('[FR24] Fetching flights via proxy:', url);
        if (onStatusUpdate) onStatusUpdate('Loading...');
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
          console.log(`[FR24] ✅ Received ${flights.length} flights`);
          if (onStatusUpdate) onStatusUpdate(null);
          onFlightsUpdate(flights);
        } else {
          const errorText = await response.text();
          console.error('[FR24] ❌ API error:', response.status, errorText);
          if (onStatusUpdate) onStatusUpdate(`Error: ${response.status}`);
          onFlightsUpdate([]);
        }
      } catch (error) {
        console.error('[FR24] ❌ Error fetching flights:', error);
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
        const boundsStr = `${bounds.north},${bounds.south},${bounds.west},${bounds.east}`;
        const url = `${FR24_PROXY}?bounds=${boundsStr}`;
        console.log('[FR24] Manual refresh via proxy:', url);
        if (onStatusUpdate) onStatusUpdate('Loading...');
        lastFetchRef.current = now;

        const response = await fetch(url);

        console.log('[FR24] Manual refresh response:', response.status);

        if (response.status === 429) {
          console.warn('[FR24] ❌ Rate limited (429)');
          if (onStatusUpdate) onStatusUpdate('Rate limited - try later');
          onFlightsUpdate([]);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const flights = data.data || [];
          console.log(`[FR24] ✅ Manual refresh: ${flights.length} flights`);
          if (onStatusUpdate) onStatusUpdate(null);
          onFlightsUpdate(flights);
        } else {
          const errorText = await response.text();
          console.error('[FR24] ❌ API error:', response.status, errorText);
          if (onStatusUpdate) onStatusUpdate(`Error: ${response.status}`);
          onFlightsUpdate([]);
        }
      } catch (error) {
        console.error('[FR24] ❌ Error:', error);
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
            Data: FlightRadar24
          </span>
        )}
      </div>
    </div>
  );
}

export default FlightMap;
