import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// FlightAware AeroAPI proxy endpoint (to bypass CORS)
app.get('/api/flightaware/:flightNumber', async (req, res) => {
  const { flightNumber } = req.params;
  const apiKey = process.env.VITE_FLIGHTAWARE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'FlightAware API key not configured' });
  }

  try {
    const endpoint = `https://aeroapi.flightaware.com/aeroapi/flights/${flightNumber}`;
    console.log(`[Server] Proxying FlightAware request: ${endpoint}`);

    const response = await fetch(endpoint, {
      headers: {
        'x-apikey': apiKey
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'FlightAware API error',
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Server] FlightAware proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch FlightAware data' });
  }
});

// OpenSky Network proxy endpoint (to bypass CORS)
app.get('/api/opensky/flights', async (req, res) => {
  const { begin, end } = req.query;
  const clientId = process.env.VITE_OPENSKY_CLIENT_ID;
  const clientSecret = process.env.VITE_OPENSKY_CLIENT_SECRET;

  try {
    const endpoint = `https://opensky-network.org/api/flights/all?begin=${begin}&end=${end}`;
    console.log(`[Server] Proxying OpenSky request: ${endpoint}`);

    const headers = {};
    if (clientId && clientSecret) {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const response = await fetch(endpoint, { headers });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'OpenSky API error',
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Server] OpenSky proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch OpenSky data' });
  }
});

// Planespotters proxy endpoint (to bypass CORS)
app.get('/api/aircraft-photo/:identifier', async (req, res) => {
  const { identifier } = req.params;
  const { type } = req.query; // 'hex' or 'reg'

  try {
    const endpoint = type === 'reg'
      ? `https://api.planespotters.net/pub/photos/reg/${identifier}`
      : `https://api.planespotters.net/pub/photos/hex/${identifier}`;

    console.log(`[Server] Proxying Planespotters request: ${endpoint}`);

    const response = await fetch(endpoint);

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Planespotters API error',
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Server] Planespotters proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch aircraft photo' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Flight Tracker API Proxy running on port ${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
});
