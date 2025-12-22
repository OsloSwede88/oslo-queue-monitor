/**
 * Google Analytics 4 Event Tracking
 * Wrapper functions for tracking custom events
 */

// Check if GA4 is loaded
const isGA4Enabled = () => {
  return typeof window !== 'undefined' &&
         typeof window.gtag === 'function' &&
         import.meta.env.VITE_GA4_MEASUREMENT_ID;
};

/**
 * Track flight search
 * @param {string} flightNumber - Flight number searched
 */
export const trackFlightSearch = (flightNumber) => {
  if (isGA4Enabled()) {
    window.gtag('event', 'search', {
      search_term: flightNumber,
      event_category: 'Flight Tracker',
      event_label: 'Flight Search'
    });
  }
};

/**
 * Track quick airline selection
 * @param {string} airline - Airline name
 */
export const trackQuickAirlineClick = (airline) => {
  if (isGA4Enabled()) {
    window.gtag('event', 'select_content', {
      content_type: 'airline',
      content_id: airline,
      event_category: 'Quick Search',
      event_label: airline
    });
  }
};

/**
 * Track flight result view
 * @param {string} flightNumber - Flight number
 * @param {string} airline - Airline name
 */
export const trackFlightView = (flightNumber, airline) => {
  if (isGA4Enabled()) {
    window.gtag('event', 'view_item', {
      item_id: flightNumber,
      item_name: `${airline} ${flightNumber}`,
      item_category: 'Flight',
      event_category: 'Flight Tracker',
      event_label: 'Flight View'
    });
  }
};

/**
 * Track theme toggle
 * @param {string} theme - Theme selected (dark/light)
 */
export const trackThemeToggle = (theme) => {
  if (isGA4Enabled()) {
    window.gtag('event', 'theme_change', {
      theme: theme,
      event_category: 'UI',
      event_label: `Theme: ${theme}`
    });
  }
};

/**
 * Track navigation
 * @param {string} view - View navigated to
 */
export const trackNavigation = (view) => {
  if (isGA4Enabled()) {
    window.gtag('event', 'page_view', {
      page_title: view,
      page_location: window.location.href,
      page_path: `/${view}`,
      event_category: 'Navigation',
      event_label: view
    });
  }
};

/**
 * Track API errors
 * @param {string} api - API that failed
 * @param {string} error - Error message
 */
export const trackAPIError = (api, error) => {
  if (isGA4Enabled()) {
    window.gtag('event', 'exception', {
      description: `${api}: ${error}`,
      fatal: false,
      event_category: 'API Error',
      event_label: api
    });
  }
};

/**
 * Track saved flights
 * @param {string} flightNumber - Flight number saved
 */
export const trackSaveFlight = (flightNumber) => {
  if (isGA4Enabled()) {
    window.gtag('event', 'add_to_favorites', {
      item_id: flightNumber,
      event_category: 'Engagement',
      event_label: 'Save Flight'
    });
  }
};

/**
 * Track search from history
 * @param {string} flightNumber - Flight number from history
 */
export const trackSearchFromHistory = (flightNumber) => {
  if (isGA4Enabled()) {
    window.gtag('event', 'select_content', {
      content_type: 'history',
      content_id: flightNumber,
      event_category: 'Search History',
      event_label: 'Search from History'
    });
  }
};
