// Vercel serverless function to proxy OpenSky API requests with OAuth2 authentication
// This keeps the client credentials secure on the server

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get OAuth credentials from environment variables (set in Vercel dashboard)
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[OpenSky Proxy] Missing OAuth credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Step 1: Get OAuth token
    console.log('[OpenSky Proxy] Fetching OAuth token...');
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
        })
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[OpenSky Proxy] Token fetch failed:', tokenResponse.status, errorText);
      return res.status(tokenResponse.status).json({ error: 'Failed to obtain OAuth token' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('[OpenSky Proxy] OAuth token obtained');

    // Step 2: Fetch flights from OpenSky API with the token
    const { lamin, lomin, lamax, lomax } = req.query;

    if (!lamin || !lomin || !lamax || !lomax) {
      return res.status(400).json({ error: 'Missing required query parameters: lamin, lomin, lamax, lomax' });
    }

    const openSkyUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    console.log('[OpenSky Proxy] Fetching flights:', openSkyUrl);

    const flightsResponse = await fetch(openSkyUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!flightsResponse.ok) {
      const errorText = await flightsResponse.text();
      console.error('[OpenSky Proxy] Flights fetch failed:', flightsResponse.status, errorText);
      return res.status(flightsResponse.status).json({ error: 'Failed to fetch flights' });
    }

    const flightsData = await flightsResponse.json();
    console.log('[OpenSky Proxy] Success! Returning', flightsData.states?.length || 0, 'flights');

    // Return the flights data
    res.status(200).json(flightsData);

  } catch (error) {
    console.error('[OpenSky Proxy] Error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
