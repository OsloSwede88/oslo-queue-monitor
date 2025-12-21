import { useState, useEffect, useRef } from 'react';
import './FlightTracker.css';
import FlightTimeline from './flight/FlightTimeline';
import FlightMap from './flight/FlightMap';
import {
  SEARCH_HISTORY,
  TIMING,
  API_DEFAULTS,
  STORAGE_KEYS,
  AI_CONFIG,
  DATE_FORMATS
} from '../constants/config';
import { QUICK_AIRLINES } from '../data/quickAirlines';
import { icaoToIataMapping } from '../data/airlineCodeMappings';
import { getApiBaseUrl } from '../utils/apiConfig';

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
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_FLIGHTS) || '[]');
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
      localStorage.setItem(STORAGE_KEYS.SAVED_FLIGHTS, JSON.stringify(newSaved));
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
      localStorage.setItem(STORAGE_KEYS.SAVED_FLIGHTS, JSON.stringify(newSaved));
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
    const existingHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY) || '[]');

    // Remove duplicates (same flight number searched recently)
    const filteredHistory = existingHistory.filter(
      item => item.flightNumber !== historyItem.flightNumber
    );

    // Add new search to beginning, keep max items
    const newHistory = [historyItem, ...filteredHistory].slice(0, SEARCH_HISTORY.MAX_ITEMS);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(newHistory));

    // Notify parent component if callback provided
    if (onSearchHistoryUpdate) {
      onSearchHistoryUpdate(newHistory);
    }
  };

  const fetchWeatherData = async (icaoCode) => {
    if (!icaoCode) {
      return null;
    }

    const apiKey = import.meta.env.VITE_CHECKWX_API_KEY;
    if (!apiKey || apiKey === API_DEFAULTS.PLACEHOLDER_CHECKWX) {
      return null;
    }

    try {
      const url = `https://api.checkwx.com/metar/${icaoCode}/decoded`;
      // Use CheckWX API for METAR data (free, 3000 requests/day)
      const response = await fetch(url, {
        headers: {
          'X-API-Key': apiKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.[0] || null;
      }
    } catch (err) {
      // Error fetching weather data
    }
    return null;
  };

  const fetchAircraftImage = async (registration, icao24, airline, aircraftType) => {
    if (!registration && !icao24 && !aircraftType) return null;

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

            return { registration: reg, aircraftType: aircraftModel };
          }
        }
      } catch (err) {
        // Error parsing URL
      }
      return { registration: null, aircraftType: null };
    };

    try {
      const apiBaseUrl = getApiBaseUrl();

      // Call Planespotters API via backend proxy
      if (icao24) {
        const response = await fetch(`${apiBaseUrl}/api/aircraft-photo/${icao24}?type=hex`);
        if (response.ok) {
          const data = await response.json();
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
        const response = await fetch(`${apiBaseUrl}/api/aircraft-photo/${registration}?type=reg`);
        if (response.ok) {
          const data = await response.json();
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
      console.error('[Planespotters] Error fetching aircraft image:', err);
    }

    // Fallback 3: Search by aircraft type using Wikimedia Commons
    // When registration is unavailable, search for generic aircraft type photos
    if (aircraftType && !registration && !icao24) {
      try{
        // Clean aircraft type for search (e.g., "E295" -> "Embraer E295")
        const aircraftManufacturers = {
          'A': 'Airbus',
          'B': 'Boeing',
          'E': 'Embraer',
          'CRJ': 'Bombardier',
          'ATR': 'ATR',
          'MD': 'McDonnell Douglas',
          'DC': 'Douglas'
        };

        let searchQuery = aircraftType;

        // Add manufacturer prefix if needed
        const firstChar = aircraftType.charAt(0).toUpperCase();
        if (aircraftManufacturers[firstChar] && aircraftType.length <= 4) {
          searchQuery = `${aircraftManufacturers[firstChar]} ${aircraftType}`;
        }

        // Don't add airline to search - it's too specific and returns no results
        // Just search for the aircraft type (e.g., "Embraer E295")

        // Search Wikimedia Commons for aircraft photos
        const wikimediaSearchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery + ' aircraft')}&srnamespace=6&format=json&origin=*&srlimit=5`;

        const searchResponse = await fetch(wikimediaSearchUrl);
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();

          if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
            // Try to find a good photo from results
            for (const result of searchData.query.search) {
              const filename = result.title.replace('File:', '');

              // Skip if not a photo format
              if (!filename.match(/\.(jpg|jpeg|png)$/i)) continue;

              // Get image URL
              const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url|user&iiurlwidth=800&format=json&origin=*`;

              const imageResponse = await fetch(imageInfoUrl);
              if (imageResponse.ok) {
                const imageData = await imageResponse.json();
                const pages = imageData.query.pages;
                const pageId = Object.keys(pages)[0];

                if (pages[pageId].imageinfo && pages[pageId].imageinfo[0]) {
                  const imageInfo = pages[pageId].imageinfo[0];

                  return {
                    url: imageInfo.thumburl || imageInfo.url,
                    photographer: imageInfo.user || 'Wikimedia Commons',
                    link: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,
                    registration: null,
                    aircraftType: aircraftType,
                    aircraftIcao: null,
                    isGenericPhoto: true // Flag to indicate this is not the actual aircraft
                  };
                }
              }
            }
          }
        }
      } catch (err) {
        // Wikimedia fallback failed silently
      }
    }

    return null;
  };

  const generateAircraftInfo = async (aircraftModel, registration, airline) => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey || apiKey === API_DEFAULTS.PLACEHOLDER_OPENROUTER) {
      return null;
    }

    try {
      // Build a directive prompt that prevents generic "which aircraft?" responses
      let prompt;
      if (aircraftModel && registration) {
        // Specific aircraft with registration
        prompt = `Write a concise ${AI_CONFIG.PROMPT_WORD_TARGET}-word profile about the ${aircraftModel} aircraft with registration ${registration}${airline ? ` operated by ${airline}` : ''}. Include: manufacturer/model, specs (capacity, range, speed), first flight date, and 1-2 interesting facts. Be factual and specific. Do not ask questions.`;
      } else if (aircraftModel) {
        // Model known but no registration
        prompt = `Write a concise ${AI_CONFIG.PROMPT_WORD_TARGET}-word profile about the ${aircraftModel} aircraft${airline ? ` as operated by ${airline}` : ''}. Include: manufacturer/model, specs (capacity, range, speed), when it entered service, and 1-2 interesting facts. Be factual and specific. Do not ask questions.`;
      } else if (airline) {
        // Only airline known - describe their typical fleet
        prompt = `Write a concise ${AI_CONFIG.PROMPT_WORD_TARGET}-word overview of ${airline}'s typical aircraft fleet. Mention their most common aircraft types, fleet size if known, and 1-2 interesting facts about their operations. Be factual and specific. Do not ask questions.`;
      } else {
        // Fallback - should rarely happen
        return null;
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Oslo Airport Queue Monitor'
        },
        body: JSON.stringify({
          model: AI_CONFIG.MODEL,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        return content;
      } else if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        return null;
      } else {
        const errorText = await response.text();
        return null;
      }
    } catch (err) {
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
      'STN': 'EGSS', // London Stansted
      'CDG': 'LFPG', // Paris Charles de Gaulle
      'GNB': 'LFLS', // Grenoble Alpes-Isere
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
      if (!apiKey || apiKey === API_DEFAULTS.PLACEHOLDER_AIRLABS) {
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

      // Check if response exists and has flight data (response is an object, not array)
      if (data.response && data.response.flight_iata) {
        const flight = data.response;

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
          icao24: flight.reg_number || flight.hex || null,
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

        // If AirLabs doesn't have aircraft data, try multiple fallbacks in order
        if (!flightInfo.aircraftRegistration && !flightInfo.aircraftModel) {
          // Fallback 1: FlightAware AeroAPI (10,000 requests/month free) via backend proxy
          const flightAwareKey = import.meta.env.VITE_FLIGHTAWARE_API_KEY;
          if (flightAwareKey && flightAwareKey !== API_DEFAULTS.PLACEHOLDER_FLIGHTAWARE) {
            try {
              const apiBaseUrl = getApiBaseUrl();
              const faResponse = await fetch(`${apiBaseUrl}/api/flightaware/${flightNumber.toUpperCase()}`);

              if (faResponse.ok) {
                const faData = await faResponse.json();
                if (faData.flights && faData.flights.length > 0) {
                  // Find the first flight with registration data (some flights may have null registration)
                  const faFlight = faData.flights.find(f => f.registration) || faData.flights[0];
                  if (faFlight.registration) {
                    flightInfo.aircraftRegistration = faFlight.registration;
                  }
                  if (faFlight.aircraft_type) {
                    flightInfo.aircraftModel = faFlight.aircraft_type;
                    flightInfo.aircraftIcao = faFlight.aircraft_type;
                  }
                }
              }
            } catch (err) {
              // FlightAware fallback failed, continue to next
            }
          }

          // Fallback 2: OpenSky Network (free, unlimited but basic data) via backend proxy
          if (!flightInfo.aircraftRegistration) {
            const openSkyClientId = import.meta.env.VITE_OPENSKY_CLIENT_ID;
            const openSkySecret = import.meta.env.VITE_OPENSKY_CLIENT_SECRET;

            if (openSkyClientId && openSkySecret) {
              try {
                // OpenSky uses callsign, need to convert flight number to callsign
                // Try searching by flight number pattern (e.g., SK4035 → SAS4035)
                const begin = Math.floor(Date.now() / 1000) - 86400;
                const end = Math.floor(Date.now() / 1000);
                const apiBaseUrl = getApiBaseUrl();
                const osResponse = await fetch(`${apiBaseUrl}/api/opensky/flights?begin=${begin}&end=${end}`);

                if (osResponse.ok) {
                  const osData = await osResponse.json();
                  // Find matching flight by callsign
                  const matchingFlight = osData.find(f =>
                    f.callsign && f.callsign.trim().toUpperCase() === flightNumber.toUpperCase()
                  );

                  if (matchingFlight && matchingFlight.icao24) {
                    flightInfo.icao24 = matchingFlight.icao24;
                  }
                }
              } catch (err) {
                // OpenSky fallback failed, continue to next
              }
            }
          }

          // Fallback 3: AviationStack (as final fallback)
          if (!flightInfo.aircraftRegistration && !flightInfo.aircraftModel) {
            const aviationStackKey = import.meta.env.VITE_AVIATIONSTACK_API_KEY;

            if (aviationStackKey && aviationStackKey !== API_DEFAULTS.PLACEHOLDER_AVIATIONSTACK) {
              try {
                const asResponse = await fetch(
                  `https://api.aviationstack.com/v1/flights?access_key=${aviationStackKey}&flight_iata=${flightNumber.toUpperCase()}`
                );

                if (asResponse.ok) {
                  const asData = await asResponse.json();

                  if (asData.data && asData.data.length > 0) {
                    const asFlight = asData.data[0];

                    // Update flightInfo with AviationStack aircraft data
                    if (asFlight.aircraft) {
                      if (asFlight.aircraft.icao24) {
                        flightInfo.icao24 = asFlight.aircraft.icao24;
                      }
                      if (asFlight.aircraft.registration) {
                        flightInfo.aircraftRegistration = asFlight.aircraft.registration;
                      }
                      if (asFlight.aircraft.iata) {
                        flightInfo.aircraftIcao = asFlight.aircraft.iata;
                        flightInfo.aircraftModel = asFlight.aircraft.iata;
                      }
                      if (asFlight.aircraft.icao) {
                        flightInfo.aircraftIcao = asFlight.aircraft.icao;
                      }
                    }
                  }
                }
              } catch (err) {
                // All fallbacks exhausted
              }
            }
          }
        }

        setFlightData(flightInfo);

        // Save to search history
        saveToSearchHistory(flightInfo);

        // Fetch weather data (convert IATA to ICAO codes)
        const depIcao = iataToIcao(flightInfo.estDepartureAirport);
        const arrIcao = iataToIcao(flightInfo.estArrivalAirport);
        const [departureWeather, arrivalWeather] = await Promise.all([
          fetchWeatherData(depIcao),
          fetchWeatherData(arrIcao)
        ]);

        setWeatherData({
          departure: departureWeather,
          arrival: arrivalWeather
        });

        // Fetch aircraft details in background
        setLoadingAircraftInfo(true);
        setLoadingAircraftImage(true);

        // Fetch Planespotters first to get accurate aircraft model
        fetchAircraftImage(
          flightInfo.aircraftRegistration,
          flightInfo.icao24,
          flightInfo.airline,
          flightInfo.aircraftModel || flightInfo.aircraftIcao
        )
          .then(image => {
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
              }

              // Now generate AI info with the actual aircraft model from Planespotters
              const aircraftModel = image.aircraftType || flightInfo.aircraftModel;
              const registration = image.registration || flightInfo.aircraftRegistration;

              return generateAircraftInfo(aircraftModel, registration, flightInfo.airline);
            } else {
              // No image found, still try AI with whatever data we have
              return generateAircraftInfo(flightInfo.aircraftModel, flightInfo.aircraftRegistration, flightInfo.airline);
            }
          })
          .then(info => {
            setAircraftInfo(info);
            setLoadingAircraftInfo(false);
          })
          .catch(err => {
            setLoadingAircraftInfo(false);
            setLoadingAircraftImage(false);
          });
      } else {
        // Flight not found - but show helpful info about the airline
        const airlineCode = flightNumber.match(/^[A-Z]{2}/)?.[0];
        const airline = QUICK_AIRLINES.find(a => a.code === airlineCode);

        if (airline) {
          // Show airline info even if flight not found
          setError(`No active flight found for ${flightNumber}. This could mean:
• The flight is not currently active or scheduled for today
• The flight has already landed
• The flight number may be incorrect

Showing information about ${airline.name} instead:`);

          // Generate AI info about the airline
          setLoadingAircraftInfo(true);
          generateAircraftInfo(null, null, airline.name)
            .then(info => {
              setAircraftInfo(info);
              setLoadingAircraftInfo(false);
            })
            .catch(() => setLoadingAircraftInfo(false));
        } else {
          setError(`No flight found for ${flightNumber}. Try flight numbers like LH400, BA117, SK4035, DY1302.`);
        }
      }
    } catch (err) {
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
    return new Date(timestamp * 1000).toLocaleString(DATE_FORMATS.LOCALE);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString(DATE_FORMATS.LOCALE, DATE_FORMATS.DATETIME_OPTIONS);
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

  // Handler for when a flight is selected from the map
  const handleFlightSelectFromMap = (fr24Flight) => {
    // Extract callsign from OpenSky data
    const callsign = (fr24Flight.flight || fr24Flight.callsign || '').trim();

    if (!callsign) {
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
        setFlightNumber(formattedFlight);
      } else {
        // Unknown airline, try as-is
        setFlightNumber(callsign);
      }
    } else {
      // Couldn't parse, use as-is
      setFlightNumber(callsign);
    }

    // Trigger search with the selected flight
    setTimeout(() => {
      searchFlight();
    }, TIMING.AUTO_SEARCH_DELAY);
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
                    <img src={airline.logo} alt={airline.name} className="airline-logo" />
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

      {/* Show airline info when flight not found but we have airline data */}
      {!flightData && (aircraftInfo || loadingAircraftInfo) && (
        <div className="flight-results">
          <div className="aircraft-section">
            <h4 className="aircraft-section-title">✈️ Airline Information</h4>

            {loadingAircraftInfo && !aircraftInfo && (
              <div className="aircraft-info-loading">
                <div className="spinner"></div>
                <p>Generating airline information...</p>
              </div>
            )}

            {aircraftInfo && (
              <div className="aircraft-info">
                <div className="aircraft-info-content">
                  {aircraftInfo}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {flightData && (
        <div className="flight-results">
          <div className="flight-card glass glass-card">
            <div className="flight-card-header">
              <div>
                <h3>
                  {flightData.callsign?.trim() || 'Unknown Flight'}
                  <span className="flight-route-inline">
                    {' • '}{flightData.estDepartureAirport || 'N/A'} → {flightData.estArrivalAirport || 'N/A'}
                  </span>
                </h3>
                {flightData.airline && (
                  <p className="airline-name">
                    {flightData.airline} {flightData.airlineIata && `(${flightData.airlineIata})`}
                    {flightData.scheduledDeparture && flightData.scheduledArrival && (() => {
                      const depTime = new Date(flightData.scheduledDeparture);
                      const arrTime = new Date(flightData.scheduledArrival);
                      const duration = Math.round((arrTime - depTime) / (1000 * 60));
                      const hours = Math.floor(duration / 60);
                      const mins = duration % 60;
                      return ` • ${hours}h ${mins}m`;
                    })()}
                  </p>
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
                    {flightData.actualDeparture && (
                      <span className="detail-subtext">
                        Actual: {formatTime(flightData.actualDeparture)}
                      </span>
                    )}
                    {!flightData.actualDeparture && flightData.estimatedDeparture && (
                      <span className="detail-subtext">
                        Estimated: {formatTime(flightData.estimatedDeparture)}
                      </span>
                    )}
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
                    {flightData.actualArrival && (
                      <span className="detail-subtext">
                        Actual: {formatTime(flightData.actualArrival)}
                      </span>
                    )}
                    {!flightData.actualArrival && flightData.estimatedArrival && (
                      <span className="detail-subtext">
                        Estimated: {formatTime(flightData.estimatedArrival)}
                      </span>
                    )}
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
                      {loadingAircraftInfo && !flightData.aircraftRegistration && !flightData.aircraftModel && !aircraftImage ? (
                        <span style={{ color: '#888' }}>
                          <span className="spinner-small" style={{ display: 'inline-block', width: '12px', height: '12px', marginRight: '8px' }}></span>
                          Loading aircraft details...
                        </span>
                      ) : (
                        <>
                          {(flightData.aircraftRegistration || aircraftImage?.registration) || ''}
                          {(flightData.aircraftRegistration || aircraftImage?.registration) && (flightData.aircraftIcao || aircraftImage?.aircraftIcao || flightData.aircraftModel || aircraftImage?.aircraftType) && ' • '}
                          {(flightData.aircraftIcao || aircraftImage?.aircraftIcao) && `Type: ${flightData.aircraftIcao || aircraftImage?.aircraftIcao}`}
                          {(flightData.aircraftIcao || aircraftImage?.aircraftIcao) && (flightData.aircraftModel || aircraftImage?.aircraftType) && ' • '}
                          {(flightData.aircraftModel || aircraftImage?.aircraftType) && `Model: ${flightData.aircraftModel || aircraftImage?.aircraftType}`}
                          {!loadingAircraftInfo && !flightData.aircraftRegistration && !aircraftImage?.registration && !flightData.aircraftIcao && !aircraftImage?.aircraftIcao && !flightData.aircraftModel && !aircraftImage?.aircraftType && 'Not available'}
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
                    alt={`${aircraftImage.registration || flightData?.aircraftRegistration || 'Aircraft'} - ${aircraftImage.aircraftType || flightData?.aircraftModel || 'Flight'} operated by ${flightData?.airline || 'airline'}`}
                    className="aircraft-image"
                  />
                  {aircraftImage.isGenericPhoto && (
                    <div className="aircraft-info-footer" style={{ marginTop: '8px', marginBottom: '4px' }}>
                      <span className="aircraft-info-badge" style={{ backgroundColor: '#f59e0b' }}>
                        ℹ️ Generic {aircraftImage.aircraftType} photo - registration data unavailable
                      </span>
                    </div>
                  )}
                  <div className="aircraft-image-credit">
                    Photo by {aircraftImage.photographer} •
                    <a
                      href={aircraftImage.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aircraft-image-link"
                    >
                      {aircraftImage.isGenericPhoto ? 'View on Wikimedia Commons' : 'View on Planespotters.net'}
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
