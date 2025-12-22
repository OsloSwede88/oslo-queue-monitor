/**
 * Initialize Google Analytics 4
 * This file is loaded as a module, so import.meta.env works correctly
 */

const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;

// Only load GA4 if Measurement ID is configured
if (GA4_ID && GA4_ID !== 'your-measurement-id-here') {
  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA4_ID, {
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure'
  });

  console.log('[GA4] Initialized with ID:', GA4_ID);
} else {
  console.log('[GA4] Not initialized - no Measurement ID configured');
}
