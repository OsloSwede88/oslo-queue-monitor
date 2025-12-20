// Vercel serverless function to proxy FlightRadar24 API requests
// This keeps the API token secure on the server

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

  // Get API token from environment variables
  const apiToken = process.env.FLIGHTRADAR24_API_TOKEN;

  if (!apiToken) {
    console.error('[FR24 Proxy] Missing API token');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { bounds, flights } = req.query;

    if (!bounds && !flights) {
      return res.status(400).json({ error: 'Missing required query parameter: bounds or flights' });
    }

    // FlightRadar24 API endpoint - support both bounds and specific flight search
    const queryParam = flights ? `flights=${flights}` : `bounds=${bounds}`;
    const fr24Url = `https://fr24api.flightradar24.com/api/live/flight-positions/full?${queryParam}`;

    console.log('[FR24 Proxy] Fetching flights:', fr24Url);

    const response = await fetch(fr24Url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept-Version': 'v1'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FR24 Proxy] API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'FlightRadar24 API error',
        status: response.status
      });
    }

    const data = await response.json();
    const flightCount = data.data?.length || 0;
    console.log(`[FR24 Proxy] ✅ Success! Returning ${flightCount} flights`);

    // Return the data
    res.status(200).json(data);

  } catch (error) {
    console.error('[FR24 Proxy] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
