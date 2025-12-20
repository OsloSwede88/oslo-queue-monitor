import { useState, useEffect, useRef } from 'react';
import './FlightTracker.css';
import FlightTimeline from './flight/FlightTimeline';
import FlightMap from './flight/FlightMap';

// Quick Search Airlines Data
const QUICK_AIRLINES = [
  {
    name: 'SAS',
    code: 'SK',
    icon: '🇸🇪',
    flights: [
      'SK4035', 'SK4000', 'SK1429', 'SK1477', 'SK1415', 'SK1416', 'SK805', 'SK806',
      'SK1471', 'SK1472', 'SK463', 'SK464', 'SK1868', 'SK1869', 'SK4601', 'SK4602',
      'SK235', 'SK236', 'SK1463', 'SK1464', 'SK4783', 'SK4784', 'SK4001', 'SK4002',
      'SK1437', 'SK1438', 'SK4037', 'SK4038', 'SK4411', 'SK4412', 'SK1401', 'SK1402'
    ]
  },
  {
    name: 'Norwegian',
    code: 'DY',
    icon: '🇳🇴',
    flights: [
      'DY1302', 'DY1303', 'DY620', 'DY621', 'DY1640', 'DY1641', 'DY435', 'DY436',
      'DY1304', 'DY1305', 'DY1306', 'DY1307', 'DY1308', 'DY1309', 'DY614', 'DY615',
      'DY1642', 'DY1643', 'DY1644', 'DY1645', 'DY437', 'DY438', 'DY622', 'DY623',
      'DY1310', 'DY1311', 'DY1646', 'DY1647', 'DY624', 'DY625', 'DY439', 'DY440'
    ]
  },
  {
    name: 'KLM',
    code: 'KL',
    icon: '🇳🇱',
    flights: [
      'KL1143', 'KL1144', 'KL1001', 'KL1002', 'KL1789', 'KL1790', 'KL1991', 'KL1992',
      'KL1145', 'KL1146', 'KL1147', 'KL1148', 'KL1003', 'KL1004', 'KL1791', 'KL1792',
      'KL1149', 'KL1150', 'KL1993', 'KL1994', 'KL1005', 'KL1006', 'KL1793', 'KL1794',
      'KL1151', 'KL1152', 'KL1995', 'KL1996', 'KL1007', 'KL1008', 'KL1795', 'KL1796'
    ]
  },
  {
    name: 'Ryanair',
    code: 'FR',
    icon: '🇮🇪',
    flights: [
      'FR1392', 'FR1393', 'FR1322', 'FR1323', 'FR202', 'FR203', 'FR8394', 'FR8395',
      'FR1394', 'FR1395', 'FR1324', 'FR1325', 'FR204', 'FR205', 'FR8396', 'FR8397',
      'FR1396', 'FR1397', 'FR1326', 'FR1327', 'FR206', 'FR207', 'FR8398', 'FR8399',
      'FR1398', 'FR1399', 'FR1328', 'FR1329', 'FR208', 'FR209', 'FR8400', 'FR8401'
    ]
  },
  {
    name: 'Lufthansa',
    code: 'LH',
    icon: '🇩🇪',
    flights: [
      'LH400', 'LH401', 'LH861', 'LH862', 'LH2428', 'LH2429', 'LH100', 'LH101',
      'LH863', 'LH864', 'LH2430', 'LH2431', 'LH402', 'LH403', 'LH102', 'LH103',
      'LH865', 'LH866', 'LH2432', 'LH2433', 'LH404', 'LH405', 'LH104', 'LH105',
      'LH867', 'LH868', 'LH2434', 'LH2435', 'LH406', 'LH407', 'LH106', 'LH107'
    ]
  },
  {
    name: 'British Airways',
    code: 'BA',
    icon: '🇬🇧',
    flights: [
      'BA117', 'BA118', 'BA762', 'BA763', 'BA306', 'BA307', 'BA432', 'BA433',
      'BA764', 'BA765', 'BA308', 'BA309', 'BA434', 'BA435', 'BA119', 'BA120',
      'BA766', 'BA767', 'BA310', 'BA311', 'BA436', 'BA437', 'BA121', 'BA122',
      'BA768', 'BA769', 'BA312', 'BA313', 'BA438', 'BA439', 'BA123', 'BA124'
    ]
  }
];

