import { useState } from 'react';
import './QuickSearch.css';

const EUROPEAN_AIRLINES = [
  {
    name: 'SAS Scandinavian',
    code: 'SK',
    icon: '🇸🇪',
    flights: [
      { number: 'SK4035', route: 'OSL → CPH' },
      { number: 'SK1429', route: 'OSL → ARN' },
      { number: 'SK1477', route: 'OSL → BGO' },
      { number: 'SK4000', route: 'CPH → OSL' }
    ]
  },
  {
    name: 'Norwegian',
    code: 'DY',
    icon: '🇳🇴',
    flights: [
      { number: 'DY1302', route: 'OSL → TRD' },
      { number: 'DY620', route: 'OSL → LGW' },
      { number: 'DY1640', route: 'OSL → BGO' },
      { number: 'DY435', route: 'OSL → AMS' }
    ]
  },
  {
    name: 'KLM',
    code: 'KL',
    icon: '🇳🇱',
    flights: [
      { number: 'KL1143', route: 'AMS → OSL' },
      { number: 'KL1001', route: 'AMS → LHR' },
      { number: 'KL1789', route: 'AMS → CDG' },
      { number: 'KL1991', route: 'AMS → FCO' }
    ]
  },
  {
    name: 'Ryanair',
    code: 'FR',
    icon: '🇮🇪',
    flights: [
      { number: 'FR1392', route: 'OSL → AGP' },
      { number: 'FR1322', route: 'OSL → ALC' },
      { number: 'FR202', route: 'STN → DUB' },
      { number: 'FR8394', route: 'BGY → BCN' }
    ]
  },
  {
    name: 'Lufthansa',
    code: 'LH',
    icon: '🇩🇪',
    flights: [
      { number: 'LH400', route: 'FRA → JFK' },
      { number: 'LH861', route: 'MUC → OSL' },
      { number: 'LH2428', route: 'MUC → LHR' },
      { number: 'LH100', route: 'FRA → JFK' }
    ]
  },
  {
    name: 'British Airways',
    code: 'BA',
    icon: '🇬🇧',
    flights: [
      { number: 'BA117', route: 'LHR → JFK' },
      { number: 'BA762', route: 'LHR → OSL' },
      { number: 'BA306', route: 'LHR → CDG' },
      { number: 'BA432', route: 'LHR → AMS' }
    ]
  },
  {
    name: 'Air France',
    code: 'AF',
    icon: '🇫🇷',
    flights: [
      { number: 'AF1781', route: 'CDG → OSL' },
      { number: 'AF1381', route: 'CDG → AMS' },
      { number: 'AF1664', route: 'CDG → FCO' },
      { number: 'AF1215', route: 'CDG → BCN' }
    ]
  },
  {
    name: 'Wizz Air',
    code: 'W6',
    icon: '🇭🇺',
    flights: [
      { number: 'W62355', route: 'WAW → OSL' },
      { number: 'W61341', route: 'BUD → LTN' },
      { number: 'W62337', route: 'KTW → OSL' },
      { number: 'W62821', route: 'SOF → LTN' }
    ]
  }
];

function QuickSearch({ onSearchFlight }) {
  const [expandedAirline, setExpandedAirline] = useState(null);

  const toggleAirline = (code) => {
    setExpandedAirline(expandedAirline === code ? null : code);
  };

  const handleFlightClick = (flightNumber) => {
    onSearchFlight(flightNumber);
  };

  return (
    <div className="quick-search-container glass glass-card">
      <div className="quick-search-header">
        <h2>Quick Search</h2>
        <p className="quick-search-subtitle text-secondary">
          Popular European airlines and routes
        </p>
      </div>

      <div className="airlines-list">
        {EUROPEAN_AIRLINES.map((airline) => (
          <div key={airline.code} className="airline-section">
            <button
              className={`airline-header ${expandedAirline === airline.code ? 'expanded' : ''}`}
              onClick={() => toggleAirline(airline.code)}
            >
              <div className="airline-info">
                <span className="airline-icon">{airline.icon}</span>
                <div className="airline-text">
                  <span className="airline-name">{airline.name}</span>
                  <span className="airline-code">{airline.code}</span>
                </div>
              </div>
              <span className="expand-icon">
                {expandedAirline === airline.code ? '▼' : '▶'}
              </span>
            </button>

            {expandedAirline === airline.code && (
              <div className="flights-list">
                {airline.flights.map((flight) => (
                  <button
                    key={flight.number}
                    className="flight-item"
                    onClick={() => handleFlightClick(flight.number)}
                  >
                    <span className="flight-number">{flight.number}</span>
                    <span className="flight-route">{flight.route}</span>
                    <span className="search-icon">🔍</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuickSearch;
