# Flight Tracker Setup Guide

The Oslo Queue Monitor now includes a comprehensive flight tracking feature that provides real-time flight information and weather conditions.

## Features

- **Flight Search**: Search by flight number and date
- **Real-time Data**: Uses AirLabs API for live flight tracking
- **Weather Information**: Displays current weather at departure and arrival airports
- **Flight Details**: Shows departure/arrival airports, times, aircraft ID, route, and flight status
- **Aircraft Information**: AI-generated detailed information about the aircraft model, specifications, and interesting facts
- **Aircraft Photos**: High-definition photos from Planespotters.net
- **Flight Subscriptions**: Real-time push notifications for gate changes, delays, and status updates
- **Direct Links**: Quick access to FlightRadar24 for more details

## API Setup

### 1. AirLabs API (Required - FREE)

AirLabs provides real-time flight tracking data with a generous free tier.

- **API**: AirLabs
- **Cost**: Free tier available
- **Limits**: 1,000 requests per month (free tier)
- **Documentation**: https://airlabs.co/docs/
- **Note**: Free tier doesn't include aircraft registration data for most flights

**Setup Instructions:**

1. **Sign up for a free account**:
   - Visit: https://airlabs.co/
   - Click "Sign Up" or "Get API Key"
   - Create an account (email + password)

2. **Get your API key**:
   - Log in to your AirLabs dashboard
   - Find your API Key on the dashboard
   - Copy the key

3. **Add to environment variables**:
   ```bash
   # In frontend/.env file:
   VITE_AIRLABS_API_KEY=your_actual_api_key_here

   # On Railway (backend):
   # Go to your Railway project → Variables tab
   # Add: AIRLABS_API_KEY=your_actual_api_key_here
   ```

4. **Restart the dev server**:
   ```bash
   npm run dev
   ```

### 1.5 AviationStack API (Optional Fallback - FREE)

**Hybrid Strategy**: AviationStack is used as a fallback ONLY when AirLabs doesn't provide aircraft registration data. This maximizes your free tier usage!

- **API**: AviationStack
- **Cost**: Free tier available
- **Limits**: 100 requests per month (free tier)
- **Documentation**: https://aviationstack.com/documentation
- **Used For**: Aircraft registration data when AirLabs returns null

**Setup Instructions:**

1. **Sign up for a free account**:
   - Visit: https://aviationstack.com/
   - Click "Get Free API Key"
   - Create an account

2. **Get your API key**:
   - Log in to your AviationStack dashboard
   - Copy your API Access Key

3. **Add to environment variables**:
   ```bash
   # In frontend/.env file:
   VITE_AVIATIONSTACK_API_KEY=your_actual_api_key_here
   ```

4. **Restart the dev server**:
   ```bash
   npm run dev
   ```

**How it works**:
- Primary: AirLabs API (fast, 1000 req/month)
- Fallback: Only when aircraft data is missing, AviationStack is called (100 req/month)
- This hybrid approach maximizes your free tier limits!

### 2. CheckWX Weather API (Optional - FREE)

To enable weather information display:

1. **Sign up for a free account**:
   - Visit: https://www.checkwx.com/
   - Click "Sign Up" and create an account
   - Free tier includes **3,000 requests per day**

2. **Get your API key**:
   - Log in to your CheckWX account
   - Navigate to your dashboard
   - Copy your API key

3. **Add to environment variables**:
   ```bash
   # In frontend/.env file:
   VITE_CHECKWX_API_KEY=your_actual_api_key_here
   ```

4. **Restart the dev server**:
   ```bash
   npm run dev
   ```

### 3. OpenRouter API (Optional - FREE)

To enable AI-generated aircraft information:

1. **Sign up for a free account**:
   - Visit: https://openrouter.ai/
   - Click "Sign In" and create an account
   - Free tier includes access to many free models

2. **Get your API key**:
   - Log in to your OpenRouter dashboard
   - Navigate to Keys section
   - Create a new API key
   - Copy the key

3. **Add to environment variables**:
   ```bash
   # In frontend/.env file:
   VITE_OPENROUTER_API_KEY=your_actual_api_key_here
   ```

4. **Restart the dev server**:
   ```bash
   npm run dev
   ```

**Model Used**: google/gemini-2.0-flash-exp:free (completely free)

### 4. Planespotters.net (Automatic - FREE)

Aircraft photos are automatically fetched from Planespotters.net's public API - no setup required!

## Usage

1. **Navigate to Flight Tracker**:
   - Click the "✈️ Flight Tracker" tab in the app

2. **Search for a flight**:
   - Enter flight number (e.g., SK4035, DY1234)
   - Optionally select a date
   - Click "Track Flight"

3. **View results**:
   - Flight details (departure/arrival airports, times, gates, terminals)
   - Aircraft registration and model information
   - Route and duration
   - Weather conditions (if CheckWX API key is configured)
   - High-definition aircraft photo (from Planespotters.net)
   - AI-generated aircraft information (if OpenRouter API key is configured)
   - Flight subscription option for real-time updates

## Examples

Example flight numbers to try:
- **SK4035** - SAS flight
- **DY1234** - Norwegian flight
- **BA123** - British Airways flight
- **LH400** - Lufthansa flight

## Troubleshooting

### No weather data showing
- Check that you've added your CheckWX API key to `.env`
- Restart the dev server after adding the key
- Check browser console for API error messages
- Verify you haven't exceeded the free tier limit (3,000 requests/day)

### Flight not found
- Make sure the flight number is correct and in IATA format (e.g., "LH867", "SK4035")
- Try searching without spaces (e.g., "SK4035" not "SK 4035")
- Verify your AirLabs API key is correctly configured in `.env`
- Free tier has 1,000 requests/month - check if you've exceeded the limit
- Some regional/charter flights may not be available in AirLabs' database

### API Key errors
- Double-check your AirLabs API key is correctly copied to `.env`
- Make sure the environment variable name is exactly `VITE_AIRLABS_API_KEY`
- Restart your dev server after adding/changing the API key
- Check browser console for detailed error messages
- For backend: Ensure `AIRLABS_API_KEY` is set in Railway environment variables

### Weather API errors
- Verify your CheckWX API key is correct
- Check that the airport ICAO code is valid
- Some smaller airports may not have weather data available

## Future Enhancements

Potential features to add:
- Flight status alerts (delays, cancellations)
- Multiple flight comparison
- Flight history tracking
- Airport information and maps
- Currency converter for international flights
- Public transport connections to/from airports

## API Costs

| API | Free Tier | Cost Beyond Free | Usage |
|-----|-----------|------------------|-------|
| AirLabs | 1,000 req/month | $49/month for 25,000 req/month | Primary flight tracking |
| AviationStack | 100 req/month | $49.99/month for 10,000 req/month | Fallback for aircraft data only |
| CheckWX Weather | 3,000 req/day | $10/month for 10,000/day | Weather information |
| OpenRouter (Gemini) | Free | Free | AI-generated aircraft info |
| Planespotters.net | Free | Free | Aircraft photos |

**Note**: The hybrid approach (AirLabs + AviationStack fallback) ensures you get the best data while staying within free tier limits. AirLabs handles most requests (1,000/month), and AviationStack is only called when aircraft data is missing (~100/month).

## Privacy

- No flight search data is stored or logged
- All API calls are made directly from your browser
- Your API keys are stored locally in environment variables
