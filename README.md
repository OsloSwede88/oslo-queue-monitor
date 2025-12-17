# Oslo Airport Queue Monitor

A Progressive Web App (PWA) that monitors security checkpoint queue times at Oslo Airport (OSL) with real-time updates and push notifications.

## Features

- ✅ **Real-time Updates**: Queue times updated every 30 seconds via WebSocket
- 🔔 **Push Notifications**: Get alerted when wait time exceeds 15 minutes
- 📱 **Progressive Web App**: Install on your phone's home screen
- ⚡ **Offline Support**: Works offline with cached data
- 🎨 **Modern UI**: Clean, responsive design with color-coded queue status

## How It Works

The application scrapes the official Avinor website for Oslo Airport queue times and provides:
- Real-time monitoring via WebSocket connections
- Browser push notifications for long wait times
- PWA functionality for native app-like experience
- Automatic reconnection and error handling

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Install Playwright browsers** (for web scraping):
```bash
npx playwright install chromium
```

3. **Start development servers**:
```bash
npm run dev
```

This will start:
- Backend API on `http://localhost:3001`
- Frontend PWA on `http://localhost:3000`

### Production Build

1. **Build frontend**:
```bash
npm run build
```

2. **Start production server**:
```bash
npm start
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── server.js      # Express server with WebSocket
│   │   └── scraper.js     # Playwright scraper for Avinor
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   ├── App.css        # Styles
│   │   └── main.jsx       # Entry point
│   ├── public/            # Static assets
│   ├── vite.config.js     # Vite + PWA config
│   └── package.json
└── package.json           # Workspace root
```

## Configuration

### Backend (`backend/.env`)
```env
PORT=3001
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3001
```

## API Endpoints

### REST API

- `GET /health` - Health check
- `GET /api/queue` - Get current queue data
- `POST /api/subscribe` - Subscribe to push notifications

### WebSocket

- Connect to `ws://localhost:3001` for real-time updates
- Messages:
  - `{ type: 'queue-update', data: {...} }` - Queue time update
  - `{ type: 'alert', data: {...} }` - Alert when threshold exceeded

## Push Notifications

To enable push notifications:

1. Click "Enable Notifications" button
2. Grant permission when browser prompts
3. Receive alerts when queue time > 15 minutes

## PWA Installation

### On Mobile (iOS/Android)
1. Open the app in your browser
2. Tap share/menu button
3. Select "Add to Home Screen"

### On Desktop (Chrome/Edge)
1. Look for install icon in address bar
2. Click to install as standalone app

## Development

### Watch Mode
```bash
npm run dev
```

### Build Frontend
```bash
npm run build:frontend
```

### Start Backend Only
```bash
npm run dev:backend
```

## Technical Stack

### Backend
- **Express** - Web server
- **Playwright** - Web scraping with headless browser
- **ws** - WebSocket server
- **web-push** - Push notification support

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **vite-plugin-pwa** - PWA support with Workbox

## Data Source

Queue time data is scraped from the official Avinor website:
https://www.avinor.no/flyplass/oslo/flytider/

**Note**: This is an unofficial monitoring tool. Always arrive according to your airline's recommendations.

## Limitations

- Scraping depends on Avinor website structure
- Push notifications require HTTPS in production
- Browser support for PWA features varies

## Future Enhancements

- [ ] Support for other Norwegian airports (Bergen, Stavanger, Trondheim)
- [ ] Historical data and trends
- [ ] Persistent push subscriptions with database
- [ ] Email/SMS notifications
- [ ] Customizable alert thresholds
- [ ] Queue time predictions

## License

MIT

## Disclaimer

This is an unofficial tool and is not affiliated with Avinor AS. Queue time data is sourced from publicly available information on Avinor's website. Use at your own discretion.
