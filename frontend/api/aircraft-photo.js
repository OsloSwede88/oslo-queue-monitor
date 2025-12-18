/**
 * Vercel Serverless Function: Planespotters API Proxy
 *
 * Proxies requests to Planespotters API to avoid CORS issues.
 * Supports both hex (ICAO24) and registration number lookups.
 *
 * Usage:
 *   /api/aircraft-photo?identifier=4ACA76&type=hex
 *   /api/aircraft-photo?identifier=SE-RSV&type=reg
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { identifier, type } = req.query;

  // Validate parameters
  if (!identifier) {
    return res.status(400).json({
      error: 'Missing required parameter: identifier'
    });
  }

  if (!type || (type !== 'hex' && type !== 'reg')) {
    return res.status(400).json({
      error: 'Invalid type parameter. Must be "hex" or "reg"'
    });
  }

  try {
    // Build Planespotters API endpoint
    const endpoint = type === 'reg'
      ? `https://api.planespotters.net/pub/photos/reg/${identifier}`
      : `https://api.planespotters.net/pub/photos/hex/${identifier}`;

    console.log(`[Planespotters Proxy] Fetching: ${endpoint}`);

    // Fetch from Planespotters API
    const response = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Flight-Tracker-App/1.0'
      }
    });

    if (!response.ok) {
      console.error(`[Planespotters Proxy] API error: ${response.status}`);
      return res.status(response.status).json({
        error: 'Planespotters API error',
        status: response.status,
        message: response.statusText
      });
    }

    const data = await response.json();

    console.log(`[Planespotters Proxy] Success - ${data.photos?.length || 0} photos found`);

    // Return the data
    res.status(200).json(data);
  } catch (error) {
    console.error('[Planespotters Proxy] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch aircraft photo',
      message: error.message
    });
  }
}
