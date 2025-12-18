# Flight Tracker Setup Guide

The Oslo Queue Monitor now includes a comprehensive flight tracking feature that provides real-time flight information and weather conditions.

## Features

- **Flight Search**: Search by flight number and date
- **Real-time Data**: Uses AviationStack API for live flight tracking
- **Weather Information**: Displays current weather at departure and arrival airports
- **Flight Details**: Shows departure/arrival airports, times, aircraft ID, route, and flight status
- **Direct Links**: Quick access to FlightRadar24 for more details

## API Setup

### 1. AviationStack API (Required - FREE)

AviationStack provides real-time flight tracking data with a free tier.

- **API**: AviationStack
- **Cost**: Free tier available
- **Limits**: 100 requests per month (free tier)
- **Documentation**: https://aviationstack.com/documentation

**Setup Instructions:**

1. **Sign up for a free account**:
   - Visit: https://aviationstack.com/product
   - Click "Get Free API Key"
   - Create an account (email + password)

2. **Get your API key**:
   - Log in to your AviationStack dashboard
   - Find your API Access Key on the dashboard
   - Copy the key

3. **Add to environment variables**:
   ```bash
   # In frontend/.env file:
   VITE_AVIATIONSTACK_API_KEY=your_actual_api_key_here
   ```

4. **Restart the dev server**:
   ```bash
   npm run dev
   ```

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

## Usage

1. **Navigate to Flight Tracker**:
   - Click the "✈️ Flight Tracker" tab in the app

2. **Search for a flight**:
   - Enter flight number (e.g., SK4035, DY1234)
   - Optionally select a date
   - Click "Track Flight"

3. **View results**:
   - Flight details (departure/arrival airports, times)
   - Aircraft information (ICAO24 code)
   - Route and duration
   - Weather conditions (if CheckWX API key is configured)

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
- Verify your AviationStack API key is correctly configured in `.env`
- Free tier has 100 requests/month - check if you've exceeded the limit
- Some regional/charter flights may not be available in AviationStack's database

### API Key errors
- Double-check your AviationStack API key is correctly copied to `.env`
- Make sure the environment variable name is exactly `VITE_AVIATIONSTACK_API_KEY`
- Restart your dev server after adding/changing the API key
- Check browser console for detailed error messages

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

| API | Free Tier | Cost Beyond Free |
|-----|-----------|------------------|
| AviationStack | 100 req/month | $9.99/month for 500 req/month |
| CheckWX Weather | 3,000 req/day | $10/month for 10,000/day |

**Note**: The free tier of 100 requests/month for AviationStack should be sufficient for personal use. If you track ~3 flights per day, you'll stay within the limit.

## Privacy

- No flight search data is stored or logged
- All API calls are made directly from your browser
- Your API keys are stored locally in environment variables
