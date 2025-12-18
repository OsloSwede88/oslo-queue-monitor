import { useState, useEffect, useRef } from 'react';
import './FlightTracker.css';
import FlightTimeline from './flight/FlightTimeline';

function FlightTracker() {
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [flightData, setFlightData] = useState(null);
  const [weatherData, setWeatherData] = useState({ departure: null, arrival: null });
  const [error, setError] = useState(null);
  const [subscribedFlights, setSubscribedFlights] = useState(() => {
    const saved = localStorage.getItem('subscribedFlights');
    return saved ? JSON.parse(saved) : [];
  });
  const [aircraftInfo, setAircraftInfo] = useState(null);
  const [aircraftImage, setAircraftImage] = useState(null);
  const [loadingAircraftInfo, setLoadingAircraftInfo] = useState(false);
  const [loadingAircraftImage, setLoadingAircraftImage] = useState(false);

  const wsRef = useRef(null);

  // WebSocket connection for flight subscriptions
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://oslo-queue-backend-production.up.railway.app';
    const wsUrl = API_URL.replace(/^http/, 'ws');

    console.log('[FlightTracker] Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[FlightTracker] WebSocket connected');

      // Re-subscribe to all saved flights
      subscribedFlights.forEach(sub => {
        console.log(`[FlightTracker] Re-subscribing to ${sub.flightNumber}`);
        ws.send(JSON.stringify({
          type: 'subscribe-flight',
          flightNumber: sub.flightNumber,
          flightData: sub.lastChecked
        }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'flight-update') {
          console.log('[FlightTracker] Flight update received:', message);
          handleFlightUpdate(message);
        } else if (message.type === 'subscription-confirmed') {
          console.log(`[FlightTracker] Subscription confirmed for ${message.flightNumber}`);
        } else if (message.type === 'unsubscription-confirmed') {
          console.log(`[FlightTracker] Unsubscription confirmed for ${message.flightNumber}`);
        }
      } catch (error) {
        console.error('[FlightTracker] Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[FlightTracker] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[FlightTracker] WebSocket disconnected');
    };

    return () => {
      console.log('[FlightTracker] Cleaning up WebSocket connection');
      ws.close();
    };
  }, []); // Only run on mount/unmount

  const handleFlightUpdate = (message) => {
    const { flightNumber, changes, flightData } = message;

    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const changesText = changes.map(c => `${c.icon} ${c.field}: ${c.old} → ${c.new}`).join('\n');

      const notification = new Notification(`Flight ${flightNumber} Updated`, {
        body: changesText,
        icon: '/flight-icon.png',
        tag: flightNumber,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else {
      // Fallback to alert if notifications not available
      const changesText = changes.map(c => `${c.icon} ${c.field}: ${c.old} → ${c.new}`).join('\n');
      alert(`✈️ Flight ${flightNumber} Updated!\n\n${changesText}`);
    }

    // Update the subscription in localStorage with new data
    const updated = subscribedFlights.map(sub =>
      sub.flightNumber === flightNumber
        ? { ...sub, lastChecked: flightData }
        : sub
    );
    setSubscribedFlights(updated);
    localStorage.setItem('subscribedFlights', JSON.stringify(updated));
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

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      // Try Planespotters.net API via backend proxy (using hex code)
      if (icao24) {
        const response = await fetch(`${API_URL}/api/aircraft-photo/${icao24}?type=hex`);
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
        const response = await fetch(`${API_URL}/api/aircraft-photo/${registration}?type=reg`);
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

  const isSubscribed = (flightNumber) => {
    return subscribedFlights.some(f => f.flightNumber === flightNumber);
  };

  const subscribeToFlight = () => {
    if (!flightData || !flightNumber) return;

    const subscription = {
      flightNumber: flightData.callsign || flightNumber,
      flightDate: flightDate || new Date().toISOString().split('T')[0],
      subscribedAt: new Date().toISOString(),
      lastChecked: flightData,
      route: `${flightData.estDepartureAirport} → ${flightData.estArrivalAirport}`,
      airline: flightData.airline
    };

    const updated = [...subscribedFlights, subscription];
    setSubscribedFlights(updated);
    localStorage.setItem('subscribedFlights', JSON.stringify(updated));

    // Send subscription to backend via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe-flight',
        flightNumber: subscription.flightNumber,
        flightData: flightData
      }));
      console.log(`[FlightTracker] Sent subscription request for ${subscription.flightNumber}`);
    }

    // Request notification permission if not granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          alert(`✅ Subscribed to ${subscription.flightNumber}!\n\nYou'll receive push notifications for:\n• Gate/Terminal changes\n• Status updates\n• Delays\n• Boarding announcements`);
        } else {
          alert(`✅ Subscribed to ${subscription.flightNumber}!\n\nNote: Enable browser notifications to receive real-time alerts.`);
        }
      });
    } else {
      alert(`✅ Subscribed to ${subscription.flightNumber}!\n\nYou'll receive push notifications for:\n• Gate/Terminal changes\n• Status updates\n• Delays\n• Boarding announcements`);
    }
  };

  const unsubscribeFromFlight = (flightNumber) => {
    const updated = subscribedFlights.filter(f => f.flightNumber !== flightNumber);
    setSubscribedFlights(updated);
    localStorage.setItem('subscribedFlights', JSON.stringify(updated));

    // Send unsubscription to backend via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe-flight',
        flightNumber: flightNumber
      }));
      console.log(`[FlightTracker] Sent unsubscription request for ${flightNumber}`);
    }
  };

  return (
    <div className="flight-tracker">
      <div className="container">
        <div className="flight-tracker-header">
          <h2>✈️ Flight Tracker</h2>
          <p>Track any flight in real-time</p>
        </div>

        <div className="flight-search glass glass-card">
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

      {subscribedFlights.length > 0 && (
        <div className="subscriptions-card glass glass-card">
          <h3>📬 Your Flight Subscriptions</h3>
          <p className="subscriptions-desc">You'll receive push notifications when these flights change</p>
          <div className="subscriptions-list">
            {subscribedFlights.map((sub, index) => (
              <div key={index} className="subscription-item">
                <div className="subscription-info">
                  <div className="subscription-flight">
                    <span className="subscription-number">{sub.flightNumber}</span>
                    {sub.airline && <span className="subscription-airline">{sub.airline}</span>}
                  </div>
                  <div className="subscription-route">{sub.route}</div>
                  <div className="subscription-date">
                    Subscribed: {new Date(sub.subscribedAt).toLocaleDateString('no-NO')}
                  </div>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => unsubscribeFromFlight(sub.flightNumber)}
                  title="Unsubscribe"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
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
              <span className={`flight-status ${getStatusColor(flightData.flightStatus)}`}>
                {flightData.flightStatus === 'active' && '🟢 Live'}
                {flightData.flightStatus === 'scheduled' && '🔵 Scheduled'}
                {flightData.flightStatus === 'landed' && '⚪ Landed'}
                {flightData.flightStatus === 'cancelled' && '🔴 Cancelled'}
                {!flightData.flightStatus && '🟢 Live'}
              </span>
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
              {!isSubscribed(flightData.callsign || flightNumber) ? (
                <button
                  className="btn btn-primary"
                  onClick={subscribeToFlight}
                >
                  🔔 Subscribe to Updates
                </button>
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() => unsubscribeFromFlight(flightData.callsign || flightNumber)}
                >
                  ✅ Subscribed • Unsubscribe
                </button>
              )}
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

      {!flightData && !error && !loading && (
        <div className="flight-empty-state glass glass-card">
          <div className="empty-icon">✈️</div>
          <h3>Track Your Flight</h3>
          <p>Enter a flight number to see real-time tracking information</p>
          <div className="empty-examples">
            <strong>Examples:</strong> SK4035, DY1234, BA123
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default FlightTracker;
