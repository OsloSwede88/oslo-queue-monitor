import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './FlightMap.css';

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

// Airport coordinates lookup for common airports
const AIRPORT_COORDS = {
  // Norwegian airports
  'OSL': { lat: 60.1939, lon: 11.1004, name: 'Oslo Gardermoen' },
  'BGO': { lat: 60.2934, lon: 5.2181, name: 'Bergen Flesland' },
  'TRD': { lat: 63.4578, lon: 10.9239, name: 'Trondheim Værnes' },
  'SVG': { lat: 58.8767, lon: 5.6378, name: 'Stavanger Sola' },
  'AES': { lat: 62.5603, lon: 6.1197, name: 'Ålesund' },
  'BOO': { lat: 67.2692, lon: 14.3653, name: 'Bodø' },
  'TOS': { lat: 69.6833, lon: 18.9189, name: 'Tromsø' },
  'EVE': { lat: 68.4913, lon: 16.6781, name: 'Harstad/Narvik' },
  'HAU': { lat: 59.3453, lon: 5.2083, name: 'Haugesund' },
  'KRS': { lat: 58.2042, lon: 8.0854, name: 'Kristiansand' },
  'MOL': { lat: 62.7447, lon: 7.2625, name: 'Molde' },
  'TRF': { lat: 59.1867, lon: 10.2586, name: 'Sandefjord Torp' },
  'RYG': { lat: 59.3789, lon: 10.7856, name: 'Moss Rygge' },
  'ALF': { lat: 69.9761, lon: 23.3717, name: 'Alta' },
  'KKN': { lat: 69.7258, lon: 29.8914, name: 'Kirkenes' },
  'LKL': { lat: 68.1525, lon: 13.6094, name: 'Leknes' },
  'BNN': { lat: 65.4608, lon: 12.2169, name: 'Brønnøysund' },
  'SSJ': { lat: 65.9564, lon: 12.4689, name: 'Sandnessjøen' },
  'MJF': { lat: 65.7839, lon: 13.2153, name: 'Mosjøen' },
  'FDE': { lat: 61.5833, lon: 5.7672, name: 'Førde' },
  'FRO': { lat: 61.5856, lon: 5.0247, name: 'Florø' },
  'SKN': { lat: 69.7883, lon: 20.9597, name: 'Skagen' },
  'VDS': { lat: 68.3506, lon: 17.8228, name: 'Evenes' },
  'LYR': { lat: 78.2461, lon: 15.4656, name: 'Svalbard Longyear' },

  // Nordic airports
  'CPH': { lat: 55.6181, lon: 12.6561, name: 'Copenhagen' },
  'ARN': { lat: 59.6519, lon: 17.9186, name: 'Stockholm Arlanda' },
  'GOT': { lat: 57.6628, lon: 12.2798, name: 'Gothenburg Landvetter' },
  'MMX': { lat: 55.5361, lon: 13.3761, name: 'Malmö' },
  'BMA': { lat: 59.3544, lon: 17.9414, name: 'Stockholm Bromma' },
  'NYO': { lat: 58.7886, lon: 16.9122, name: 'Stockholm Skavsta' },
  'VST': { lat: 59.5894, lon: 16.6336, name: 'Stockholm Västerås' },
  'LLA': { lat: 65.5439, lon: 22.1220, name: 'Luleå' },
  'UME': { lat: 63.7918, lon: 20.2828, name: 'Umeå' },
  'KRN': { lat: 67.8222, lon: 20.3367, name: 'Kiruna' },
  'ORB': { lat: 63.4086, lon: 18.9900, name: 'Örebro' },
  'VBY': { lat: 57.6625, lon: 18.3461, name: 'Visby' },
  'LPI': { lat: 58.4062, lon: 15.6806, name: 'Linköping' },
  'RNB': { lat: 56.2667, lon: 15.2650, name: 'Ronneby' },
  'HEL': { lat: 60.3172, lon: 24.9633, name: 'Helsinki-Vantaa' },
  'TMP': { lat: 61.4142, lon: 23.6044, name: 'Tampere' },
  'OUL': { lat: 64.9301, lon: 25.3546, name: 'Oulu' },
  'AAL': { lat: 57.0928, lon: 9.8494, name: 'Aalborg' },
  'BLL': { lat: 55.7403, lon: 9.1517, name: 'Billund' },
  'AAR': { lat: 56.3000, lon: 10.6190, name: 'Aarhus' },
  'RKV': { lat: 64.1300, lon: -21.9406, name: 'Reykjavik' },
  'KEF': { lat: 63.9850, lon: -22.6056, name: 'Keflavik' },
  'AEY': { lat: 65.6600, lon: -23.1353, name: 'Akureyri' },

  // Major European airports
  'LHR': { lat: 51.4700, lon: -0.4543, name: 'London Heathrow' },
  'LGW': { lat: 51.1481, lon: -0.1903, name: 'London Gatwick' },
  'CDG': { lat: 49.0097, lon: 2.5479, name: 'Paris CDG' },
  'AMS': { lat: 52.3105, lon: 4.7683, name: 'Amsterdam Schiphol' },
  'FRA': { lat: 50.0379, lon: 8.5622, name: 'Frankfurt' },
  'MUC': { lat: 48.3537, lon: 11.7750, name: 'Munich' },
  'MAD': { lat: 40.4983, lon: -3.5676, name: 'Madrid' },
  'BCN': { lat: 41.2971, lon: 2.0785, name: 'Barcelona' },
  'FCO': { lat: 41.8003, lon: 12.2389, name: 'Rome Fiumicino' },
  'VIE': { lat: 48.1103, lon: 16.5697, name: 'Vienna' },
  'ZRH': { lat: 47.4647, lon: 8.5492, name: 'Zurich' },
  'BRU': { lat: 50.9014, lon: 4.4844, name: 'Brussels' },
  'DUB': { lat: 53.4213, lon: -6.2701, name: 'Dublin' },
  'LIS': { lat: 38.7813, lon: -9.1361, name: 'Lisbon' },
  'ATH': { lat: 37.9364, lon: 23.9445, name: 'Athens' },
  'PRG': { lat: 50.1008, lon: 14.2600, name: 'Prague' },
  'WAW': { lat: 52.1657, lon: 20.9671, name: 'Warsaw' },
  'BUD': { lat: 47.4399, lon: 19.2556, name: 'Budapest' },

  // Popular destinations
  'AGP': { lat: 36.6749, lon: -4.4991, name: 'Malaga' },
  'ALC': { lat: 38.2822, lon: -0.5581, name: 'Alicante' },
  'PMI': { lat: 39.5517, lon: 2.7388, name: 'Palma de Mallorca' },
  'TFS': { lat: 28.0445, lon: -16.5725, name: 'Tenerife South' },
  'LPA': { lat: 27.9319, lon: -15.3866, name: 'Gran Canaria' },
  'FAO': { lat: 37.0144, lon: -7.9659, name: 'Faro' },
  'NCE': { lat: 43.6584, lon: 7.2159, name: 'Nice' },
  'VCE': { lat: 45.5053, lon: 12.3519, name: 'Venice' },
  'MXP': { lat: 45.6306, lon: 8.7281, name: 'Milan Malpensa' },

  // Additional European airports
  'TIA': { lat: 41.4147, lon: 19.7206, name: 'Tirana Mother Teresa' },
  'SOF': { lat: 42.6952, lon: 23.4114, name: 'Sofia' },
  'OTP': { lat: 44.5711, lon: 26.0850, name: 'Bucharest Henri Coandă' },
  'SKG': { lat: 40.5197, lon: 22.9709, name: 'Thessaloniki' },
  'DBV': { lat: 42.5614, lon: 18.2682, name: 'Dubrovnik' },
  'SPU': { lat: 43.5389, lon: 16.2979, name: 'Split' },
  'ZAG': { lat: 45.7429, lon: 16.0688, name: 'Zagreb' },
  'BEG': { lat: 44.8184, lon: 20.3091, name: 'Belgrade' },
  'SKP': { lat: 41.9616, lon: 21.6214, name: 'Skopje' },
  'TGD': { lat: 42.3594, lon: 19.2519, name: 'Podgorica' },
  'SJJ': { lat: 43.8246, lon: 18.3315, name: 'Sarajevo' },
  'LJU': { lat: 46.2237, lon: 14.4576, name: 'Ljubljana' },
  'RIX': { lat: 56.9236, lon: 23.9711, name: 'Riga' },
  'TLL': { lat: 59.4133, lon: 24.8328, name: 'Tallinn' },
  'VNO': { lat: 54.6341, lon: 25.2858, name: 'Vilnius' },
  'GDN': { lat: 54.3776, lon: 18.4662, name: 'Gdańsk' },
  'KRK': { lat: 50.0777, lon: 19.7848, name: 'Kraków' },
  'WRO': { lat: 51.1027, lon: 16.8858, name: 'Wrocław' },
  'KTW': { lat: 50.4743, lon: 19.0800, name: 'Katowice' },
  'BTS': { lat: 48.1702, lon: 17.2127, name: 'Bratislava' },
  'CLJ': { lat: 46.7852, lon: 23.6862, name: 'Cluj-Napoca' },
  'IAS': { lat: 47.1785, lon: 27.6206, name: 'Iași' },
  'TSR': { lat: 45.8099, lon: 21.3379, name: 'Timișoara' },

  // UK & Ireland
  'LTN': { lat: 51.8747, lon: -0.3683, name: 'London Luton' },
  'STN': { lat: 51.8850, lon: 0.2350, name: 'London Stansted' },
  'LCY': { lat: 51.5053, lon: 0.0553, name: 'London City' },
  'BHX': { lat: 52.4539, lon: -1.7481, name: 'Birmingham' },
  'MAN': { lat: 53.3537, lon: -2.2750, name: 'Manchester' },
  'EDI': { lat: 55.9500, lon: -3.3725, name: 'Edinburgh' },
  'GLA': { lat: 55.8719, lon: -4.4331, name: 'Glasgow' },
  'BRS': { lat: 51.3827, lon: -2.7191, name: 'Bristol' },
  'NCL': { lat: 55.0375, lon: -1.6917, name: 'Newcastle' },
  'LBA': { lat: 53.8659, lon: -1.6606, name: 'Leeds Bradford' },
  'BFS': { lat: 54.6575, lon: -6.2158, name: 'Belfast' },
  'ORK': { lat: 51.8413, lon: -8.4911, name: 'Cork' },
  'SNN': { lat: 52.7020, lon: -8.9248, name: 'Shannon' },

  // Spain & Portugal
  'SVQ': { lat: 37.4180, lon: -5.8931, name: 'Seville' },
  'VLC': { lat: 39.4893, lon: -0.4817, name: 'Valencia' },
  'IBZ': { lat: 38.8729, lon: 1.3731, name: 'Ibiza' },
  'BIO': { lat: 43.3011, lon: -2.9106, name: 'Bilbao' },
  'SCQ': { lat: 42.8963, lon: -8.4151, name: 'Santiago de Compostela' },
  'OPO': { lat: 41.2481, lon: -8.6814, name: 'Porto' },
  'PDL': { lat: 37.7412, lon: -25.6979, name: 'Ponta Delgada Azores' },
  'FNC': { lat: 32.6979, lon: -16.7745, name: 'Funchal Madeira' },

  // Germany & Austria
  'TXL': { lat: 52.5597, lon: 13.2877, name: 'Berlin Tegel' },
  'BER': { lat: 52.3667, lon: 13.5033, name: 'Berlin Brandenburg' },
  'HAM': { lat: 53.6304, lon: 9.9882, name: 'Hamburg' },
  'DUS': { lat: 51.2895, lon: 6.7668, name: 'Düsseldorf' },
  'CGN': { lat: 50.8659, lon: 7.1427, name: 'Cologne Bonn' },
  'STR': { lat: 48.6899, lon: 9.2220, name: 'Stuttgart' },
  'NUE': { lat: 49.4987, lon: 11.0669, name: 'Nuremberg' },
  'HAJ': { lat: 52.4611, lon: 9.6851, name: 'Hannover' },
  'LEJ': { lat: 51.4324, lon: 12.2416, name: 'Leipzig' },
  'DRS': { lat: 51.1328, lon: 13.7672, name: 'Dresden' },
  'SZG': { lat: 47.7933, lon: 13.0043, name: 'Salzburg' },
  'INN': { lat: 47.2602, lon: 11.3440, name: 'Innsbruck' },
  'GRZ': { lat: 46.9911, lon: 15.4396, name: 'Graz' },
  'LNZ': { lat: 48.2332, lon: 14.1875, name: 'Linz' },

  // Switzerland & Benelux
  'GVA': { lat: 46.2381, lon: 6.1090, name: 'Geneva' },
  'BSL': { lat: 47.5900, lon: 7.5292, name: 'Basel' },
  'BRN': { lat: 46.9141, lon: 7.4975, name: 'Bern' },
  'LUX': { lat: 49.6233, lon: 6.2044, name: 'Luxembourg' },
  'EIN': { lat: 51.4500, lon: 5.3747, name: 'Eindhoven' },
  'RTM': { lat: 51.9569, lon: 4.4375, name: 'Rotterdam' },
  'MST': { lat: 50.9117, lon: 5.7703, name: 'Maastricht' },
  'CRL': { lat: 50.4592, lon: 4.4538, name: 'Brussels Charleroi' },
  'LGG': { lat: 50.6374, lon: 5.4432, name: 'Liège' },
  'ANR': { lat: 51.1894, lon: 4.4603, name: 'Antwerp' },

  // France
  'ORY': { lat: 48.7233, lon: 2.3794, name: 'Paris Orly' },
  'LYS': { lat: 45.7256, lon: 5.0811, name: 'Lyon' },
  'MRS': { lat: 43.4393, lon: 5.2214, name: 'Marseille' },
  'TLS': { lat: 43.6294, lon: 1.3638, name: 'Toulouse' },
  'NTE': { lat: 47.1532, lon: -1.6107, name: 'Nantes' },
  'BOD': { lat: 44.8283, lon: -0.7156, name: 'Bordeaux' },
  'LIL': { lat: 50.5636, lon: 3.0894, name: 'Lille' },
  'MPL': { lat: 43.5762, lon: 3.9630, name: 'Montpellier' },
  'BIA': { lat: 46.5344, lon: 3.1636, name: 'Bastia Corsica' },

  // Italy
  'LIN': { lat: 45.4454, lon: 9.2765, name: 'Milan Linate' },
  'BGY': { lat: 45.6739, lon: 9.7042, name: 'Milan Bergamo' },
  'CIA': { lat: 41.7994, lon: 12.5949, name: 'Rome Ciampino' },
  'NAP': { lat: 40.8860, lon: 14.2908, name: 'Naples' },
  'CTA': { lat: 37.4668, lon: 15.0664, name: 'Catania' },
  'PMO': { lat: 38.1759, lon: 13.0910, name: 'Palermo' },
  'BLQ': { lat: 44.5354, lon: 11.2887, name: 'Bologna' },
  'TRN': { lat: 45.2008, lon: 7.6496, name: 'Turin' },
  'VRN': { lat: 45.3957, lon: 10.8885, name: 'Verona' },
  'BRI': { lat: 41.1389, lon: 16.7606, name: 'Bari' },
  'OLB': { lat: 40.8987, lon: 9.5176, name: 'Olbia Sardinia' },
  'CAG': { lat: 39.2515, lon: 9.0543, name: 'Cagliari Sardinia' },

  // Middle East
  'DXB': { lat: 25.2532, lon: 55.3657, name: 'Dubai' },
  'AUH': { lat: 24.4330, lon: 54.6511, name: 'Abu Dhabi' },
  'DOH': { lat: 25.2731, lon: 51.6080, name: 'Doha Hamad' },
  'CAI': { lat: 30.1219, lon: 31.4056, name: 'Cairo' },
  'TLV': { lat: 32.0114, lon: 34.8867, name: 'Tel Aviv' },
  'AMM': { lat: 31.7226, lon: 35.9932, name: 'Amman' },
  'BEY': { lat: 33.8209, lon: 35.4884, name: 'Beirut' },
  'IST': { lat: 41.2753, lon: 28.7519, name: 'Istanbul' },
  'SAW': { lat: 40.8986, lon: 29.3092, name: 'Istanbul Sabiha' },
  'AYT': { lat: 36.8987, lon: 30.8005, name: 'Antalya' },
  'ESB': { lat: 40.1281, lon: 32.9951, name: 'Ankara' },
  'IZM': { lat: 38.2924, lon: 27.1570, name: 'Izmir' },

  // North America
  'JFK': { lat: 40.6413, lon: -73.7781, name: 'New York JFK' },
  'LGA': { lat: 40.7769, lon: -73.8740, name: 'New York LaGuardia' },
  'EWR': { lat: 40.6895, lon: -74.1745, name: 'Newark' },
  'BOS': { lat: 42.3656, lon: -71.0096, name: 'Boston' },
  'ORD': { lat: 41.9742, lon: -87.9073, name: 'Chicago O\'Hare' },
  'LAX': { lat: 33.9416, lon: -118.4085, name: 'Los Angeles' },
  'SFO': { lat: 37.6213, lon: -122.3790, name: 'San Francisco' },
  'SEA': { lat: 47.4502, lon: -122.3088, name: 'Seattle' },
  'MIA': { lat: 25.7959, lon: -80.2870, name: 'Miami' },
  'ATL': { lat: 33.6407, lon: -84.4277, name: 'Atlanta' },
  'DFW': { lat: 32.8998, lon: -97.0403, name: 'Dallas Fort Worth' },
  'IAH': { lat: 29.9902, lon: -95.3368, name: 'Houston' },
  'DEN': { lat: 39.8561, lon: -104.6737, name: 'Denver' },
  'PHX': { lat: 33.4352, lon: -112.0101, name: 'Phoenix' },
  'LAS': { lat: 36.0840, lon: -115.1537, name: 'Las Vegas' },
  'YYZ': { lat: 43.6777, lon: -79.6248, name: 'Toronto Pearson' },
  'YUL': { lat: 45.4657, lon: -73.7455, name: 'Montreal' },
  'YVR': { lat: 49.1939, lon: -123.1844, name: 'Vancouver' },

  // Asia Pacific
  'HKG': { lat: 22.3080, lon: 113.9185, name: 'Hong Kong' },
  'SIN': { lat: 1.3644, lon: 103.9915, name: 'Singapore' },
  'BKK': { lat: 13.6900, lon: 100.7501, name: 'Bangkok Suvarnabhumi' },
  'NRT': { lat: 35.7647, lon: 140.3864, name: 'Tokyo Narita' },
  'HND': { lat: 35.5494, lon: 139.7798, name: 'Tokyo Haneda' },
  'ICN': { lat: 37.4602, lon: 126.4407, name: 'Seoul Incheon' },
  'PEK': { lat: 40.0799, lon: 116.6031, name: 'Beijing Capital' },
  'PVG': { lat: 31.1443, lon: 121.8083, name: 'Shanghai Pudong' },
  'DEL': { lat: 28.5562, lon: 77.1000, name: 'Delhi' },
  'BOM': { lat: 19.0896, lon: 72.8656, name: 'Mumbai' },
  'SYD': { lat: -33.9399, lon: 151.1753, name: 'Sydney' },
  'MEL': { lat: -37.6690, lon: 144.8410, name: 'Melbourne' },
  'AKL': { lat: -37.0082, lon: 174.7850, name: 'Auckland' },
};

