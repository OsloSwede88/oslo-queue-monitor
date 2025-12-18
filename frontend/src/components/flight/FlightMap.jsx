import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './FlightMap.css';

// FlightRadar24 API configuration
const FR24_API_TOKEN = '019b32c8-98f2-70e4-b5c4-38b6fb3fd034|a63TegkEsX8vFb0PfkqU70mU0kGtHR0vzxc8LDT8ec0fbafa';
const FR24_API_BASE = 'https://fr24api.flightradar24.com/api/live/flight-positions/full';

// Component to handle map bounds changes and fetch flights
function FlightsLayer({ onFlightsUpdate }) {
  const map = useMap();
  const [bounds, setBounds] = useState(null);

  useEffect(() => {
    const updateBounds = () => {
      const mapBounds = map.getBounds();
      const north = mapBounds.getNorth();
      const south = mapBounds.getSouth();
      const west = mapBounds.getWest();
      const east = mapBounds.getEast();

      setBounds({ north, south, west, east });
    };

    // Initial bounds
    updateBounds();

    // Update on map move/zoom
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);

    return () => {
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
    };
  }, [map]);

  useEffect(() => {
    if (!bounds) return;

    const fetchFlights = async () => {
      try {
        const boundsParam = `${bounds.north},${bounds.south},${bounds.west},${bounds.east}`;
        const response = await fetch(`${FR24_API_BASE}?bounds=${boundsParam}`, {
          headers: {
            'Authorization': `Bearer ${FR24_API_TOKEN}`,
            'Accept-Version': 'v1'
          }
        });

        if (response.ok) {
          const data = await response.json();
          onFlightsUpdate(data.data || []);
        } else {
          console.error('FR24 API error:', response.status);
        }
      } catch (error) {
        console.error('Error fetching flights:', error);
      }
    };

    // Fetch immediately
    fetchFlights();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchFlights, 10000);

    return () => clearInterval(interval);
  }, [bounds, onFlightsUpdate]);

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

        <FlightsLayer onFlightsUpdate={setFlights} />

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
                  <span className="flight-popup-airline">{flight.operating_as || ''}</span>
                </div>

                <div className="flight-popup-body">
                  <div className="flight-popup-row">
                    <span className="label">Aircraft:</span>
                    <span className="value">{flight.type || 'N/A'}</span>
                  </div>
                  <div className="flight-popup-row">
                    <span className="label">Registration:</span>
                    <span className="value">{flight.reg || 'N/A'}</span>
                  </div>
                  <div className="flight-popup-row">
                    <span className="label">Route:</span>
                    <span className="value">
                      {flight.orig_iata || flight.orig_icao || 'N/A'} → {flight.dest_iata || flight.dest_icao || 'N/A'}
                    </span>
                  </div>
                  <div className="flight-popup-row">
                    <span className="label">Altitude:</span>
                    <span className="value">{formatAltitude(flight.alt)}</span>
                  </div>
                  <div className="flight-popup-row">
                    <span className="label">Speed:</span>
                    <span className="value">{formatSpeed(flight.gspeed)}</span>
                  </div>
                  {flight.eta && (
                    <div className="flight-popup-row">
                      <span className="label">ETA:</span>
                      <span className="value">
                        {new Date(flight.eta).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {onFlightSelect && (
                  <button
                    className="flight-popup-details-btn"
                    onClick={() => handleFlightClick(flight)}
                  >
                    View Full Details
                  </button>
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
      </div>
    </div>
  );
}

export default FlightMap;