function FlightTracker({ onSearchHistoryUpdate, searchFromHistoryTrigger, onSavedFlightsUpdate }) {
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [flightData, setFlightData] = useState(null);
  const [weatherData, setWeatherData] = useState({ departure: null, arrival: null });
  const [error, setError] = useState(null);
  const [aircraftInfo, setAircraftInfo] = useState(null);
  const [aircraftImage, setAircraftImage] = useState(null);
  const [loadingAircraftInfo, setLoadingAircraftInfo] = useState(false);
  const [loadingAircraftImage, setLoadingAircraftImage] = useState(false);

  // Quick Search dropdown state
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [selectedAirline, setSelectedAirline] = useState(null);
  const quickSearchRef = useRef(null);

  // Note: Real-time flight monitoring removed (backend deprecated)

  // Track if we should auto-search from history
  const shouldAutoSearch = useRef(false);

  // Saved/Favorite flights state
  const [savedFlights, setSavedFlights] = useState(() => {
    return JSON.parse(localStorage.getItem('savedFlights') || '[]');
  });

  // Notify parent when saved flights change
  useEffect(() => {
    if (onSavedFlightsUpdate) {
      onSavedFlightsUpdate(savedFlights);
    }
  }, [savedFlights, onSavedFlightsUpdate]);

  // Check if current flight is saved
  const isFlightSaved = (flightNumber) => {
    return savedFlights.some(f => f.flightNumber === flightNumber);
  };

  // Toggle save/unsave flight
  const toggleSaveFlight = () => {
    if (!flightData) return;

    const flightNumber = flightData.callsign;
    const isSaved = isFlightSaved(flightNumber);

    if (isSaved) {
      // Remove from saved flights
      const newSaved = savedFlights.filter(f => f.flightNumber !== flightNumber);
      setSavedFlights(newSaved);
      localStorage.setItem('savedFlights', JSON.stringify(newSaved));
    } else {
      // Add to saved flights
      const savedFlight = {
        flightNumber: flightData.callsign,
        airline: flightData.airline,
        route: `${flightData.estDepartureAirport} → ${flightData.estArrivalAirport}`,
        savedAt: new Date().toISOString()
      };
      const newSaved = [savedFlight, ...savedFlights];
      setSavedFlights(newSaved);
      localStorage.setItem('savedFlights', JSON.stringify(newSaved));
    }
  };

  // Save search to history
  const saveToSearchHistory = (flightInfo) => {
    const historyItem = {
      flightNumber: flightInfo.callsign,
      airline: flightInfo.airline,
      route: `${flightInfo.estDepartureAirport} → ${flightInfo.estArrivalAirport}`,
      timestamp: new Date().toISOString(),
      date: flightDate || new Date().toISOString().split('T')[0]
    };

    // Get existing history
    const existingHistory = JSON.parse(localStorage.getItem('flightSearchHistory') || '[]');

    // Remove duplicates (same flight number searched recently)
    const filteredHistory = existingHistory.filter(
      item => item.flightNumber !== historyItem.flightNumber
    );

    // Add new search to beginning, keep max 15 items
    const newHistory = [historyItem, ...filteredHistory].slice(0, 15);

    // Save to localStorage
    localStorage.setItem('flightSearchHistory', JSON.stringify(newHistory));

    // Notify parent component if callback provided
    if (onSearchHistoryUpdate) {
      onSearchHistoryUpdate(newHistory);
    }
  };

  const fetchWeatherData = async (icaoCode) => {
    console.log('[fetchWeatherData] Called with ICAO:', icaoCode);
    if (!icaoCode) {
      console.log('[fetchWeatherData] No ICAO code provided, returning null');
      return null;
    }

    const apiKey = import.meta.env.VITE_CHECKWX_API_KEY;
    console.log('[fetchWeatherData] API key configured:', apiKey ? 'Yes' : 'No');
    if (!apiKey || apiKey === 'your_checkwx_api_key_here') {
      console.warn('[fetchWeatherData] CheckWX API key not configured. Weather data will not be available.');
      return null;
    }

    try {
      const url = `https://api.checkwx.com/metar/${icaoCode}/decoded`;
      console.log('[fetchWeatherData] Fetching from:', url);
      // Use CheckWX API for METAR data (free, 3000 requests/day)
      const response = await fetch(url, {
        headers: {
          'X-API-Key': apiKey
        }
      });

      console.log('[fetchWeatherData] Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[fetchWeatherData] Response data:', data);
        return data.data?.[0] || null;
      }
    } catch (err) {
      console.error('[fetchWeatherData] Error:', err);
    }
    return null;
  };

  const fetchAircraftImage = async (registration, icao24) => {
    if (!registration && !icao24) return null;

    // Helper to parse aircraft info from Planespotters URL
    const parseAircraftFromUrl = (url) => {
      try {
        // URL format: https://www.planespotters.net/photo/{id}/{registration}-{airline}-{aircraft-type}
        // Example: /photo/123/hs-thj-thai-airways-airbus-a350-941?utm_source=api

        // Remove query string first
        const cleanUrl = url.split('?')[0];

        const urlParts = cleanUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        const parts = lastPart.split('-');

        if (parts.length >= 3) {
          // Find where the aircraft manufacturer starts
          const manufacturers = ['airbus', 'boeing', 'embraer', 'bombardier', 'atr', 'cessna', 'gulfstream', 'mcdonnell', 'lockheed'];
          let aircraftStartIndex = -1;

          for (let i = 0; i < parts.length; i++) {
            if (manufacturers.includes(parts[i].toLowerCase())) {
              aircraftStartIndex = i;
              break;
            }
          }

          if (aircraftStartIndex > 0) {
            // Registration is everything before the manufacturer
            const regParts = parts.slice(0, aircraftStartIndex);
            // Find where registration ends (usually 2-3 parts, before airline name)
            // Registration formats: XX-XXX, X-XXXX, XX-XXXX
            let regLength = regParts.length >= 2 && regParts[0].length <= 2 && regParts[1].length <= 4 ? 2 : 1;

            const reg = regParts.slice(0, regLength).join('-').toUpperCase();

            // Aircraft model is from manufacturer onwards
            const aircraftModel = parts.slice(aircraftStartIndex)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

            console.log('[fetchAircraftImage] Parsed from URL:', { registration: reg, model: aircraftModel });
            return { registration: reg, aircraftType: aircraftModel };
          }
        }
      } catch (err) {
        console.error('[fetchAircraftImage] Error parsing URL:', err);
      }
      return { registration: null, aircraftType: null };
    };

    try {
      // Call Planespotters API directly (supports CORS)
      if (icao24) {
        const response = await fetch(`https://api.planespotters.net/pub/photos/hex/${icao24}`, {
          headers: {
            'User-Agent': 'Flight-Tracker-App/1.0'
          }
        });
        if (response.ok) {
          const data = await response.json();
          console.log('[fetchAircraftImage] Planespotters data:', data);
          if (data.photos && data.photos.length > 0) {
            const photo = data.photos[0];
            const parsed = parseAircraftFromUrl(photo.link);

            return {
              url: photo.thumbnail_large.src,
              photographer: photo.photographer,
              link: photo.link,
              registration: parsed.registration || registration,
              aircraftType: parsed.aircraftType,
              aircraftIcao: null
            };
          }
        }
      }

      // Fallback to registration search
      if (registration) {
        const response = await fetch(`https://api.planespotters.net/pub/photos/reg/${registration}`, {
          headers: {
            'User-Agent': 'Flight-Tracker-App/1.0'
          }
        });
        if (response.ok) {
          const data = await response.json();
          console.log('[fetchAircraftImage] Planespotters data:', data);
          if (data.photos && data.photos.length > 0) {
            const photo = data.photos[0];
            const parsed = parseAircraftFromUrl(photo.link);

            return {
              url: photo.thumbnail_large.src,
              photographer: photo.photographer,
              link: photo.link,
              registration: parsed.registration || registration,
              aircraftType: parsed.aircraftType,
              aircraftIcao: null
            };
          }
        }
      }
    } catch (err) {
      console.error('Aircraft image fetch error:', err);
    }
    return null;
  };

  const generateAircraftInfo = async (aircraftModel, registration, airline) => {
    console.log('[generateAircraftInfo] Called with:', { aircraftModel, registration, airline });

    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    console.log('[generateAircraftInfo] API key configured:', apiKey ? 'Yes' : 'No');

    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      console.warn('[generateAircraftInfo] OpenRouter API key not configured. Aircraft info will not be available.');
      return null;
    }

    try {
      const prompt = `Provide detailed information about the ${aircraftModel || 'aircraft'} ${registration ? `with registration ${registration}` : ''} ${airline ? `operated by ${airline}` : ''}. Include:
1. Aircraft manufacturer and full model name
2. Key specifications (passenger capacity, range, cruising speed)
3. First flight and when it entered service
4. Interesting facts or notable features
5. Common routes or operators

Keep it concise but informative, around 150-200 words.`;

      console.log('[generateAircraftInfo] Prompt:', prompt);
      console.log('[generateAircraftInfo] Making API call to OpenRouter...');

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Oslo Airport Queue Monitor'
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-nano',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      console.log('[generateAircraftInfo] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[generateAircraftInfo] Response data:', data);
        const content = data.choices[0].message.content;
        console.log('[generateAircraftInfo] Returning content length:', content ? content.length : 0);
        return content;
      } else if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[generateAircraftInfo] Rate limit error (429):', errorData);
        console.warn('[generateAircraftInfo] OpenRouter rate limited. Try again in a few seconds.');
        return null;
      } else {
        const errorText = await response.text();
        console.error('[generateAircraftInfo] API error response:', errorText);
        return null;
      }
    } catch (err) {
      console.error('[generateAircraftInfo] Exception caught:', err);
      return null;
    }
  };

  const iataToIcao = (iataCode) => {
    // Comprehensive IATA to ICAO mapping for Norwegian and major European airports
    const iataIcaoMap = {
      // Norway
      'OSL': 'ENGM', // Oslo Gardermoen
      'BGO': 'ENBR', // Bergen Flesland
      'TRD': 'ENVA', // Trondheim Værnes
      'SVG': 'ENZV', // Stavanger Sola
      'TOS': 'ENTC', // Tromsø Langnes
      'BOO': 'ENBO', // Bodø
      'KRS': 'ENCN', // Kristiansand Kjevik
      'AES': 'ENAL', // Ålesund Vigra
      'TRF': 'ENSR', // Sandefjord Torp
      'HAU': 'ENHD', // Haugesund Karmøy
      'MOL': 'ENML', // Molde Årø
      'KKN': 'ENKB', // Kirkenes
      'EVE': 'ENEV', // Harstad/Narvik Evenes
      'LKL': 'ENLK', // Lakselv Banak

      // Scandinavia
      'CPH': 'EKCH', // Copenhagen
      'ARN': 'ESSA', // Stockholm Arlanda
      'GOT': 'ESGG', // Gothenburg Landvetter
      'HEL': 'EFHK', // Helsinki
      'RKV': 'BIRK', // Reykjavik
      'KEF': 'BIKF', // Keflavik

      // Europe Major
      'LHR': 'EGLL', // London Heathrow
      'LGW': 'EGKK', // London Gatwick
      'CDG': 'LFPG', // Paris Charles de Gaulle
      'AMS': 'EHAM', // Amsterdam Schiphol
      'FRA': 'EDDF', // Frankfurt
      'MUC': 'EDDM', // Munich
      'BCN': 'LEBL', // Barcelona
      'MAD': 'LEMD', // Madrid
      'FCO': 'LIRF', // Rome Fiumicino
      'ZRH': 'LSZH', // Zurich
      'VIE': 'LOWW', // Vienna
      'BRU': 'EBBR', // Brussels
      'DUB': 'EIDW', // Dublin
      'PRG': 'LKPR', // Prague
      'WAW': 'EPWA', // Warsaw

      // Add more as needed
    };

    return iataIcaoMap[iataCode] || iataCode; // Return ICAO if found, otherwise return original
  };

  const normalizeAirportName = (airportName, iataCode) => {
    // Map Norwegian airport technical names to city names
    const norwegianAirportMappings = {
      'Kjevik': 'Kristiansand',
      'Sola': 'Stavanger',
      'Flesland': 'Bergen',
      'Værnes': 'Trondheim',
      'Langnes': 'Tromsø',
      'Gardermoen': 'Oslo',
      'Torp': 'Sandefjord',
      'Vigra': 'Ålesund'
    };

    // Check if the airport name should be mapped to a city name
    if (norwegianAirportMappings[airportName]) {
      return norwegianAirportMappings[airportName];
    }

    // Return the original name if no mapping found
    return airportName;
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
    setAircraftInfo(null);
    setAircraftImage(null);
    setLoadingAircraftImage(false);
    setLoadingAircraftInfo(false);

    try {
      const apiKey = import.meta.env.VITE_AIRLABS_API_KEY;

      // Check if API key is configured
      if (!apiKey || apiKey === 'your_airlabs_api_key_here') {
        setError('Flight tracking requires an AirLabs API key. Get a free key at airlabs.co (1000 requests/month) and add it to your .env file as VITE_AIRLABS_API_KEY.');
        setLoading(false);
        return;
      }

      // Use AirLabs API for real-time flight data
      const response = await fetch(
        `https://airlabs.co/api/v9/flight?api_key=${apiKey}&flight_iata=${flightNumber.toUpperCase()}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('AirLabs response:', data);

      // Check if response exists and has flight data (response is an object, not array)
      if (data.response && data.response.flight_iata) {
        const flight = data.response;

        // Log aircraft data to debug
        console.log('Aircraft data:', flight);

        // Convert AirLabs format to our format
        const flightInfo = {
          callsign: flight.flight_iata || flight.flight_number || flightNumber,
          estDepartureAirport: flight.dep_iata || 'N/A',
          estArrivalAirport: flight.arr_iata || 'N/A',
          departureAirportName: normalizeAirportName(flight.dep_name || 'N/A', flight.dep_iata),
          arrivalAirportName: normalizeAirportName(flight.arr_name || 'N/A', flight.arr_iata),

          // Departure times
          scheduledDeparture: flight.dep_time || null,
          estimatedDeparture: flight.dep_estimated || flight.dep_time || null,
          actualDeparture: flight.dep_actual || null,

          // Arrival times
          scheduledArrival: flight.arr_time || null,
          estimatedArrival: flight.arr_estimated || flight.arr_time || null,
          actualArrival: flight.arr_actual || null,

          // Legacy fields for compatibility
          firstSeen: flight.dep_time ? new Date(flight.dep_time).getTime() / 1000 : null,
          lastSeen: flight.arr_time ? new Date(flight.arr_time).getTime() / 1000 : null,

          // Aircraft information
          icao24: flight.reg_number || flight.hex || 'N/A',
          aircraftRegistration: flight.reg_number || null,
          aircraftIcao: flight.aircraft_icao || null,
          aircraftModel: flight.model || null,

          // Flight details
          flightStatus: flight.status,
          airline: flight.airline_name,
          airlineIata: flight.airline_iata,

          // Terminal/Gate info
          departureTerminal: flight.dep_terminal || null,
          departureGate: flight.dep_gate || null,
          arrivalTerminal: flight.arr_terminal || null,
          arrivalGate: flight.arr_gate || null,

          // Delay info (calculated from scheduled vs actual/estimated)
          departureDelay: flight.delayed || null,
          arrivalDelay: null
        };

        // If AirLabs doesn't have aircraft data, try AviationStack as fallback
        if (!flightInfo.aircraftRegistration && !flightInfo.aircraftModel) {
          console.log('[FlightTracker] No aircraft data from AirLabs, trying AviationStack fallback...');
          const aviationStackKey = import.meta.env.VITE_AVIATIONSTACK_API_KEY;

          if (aviationStackKey && aviationStackKey !== 'your_aviationstack_api_key_here') {
            try {
              const asResponse = await fetch(
                `https://api.aviationstack.com/v1/flights?access_key=${aviationStackKey}&flight_iata=${flightNumber.toUpperCase()}`
              );

              if (asResponse.ok) {
                const asData = await asResponse.json();
                console.log('[FlightTracker] AviationStack response:', asData);

                if (asData.data && asData.data.length > 0) {
                  const asFlight = asData.data[0];
                  console.log('[FlightTracker] AviationStack aircraft object:', asFlight.aircraft);

                  // Update flightInfo with AviationStack aircraft data
                  if (asFlight.aircraft) {
                    // Get hex code (icao24) - this is what we need for photos!
                    if (asFlight.aircraft.icao24) {
                      flightInfo.icao24 = asFlight.aircraft.icao24;
                    }
                    // Get registration if available
                    if (asFlight.aircraft.registration) {
                      flightInfo.aircraftRegistration = asFlight.aircraft.registration;
                    }
                    // Get aircraft type codes
                    if (asFlight.aircraft.iata) {
                      flightInfo.aircraftIcao = asFlight.aircraft.iata;
                      flightInfo.aircraftModel = asFlight.aircraft.iata;
                    }
                    if (asFlight.aircraft.icao) {
                      flightInfo.aircraftIcao = asFlight.aircraft.icao;
                    }

                    console.log('[FlightTracker] Updated aircraft data from AviationStack:', {
                      icao24: flightInfo.icao24,
                      registration: flightInfo.aircraftRegistration,
                      icao: flightInfo.aircraftIcao,
                      model: flightInfo.aircraftModel
                    });
                  }
                }
              }
            } catch (err) {
              console.log('[FlightTracker] AviationStack fallback failed:', err.message);
            }
          } else {
            console.log('[FlightTracker] AviationStack API key not configured, skipping fallback');
          }
        }

        setFlightData(flightInfo);

        // Save to search history
        saveToSearchHistory(flightInfo);

        // Fetch weather data (convert IATA to ICAO codes)
        const depIcao = iataToIcao(flightInfo.estDepartureAirport);
        const arrIcao = iataToIcao(flightInfo.estArrivalAirport);
        console.log('[FlightTracker] Fetching weather data for:', {
          departure: `${flightInfo.estDepartureAirport} (${depIcao})`,
          arrival: `${flightInfo.estArrivalAirport} (${arrIcao})`
        });
        const [departureWeather, arrivalWeather] = await Promise.all([
          fetchWeatherData(depIcao),
          fetchWeatherData(arrIcao)
        ]);

        console.log('[FlightTracker] Weather data received:', {
          departure: departureWeather,
          arrival: arrivalWeather
        });

        setWeatherData({
          departure: departureWeather,
          arrival: arrivalWeather
        });

        // Fetch aircraft details in background
        console.log('[FlightTracker] Fetching aircraft details...');
        console.log('[FlightTracker] Registration:', flightInfo.aircraftRegistration);
        console.log('[FlightTracker] ICAO24:', flightInfo.icao24);
        console.log('[FlightTracker] Model:', flightInfo.aircraftModel);

        setLoadingAircraftInfo(true);
        setLoadingAircraftImage(true);

        // Fetch Planespotters first to get accurate aircraft model
        fetchAircraftImage(flightInfo.aircraftRegistration, flightInfo.icao24)
          .then(image => {
            console.log('[FlightTracker] Aircraft image result:', image);
            setLoadingAircraftImage(false);

            // Update display immediately with Planespotters data
            if (image) {
              setAircraftImage(image);

              // Update flight data with Planespotters info
              if (image.registration || image.aircraftType || image.aircraftIcao) {
                setFlightData(prevData => ({
                  ...prevData,
                  aircraftRegistration: image.registration || prevData.aircraftRegistration,
                  aircraftModel: image.aircraftType || prevData.aircraftModel,
                  aircraftIcao: image.aircraftIcao || prevData.aircraftIcao
                }));
                console.log('[FlightTracker] Updated flight data with Planespotters info:', {
                  registration: image.registration,
                  model: image.aircraftType,
                  icao: image.aircraftIcao
                });
              }

              // Now generate AI info with the actual aircraft model from Planespotters
              const aircraftModel = image.aircraftType || flightInfo.aircraftModel;
              const registration = image.registration || flightInfo.aircraftRegistration;

              console.log('[FlightTracker] Calling AI with aircraft model:', aircraftModel);
              return generateAircraftInfo(aircraftModel, registration, flightInfo.airline);
            } else {
              // No image found, still try AI with whatever data we have
              return generateAircraftInfo(flightInfo.aircraftModel, flightInfo.aircraftRegistration, flightInfo.airline);
            }
          })
          .then(info => {
            console.log('[FlightTracker] Aircraft info result:', info);
            setAircraftInfo(info);
            setLoadingAircraftInfo(false);
          })
          .catch(err => {
            console.error('[FlightTracker] Error fetching aircraft details:', err);
            setLoadingAircraftInfo(false);
            setLoadingAircraftImage(false);
          });
      } else {
        setError(`No flight found for ${flightNumber}. Try flight numbers like LH400, BA117, SK4035, DY1302.`);
      }
    } catch (err) {
      console.error('Flight search error:', err);
      setError(`Unable to fetch flight data: ${err.message}. Please check your API key or try again later.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle search from history trigger
  useEffect(() => {
    if (searchFromHistoryTrigger) {
      setFlightNumber(searchFromHistoryTrigger.flightNumber);
      setFlightDate(searchFromHistoryTrigger.date || '');
      shouldAutoSearch.current = true;
    }
  }, [searchFromHistoryTrigger]);

  // Auto-search when flight number is set from history
  useEffect(() => {
    if (shouldAutoSearch.current && flightNumber) {
      shouldAutoSearch.current = false;
      searchFlight();
    }
  }, [flightNumber]);

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

  // Note: Flight subscription feature removed (backend deprecated)

  // ICAO to IATA airline code mapping (comprehensive)
  const icaoToIataMapping = {
    // === SCANDINAVIA & NORDICS ===
    'NOZ': 'DY',   // Norwegian Air Shuttle
    'NAX': 'DY',   // Norwegian Air International
    'SAS': 'SK',   // SAS Scandinavian Airlines
    'WIF': 'WF',   // Widerøe
    'FIN': 'AY',   // Finnair
    'DTR': 'RC',   // DAT Danish Air Transport (using DTR to avoid conflict)
    'ICE': 'FI',   // Icelandair
    'BCS': 'OV',   // Bluebird Nordic (BRA Braathens Regional)
    'TFL': 'PY',   // Transavia France

    // === WESTERN EUROPE ===
    'DLH': 'LH',   // Lufthansa
    'BAW': 'BA',   // British Airways
    'AFR': 'AF',   // Air France
    'KLM': 'KL',   // KLM Royal Dutch Airlines
    'RYR': 'FR',   // Ryanair
    'EZY': 'U2',   // easyJet
    'IBE': 'IB',   // Iberia
    'TAP': 'TP',   // TAP Air Portugal
    'SWR': 'LX',   // Swiss International Air Lines
    'AUA': 'OS',   // Austrian Airlines
    'BEL': 'SN',   // Brussels Airlines
    'EWG': 'EW',   // Eurowings
    'GWI': 'ST',   // Germania
    'TUI': 'X3',   // TUI Airways
    'EIN': 'EI',   // Aer Lingus
    'RUK': 'RK',   // Ryanair UK
    'VLG': 'VY',   // Vueling Airlines
    'AEE': 'A3',   // Aegean Airlines
    'THY': 'TK',   // Turkish Airlines

    // === EASTERN EUROPE ===
    'LOT': 'LO',   // LOT Polish Airlines
    'CSA': 'OK',   // Czech Airlines
    'WZZ': 'W6',   // Wizz Air
    'TRA': 'HV',   // Transavia
    'ROT': 'RO',   // TAROM
    'BUL': 'FB',   // Bulgaria Air
    'UKR': 'PS',   // Ukraine International Airlines
    'BMS': 'ZB',   // Air Albania
    'AWC': '8A',   // Atlas Global

    // === UK & IRELAND ===
    'VIR': 'VS',   // Virgin Atlantic
    'LOG': 'LS',   // Loganair
    'EXS': 'LS',   // Jet2.com
    'TOM': 'BY',   // TUI Airways
    'BMR': 'BM',   // flybmi

    // === NORTH AMERICA ===
    'AAL': 'AA',   // American Airlines
    'DAL': 'DL',   // Delta Air Lines
    'UAL': 'UA',   // United Airlines
    'SWA': 'WN',   // Southwest Airlines
    'JBU': 'B6',   // JetBlue Airways
    'ASA': 'AS',   // Alaska Airlines
    'FFT': 'F9',   // Frontier Airlines
    'NKS': 'NK',   // Spirit Airlines
    'ACA': 'AC',   // Air Canada
    'WJA': 'WS',   // WestJet
    'SKW': 'OO',   // SkyWest Airlines
    'ENY': 'MQ',   // Envoy Air
    'RPA': 'YX',   // Republic Airways
    'GOJ': 'G4',   // Allegiant Air
    'SCX': 'SY',   // Sun Country Airlines

    // === MIDDLE EAST ===
    'UAE': 'EK',   // Emirates
    'QTR': 'QR',   // Qatar Airways
    'ETD': 'EY',   // Etihad Airways
    'FDB': 'FZ',   // flydubai
    'GFA': 'GF',   // Gulf Air
    'KAC': 'KU',   // Kuwait Airways
    'RJA': 'RJ',   // Royal Jordanian
    'MEA': 'ME',   // Middle East Airlines
    'MSR': 'MS',   // EgyptAir
    'SVA': 'SV',   // Saudi Arabian Airlines
    'WIA': 'IY',   // Yemenia
    'OMA': 'WY',   // Oman Air

    // === ASIA-PACIFIC ===
    'SIA': 'SQ',   // Singapore Airlines
    'CPA': 'CX',   // Cathay Pacific
    'THA': 'TG',   // Thai Airways
    'MAS': 'MH',   // Malaysia Airlines
    'AXM': 'D7',   // AirAsia X
    'VJC': 'VJ',   // VietJet Air
    'HVN': 'VN',   // Vietnam Airlines
    'CEB': '5J',   // Cebu Pacific
    'PAL': 'PR',   // Philippine Airlines
    'GIA': 'GA',   // Garuda Indonesia
    'JAL': 'JL',   // Japan Airlines
    'ANA': 'NH',   // All Nippon Airways
    'KAL': 'KE',   // Korean Air
    'AAR': 'OZ',   // Asiana Airlines
    'CSN': 'CZ',   // China Southern Airlines
    'CES': 'MU',   // China Eastern Airlines
    'CCA': 'CA',   // Air China
    'CHH': 'HU',   // Hainan Airlines
    'CSC': '3U',   // Sichuan Airlines
    'AIJ': 'AI',   // Air India
    'IGO': '6E',   // IndiGo
    'VTI': 'IT',   // Tigerair Taiwan

    // === AUSTRALIA & OCEANIA ===
    'QFA': 'QF',   // Qantas
    'VOZ': 'VA',   // Virgin Australia
    'JST': 'JQ',   // Jetstar Airways
    'ANZ': 'NZ',   // Air New Zealand
    'FJI': 'FJ',   // Fiji Airways

    // === AFRICA ===
    'SAA': 'SA',   // South African Airways
    'ETH': 'ET',   // Ethiopian Airlines
    'KQA': 'KQ',   // Kenya Airways
    'RAM': 'AT',   // Royal Air Maroc
    'AEW': 'RW',   // RwandAir
    'DAH': 'AH',   // Air Algérie
    'TUN': 'TU',   // Tunisair
    'LBT': 'TN',   // Nouvelair

    // === SOUTH AMERICA ===
    'GLO': 'G3',   // GOL Linhas Aéreas
    'TAM': 'JJ',   // LATAM Brasil
    'AZU': 'AD',   // Azul Brazilian Airlines
    'LAN': 'LA',   // LATAM Airlines
    'ARG': 'AR',   // Aerolíneas Argentinas
    'AVA': 'AV',   // Avianca
    'CMP': 'CM',   // Copa Airlines

    // === CARGO AIRLINES ===
    'FDX': 'FX',   // FedEx Express
    'UPS': '5X',   // UPS Airlines
    'GEC': 'ER',   // DHL Aviation
    'DHK': 'D0',   // DHL Air
    'CLX': 'CL',   // Cargolux

    // === REGIONAL & OTHER ===
    'BEE': 'BE',   // Flybe
    'WOW': 'WW',   // WOW air
    'MPH': 'MP',   // Martinair
    'GTI': 'HO',   // Juneyao Airlines
    'CUA': 'CU',   // Cubana
    'CND': 'CO',   // Corendon Airlines
    'AMC': 'AN',   // Air Niugini
    'MPD': 'OM',   // MIAT Mongolian Airlines
  };

  // Handler for when a flight is selected from the map
  const handleFlightSelectFromMap = (fr24Flight) => {
    console.log('[handleFlightSelectFromMap] Selected flight from map:', fr24Flight);

    // Extract callsign from OpenSky data
    const callsign = (fr24Flight.flight || fr24Flight.callsign || '').trim();

    if (!callsign) {
      console.log('[handleFlightSelectFromMap] No callsign found');
      return;
    }

    // Try to parse airline code and flight number
    // Format: AIRLINE123 or AIRLINE1234 (e.g., NOZ645, SAS4434)
    const match = callsign.match(/^([A-Z]{2,3})(\d+)$/);

    if (match) {
      const [, airlineCode, flightNum] = match;

      // Try to convert ICAO to IATA
      const iataCode = icaoToIataMapping[airlineCode];

      if (iataCode) {
        // Use IATA code format (what most flight APIs expect)
        const formattedFlight = `${iataCode}${flightNum}`;
        console.log(`[handleFlightSelectFromMap] Converted ${callsign} → ${formattedFlight}`);
        setFlightNumber(formattedFlight);
      } else {
        // Unknown airline, try as-is
        console.log(`[handleFlightSelectFromMap] Unknown airline code ${airlineCode}, trying as-is: ${callsign}`);
        setFlightNumber(callsign);
      }
    } else {
      // Couldn't parse, use as-is
      console.log(`[handleFlightSelectFromMap] Could not parse callsign format, trying as-is: ${callsign}`);
      setFlightNumber(callsign);
    }

    // Trigger search with the selected flight
    setTimeout(() => {
      searchFlight();
    }, 100);
  };

  // Quick Search handlers
  const toggleQuickSearch = () => {
    setQuickSearchOpen(!quickSearchOpen);
    setSelectedAirline(null);
  };

  const selectAirline = (airline) => {
    setSelectedAirline(selectedAirline === airline ? null : airline);
  };

  const selectFlight = (flightNumber) => {
    setFlightDate('');
    setQuickSearchOpen(false);
    setSelectedAirline(null);
    shouldAutoSearch.current = true;
    setFlightNumber(flightNumber);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (quickSearchRef.current && !quickSearchRef.current.contains(event.target)) {
        setQuickSearchOpen(false);
        setSelectedAirline(null);
      }
    };

    if (quickSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [quickSearchOpen]);

  return (
    <div className="flight-tracker">
      <div className="container">
        <div className="flight-tracker-header">
          <h2>✈️ Flight Tracker</h2>
          <p>Track any flight in real-time</p>
        </div>

        <div className="flight-search glass glass-card" ref={quickSearchRef}>
          <div className="search-inputs">
            <div className="flight-input-wrapper">
              <input
                type="text"
                className="flight-input"
                placeholder="Flight number (e.g., SK4035)"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button
                className="quick-search-toggle"
                onClick={toggleQuickSearch}
                type="button"
                title="Quick access to popular flights"
              >
                <span className="quick-search-icon">⚡</span>
                <span className="quick-search-label">Quick Search</span>
              </button>
            </div>
            <input
              type="date"
              className="flight-input"
              value={flightDate}
              onChange={(e) => setFlightDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              lang="en-US"
            />
          </div>

          {/* Quick Search Dropdown - Positioned below search inputs */}
          {quickSearchOpen && (
            <div className="quick-search-dropdown glass">
              {QUICK_AIRLINES.map((airline) => (
                <div key={airline.code} className="quick-airline">
                  <button
                    className={`quick-airline-btn ${selectedAirline === airline.code ? 'active' : ''}`}
                    onClick={() => selectAirline(airline.code)}
                  >
                    <span>{airline.icon}</span>
                    <span>{airline.name}</span>
                    <span className="expand-arrow">{selectedAirline === airline.code ? '▲' : '▼'}</span>
                  </button>
                  {selectedAirline === airline.code && (
                    <div className="quick-flights">
                      {airline.flights.map((flight) => (
                        <button
                          key={flight}
                          className="quick-flight-btn"
                          onClick={() => selectFlight(flight)}
                        >
                          {flight}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

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

        {/* Live Flight Map */}
        <FlightMap
          onFlightSelect={handleFlightSelectFromMap}
          searchFlightNumber={flightData?.flight_iata || flightData?.flight_icao || (flightData ? flightNumber : null)}
          flightData={flightData}
        />

      {error && (
        <div className="flight-error">
          ⚠️ {error}
        </div>
      )}

      {flightData && (
        <div className="flight-results">
          <div className="flight-card glass glass-card">
            <div className="flight-card-header">
              <div>
                <h3>{flightData.callsign?.trim() || 'Unknown Flight'}</h3>
                {flightData.airline && (
                  <p className="airline-name">{flightData.airline} {flightData.airlineIata && `(${flightData.airlineIata})`}</p>
                )}
              </div>
              <div className="flight-header-actions">
                <button
                  className={`favorite-btn ${isFlightSaved(flightData.callsign) ? 'saved' : ''}`}
                  onClick={toggleSaveFlight}
                  aria-label={isFlightSaved(flightData.callsign) ? 'Remove from favorites' : 'Add to favorites'}
                  title={isFlightSaved(flightData.callsign) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {isFlightSaved(flightData.callsign) ? '⭐' : '☆'}
                </button>
                <span className={`flight-status ${getStatusColor(flightData.flightStatus)}`}>
                  {flightData.flightStatus === 'active' && '🟢 Live'}
                  {flightData.flightStatus === 'scheduled' && '🔵 Scheduled'}
                  {flightData.flightStatus === 'landed' && '⚪ Landed'}
                  {flightData.flightStatus === 'cancelled' && '🔴 Cancelled'}
                  {!flightData.flightStatus && '🟢 Live'}
                </span>
              </div>
            </div>

            {/* Flight Timeline */}
            <FlightTimeline flightData={flightData} />

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
                      {loadingAircraftInfo && !flightData.aircraftRegistration && !flightData.aircraftModel ? (
                        <span style={{ color: '#888' }}>
                          <span className="spinner-small" style={{ display: 'inline-block', width: '12px', height: '12px', marginRight: '8px' }}></span>
                          Loading aircraft details...
                        </span>
                      ) : (
                        <>
                          {flightData.aircraftRegistration || ''}
                          {flightData.aircraftRegistration && (flightData.aircraftIcao || flightData.aircraftModel) && ' • '}
                          {flightData.aircraftIcao && `Type: ${flightData.aircraftIcao}`}
                          {flightData.aircraftIcao && flightData.aircraftModel && ' • '}
                          {flightData.aircraftModel && `Model: ${flightData.aircraftModel}`}
                          {!loadingAircraftInfo && !flightData.aircraftRegistration && !flightData.aircraftIcao && !flightData.aircraftModel && 'Not available'}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flight-actions">
              <a
                href={`https://www.flightradar24.com/data/flights/${flightNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
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
                  <div className="weather-card glass glass-card">
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
                  <div className="weather-card glass glass-card">
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

          {/* Aircraft Details Section */}
          <div className="aircraft-section">
              <h4 className="aircraft-section-title">✈️ About This Aircraft</h4>

              {loadingAircraftImage && !aircraftImage && (
                <div className="aircraft-image-skeleton">
                  <div className="skeleton-box" style={{
                    width: '100%',
                    height: '280px',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '8px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                      animation: 'shimmer 1.5s infinite'
                    }}></div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    color: '#888',
                    fontSize: '14px',
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <div className="spinner-small" style={{ width: '14px', height: '14px' }}></div>
                    Loading aircraft photo...
                  </div>
                </div>
              )}

              {aircraftImage && (
                <div className="aircraft-image-container">
                  <img
                    src={aircraftImage.url}
                    alt="Aircraft"
                    className="aircraft-image"
                  />
                  <div className="aircraft-image-credit">
                    Photo by {aircraftImage.photographer} •
                    <a
                      href={aircraftImage.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aircraft-image-link"
                    >
                      View on Planespotters.net
                    </a>
                  </div>
                </div>
              )}

              {loadingAircraftInfo && !aircraftInfo && (
                <div className="aircraft-loading">
                  <div className="spinner-small"></div>
                  <span>Loading AI-generated aircraft information...</span>
                </div>
              )}

              {aircraftInfo && (
                <div className="aircraft-info-text">
                  <p>{aircraftInfo}</p>
                  <div className="aircraft-info-footer">
                    <span className="aircraft-info-badge">✨ AI-Generated Information</span>
                  </div>
                </div>
              )}

              {!loadingAircraftInfo && !aircraftInfo && !aircraftImage && (
                <div className="aircraft-no-data">
                  <p>No additional aircraft information available for this flight.</p>
                </div>
              )}
            </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default FlightTracker;