// Component to handle map resize issues
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    // Fix map rendering by invalidating size after mount
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

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

        map.flyTo([coords.lat, coords.lon], 10, {
          duration: 1.5
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

        console.log('[FR24] Searching for flight:', searchFlightNumber);
        if (onStatusUpdate) onStatusUpdate('Searching...');

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
            // No live flight found - show last known location
            showLastKnownLocation();
          }
        } else {
          const errorText = await response.text();
          console.error('[FR24] ❌ API error:', response.status, errorText);
          // API error - try to show last known location if we have flight data
          if (flightData) {
            showLastKnownLocation();
          } else {
            if (onStatusUpdate) onStatusUpdate(null);
            onFlightsUpdate([]);
          }
        }
      } catch (error) {
        console.error('[FR24] ❌ Error fetching flight:', error);
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

// Create custom aircraft icon that rotates based on heading - Simple solid silhouette
function createAircraftIcon(heading, altitude, isLastKnown = false) {
  const iconColor = isLastKnown ? '#888' : '#9D4EDD';
  const iconHtml = `
    <div class="aircraft-marker ${isLastKnown ? 'aircraft-grounded' : ''}" style="transform: rotate(${heading}deg); filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6));">
      <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2C14.5 2 14 3 14 4.5L14 12L3 15C2 15.3 1.5 16 2 17C2.3 17.5 3 17.8 4 17.5L14 15V23L11 25.5V28L16 26.5L21 28V25.5L18 23V15L28 17.5C29 17.8 29.7 17.5 30 17C30.5 16 30 15.3 29 15L18 12V4.5C18 3 17.5 2 16 2Z"
              fill="${iconColor}"
              stroke="#000"
              stroke-width="0.5"
              stroke-linejoin="round"/>
      </svg>
      ${!isLastKnown ? `<span class="aircraft-alt" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8); font-weight: 600;">${Math.round(altitude / 100)}</span>` : ''}
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'aircraft-icon leaflet-div-icon',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
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
        center={[63.0, 10.0]} // Center on Norway
        zoom={5}
        className="flight-map"
        zoomControl={true}
      >
        <MapResizeHandler />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        <FlightsLayer
          onFlightsUpdate={setFlights}
          onStatusUpdate={setStatus}
          searchFlightNumber={searchFlightNumber}
          flightData={flightData}
        />

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
