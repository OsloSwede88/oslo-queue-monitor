// Vercel serverless function to proxy OpenSky API requests with OAuth2 authentication
// This keeps the client credentials secure on the server

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

  // Get OAuth credentials from environment variables (optional - will fall back to anonymous access)
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  try {
    // Step 1: Get OAuth token (with fallback to anonymous access)
    let accessToken = null;
    let isAuthenticated = false;

    if (clientId && clientSecret) {
      console.log('[OpenSky Proxy] Attempting OAuth authentication...');
      console.log('[OpenSky Proxy] Client ID:', clientId);

      try {
        const tokenResponse = await fetch(
          'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: clientId,
              client_secret: clientSecret
            }),
            signal: AbortSignal.timeout(8000) // 8 second timeout
          }
        );

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          accessToken = tokenData.access_token;
          isAuthenticated = true;
          console.log('[OpenSky Proxy] ✅ OAuth token obtained - 4000 credits/day');
        } else {
          const errorText = await tokenResponse.text();
          console.warn('[OpenSky Proxy] ⚠️ Token fetch failed:', tokenResponse.status, errorText);
          console.log('[OpenSky Proxy] Falling back to anonymous access (100 credits/day)');
        }
      } catch (fetchError) {
        console.warn('[OpenSky Proxy] ⚠️ OAuth timeout/error:', fetchError.message);
        console.log('[OpenSky Proxy] Falling back to anonymous access (100 credits/day)');
      }
    } else {
      console.log('[OpenSky Proxy] No OAuth credentials - using anonymous access (100 credits/day)');
    }

    // Step 2: Fetch flights from OpenSky API (with or without token)
    const { lamin, lomin, lamax, lomax } = req.query;

    if (!lamin || !lomin || !lamax || !lomax) {
      return res.status(400).json({ error: 'Missing required query parameters: lamin, lomin, lamax, lomax' });
    }

    const openSkyUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    console.log('[OpenSky Proxy] Fetching flights:', openSkyUrl);
    console.log('[OpenSky Proxy] Using', isAuthenticated ? 'authenticated' : 'anonymous', 'access');

    const headers = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const flightsResponse = await fetch(openSkyUrl, {
      headers: headers
    });

    if (!flightsResponse.ok) {
      const errorText = await flightsResponse.text();
      console.error('[OpenSky Proxy] Flights fetch failed:', flightsResponse.status, errorText);
      return res.status(flightsResponse.status).json({ error: 'Failed to fetch flights' });
    }

    const flightsData = await flightsResponse.json();
    const flightCount = flightsData.states?.length || 0;
    const accessType = isAuthenticated ? 'authenticated (4000 credits/day)' : 'anonymous (100 credits/day)';
    console.log(`[OpenSky Proxy] ✅ Success! Returning ${flightCount} flights via ${accessType}`);

    // Return the flights data
    res.status(200).json(flightsData);

  } catch (error) {
    console.error('[OpenSky Proxy] Error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
