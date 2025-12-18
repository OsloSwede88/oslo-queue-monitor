import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import AvinorScraper from './scraper.js';
import FlightMonitor from './flightMonitor.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const SCRAPE_INTERVAL = 30000; // 30 seconds
const ALERT_THRESHOLD = 15; // 15 minutes

// Middleware
app.use(cors());
app.use(express.json());

// State
const scraper = new AvinorScraper();
const flightMonitor = new FlightMonitor();
let currentQueueData = null;
let scrapeTimer = null;

// WebSocket clients
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected');
  clients.add(ws);

  // Send current data immediately
  if (currentQueueData) {
    ws.send(JSON.stringify({ type: 'queue-update', data: currentQueueData }));
  }

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'subscribe-flight') {
        console.log(`[WebSocket] Subscribe request for flight ${data.flightNumber}`);
        flightMonitor.addSubscription(data.flightNumber, ws, data.flightData);
        ws.send(JSON.stringify({
          type: 'subscription-confirmed',
          flightNumber: data.flightNumber
        }));
      } else if (data.type === 'unsubscribe-flight') {
        console.log(`[WebSocket] Unsubscribe request for flight ${data.flightNumber}`);
        flightMonitor.removeSubscription(data.flightNumber, ws);
        ws.send(JSON.stringify({
          type: 'unsubscription-confirmed',
          flightNumber: data.flightNumber
        }));
      }
    } catch (error) {
      console.error('[WebSocket] Error handling message:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
    clients.delete(ws);
    flightMonitor.removeClient(ws);
  });

  ws.on('error', (error) => {
    console.error('[WebSocket] Error:', error.message);
    clients.delete(ws);
    flightMonitor.removeClient(ws);
  });
});

// Broadcast to all WebSocket clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      try {
        client.send(message);
      } catch (error) {
        console.error('[WebSocket] Error sending to client:', error.message);
      }
    }
  });
}

// Scrape queue time and broadcast
async function scrapeAndBroadcast() {
  try {
    console.log('[Server] Scraping queue time...');
    const queueData = await scraper.scrapeQueueTime();

    currentQueueData = queueData;

    // Broadcast to all connected clients
    broadcast({ type: 'queue-update', data: queueData });

    // Check if we need to send alert
    if (queueData.minutes && queueData.minutes > ALERT_THRESHOLD) {
      console.log(`[Server] ALERT: Queue time (${queueData.minutes} min) exceeds threshold!`);
      broadcast({
        type: 'alert',
        data: {
          message: `Security queue time is ${queueData.text}!`,
          queueData
        }
      });
    }

    console.log('[Server] Queue time:', queueData.text);
  } catch (error) {
    console.error('[Server] Error in scrape cycle:', error.message);
  }
}

// Start periodic scraping
function startScraping() {
  // Initial scrape
  scrapeAndBroadcast();

  // Set up interval
  scrapeTimer = setInterval(scrapeAndBroadcast, SCRAPE_INTERVAL);
  console.log(`[Server] Scraping every ${SCRAPE_INTERVAL / 1000} seconds`);
}

// REST API Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/queue', (req, res) => {
  if (currentQueueData) {
    res.json(currentQueueData);
  } else {
    res.status(503).json({
      error: 'Queue data not available yet',
      message: 'Please wait for initial scrape to complete'
    });
  }
});

// Push notification subscription endpoint
app.post('/api/subscribe', (req, res) => {
  const { subscription } = req.body;

  // TODO: Store subscription in database or memory
  console.log('[Server] New push subscription:', subscription.endpoint);

  res.json({ success: true, message: 'Subscription saved' });
});

// Graceful shutdown
async function shutdown() {
  console.log('[Server] Shutting down...');

  if (scrapeTimer) {
    clearInterval(scrapeTimer);
  }

  flightMonitor.stopMonitoring();

  await scraper.close();

  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket server ready`);
  startScraping();
});
