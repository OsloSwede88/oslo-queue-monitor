// Application Configuration Constants

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: [63.0, 10.0], // Center on Norway
  DEFAULT_ZOOM: 5,
  FLIGHT_ZOOM: 8,
  AIRPORT_ZOOM: 10,
  MAX_ZOOM: 20,
};

// Timing Constants (in milliseconds)
export const TIMING = {
  MAP_RESIZE_DELAY: 100,
  SEARCH_DEBOUNCE: 100,
  AUTO_SEARCH_DELAY: 100,
  MAP_FLY_DURATION: 1.5, // seconds for Leaflet flyTo
};

// Search History Configuration
export const SEARCH_HISTORY = {
  MAX_ITEMS: 15,
};

// Flight Timeline Thresholds
export const TIMELINE = {
  BOARDING_THRESHOLD: 5, // Progress % when flight is boarding
  ARRIVING_THRESHOLD: 95, // Progress % when flight is arriving
  NODE_ACTIVE_RANGE: 10, // Progress % range for active node detection
};

// Altitude Display
export const ALTITUDE = {
  DISPLAY_DIVISOR: 100, // Convert feet to flight level (divide by 100)
};

// API Configuration
export const API_DEFAULTS = {
  PLACEHOLDER_AIRLABS: 'your_airlabs_api_key_here',
  PLACEHOLDER_CHECKWX: 'your_checkwx_api_key_here',
  PLACEHOLDER_AVIATIONSTACK: 'your_aviationstack_api_key_here',
  PLACEHOLDER_OPENROUTER: 'your_openrouter_api_key_here',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  SEARCH_HISTORY: 'flightSearchHistory',
  SAVED_FLIGHTS: 'savedFlights',
  APP_SETTINGS: 'appSettings',
};

// Responsive Breakpoints (in pixels)
export const BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 768,
  DESKTOP: 1024,
};

// Map Component Constants
export const MAP_STATS = {
  BOTTOM_OFFSET: 16,
  LEFT_OFFSET: 16,
  MOBILE_BOTTOM_OFFSET: 8,
  MOBILE_LEFT_OFFSET: 8,
};

// Aircraft Icon Configuration
export const AIRCRAFT_ICON = {
  SIZE: 48,
  ANCHOR_OFFSET: 24,
  POPUP_ANCHOR_OFFSET: -24,
  DEFAULT_COLOR: '#9D4EDD',
  GROUNDED_COLOR: '#888',
};

// Quick Search Configuration
export const QUICK_SEARCH = {
  MAX_FLIGHTS_PER_AIRLINE: 40,
};

// OpenRouter AI Configuration
export const AI_CONFIG = {
  MODEL: 'openai/gpt-5-nano',
  PROMPT_WORD_TARGET: '150-200 words',
};

// Weather Data Configuration
export const WEATHER_CONFIG = {
  API_DAILY_LIMIT: 3000, // CheckWX free tier limit
};

// Glass UI Configuration
export const GLASS_UI = {
  BLUR_AMOUNT: '20px',
  OPACITY_STRONG: 0.7,
  OPACITY_MEDIUM: 0.5,
  OPACITY_LIGHT: 0.3,
};

// Animation Durations (in seconds)
export const ANIMATIONS = {
  SHIMMER_DURATION: 1.5,
  TRANSITION_FAST: 0.2,
  TRANSITION_BASE: 0.3,
  TRANSITION_SLOW: 0.5,
};

// Theme Configuration
export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  DEFAULT: 'dark',
};

// Date/Time Formatting
export const DATE_FORMATS = {
  LOCALE: 'no-NO',
  LOCALE_EN: 'en-US',
  TIME_OPTIONS: {
    hour: '2-digit',
    minute: '2-digit',
  },
  DATETIME_OPTIONS: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
};
