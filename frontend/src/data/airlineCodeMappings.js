// ICAO to IATA airline code mapping (comprehensive)
// Maps 3-letter ICAO codes to 2-letter IATA codes
// Used for converting flight callsigns from FlightRadar24 to searchable flight numbers

export const icaoToIataMapping = {
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
