# API Setup Guide

This app uses multiple flight data APIs with an intelligent fallback system to ensure reliable aircraft registration data for photos.

## Aircraft Data Fallback Chain

When AirLabs (primary) doesn't provide aircraft registration:

1. **FlightAware AeroAPI** (First fallback) ⭐ **Recommended**
2. **OpenSky Network** (Second fallback) ✅ Already configured
3. **AviationStack** (Third fallback) ⚠️ Currently exhausted

## Getting FlightAware AeroAPI Key (Free Tier)

FlightAware offers **10,000 requests per month** on their free tier - perfect for this app!

### Steps:

1. **Sign up for FlightAware**
   - Go to: https://www.flightaware.com/commercial/aeroapi/
   - Click "Try AeroAPI for Free"
   - Create an account

2. **Get your API key**
   - After registration, go to your account settings
   - Navigate to the API section
   - Copy your API key

3. **Add to your .env file**
   ```bash
   VITE_FLIGHTAWARE_API_KEY=your_actual_key_here
   ```

4. **Restart your dev server**
   ```bash
   npm run dev
   ```

## How the Fallback System Works

```
Flight Search
    ↓
AirLabs API (primary flight data)
    ↓
Has aircraft registration? ─YES→ Fetch Planespotters photo (specific aircraft) ✅
    ↓ NO
FlightAware AeroAPI (10k/month free)
    ↓
Has registration? ─YES→ Fetch Planespotters photo (specific aircraft) ✅
    ↓ NO
Has aircraft type? ─YES→ Fetch Wikimedia Commons photo (generic aircraft type) 📷
    ↓ NO
OpenSky Network (unlimited, free)
    ↓
Has ICAO24? ─YES→ Fetch Planespotters photo (specific aircraft) ✅
    ↓ NO
AviationStack (1k/month free)
    ↓
Has registration? ─YES→ Fetch Planespotters photo (specific aircraft) ✅
    ↓ NO
No aircraft photo available ❌
```

**New Feature:** When registration data is unavailable but aircraft type is known (e.g., "E295"), the app automatically searches Wikimedia Commons for generic photos of that aircraft type. A badge indicates when showing a generic aircraft photo vs the specific aircraft.

## Current API Status

| API | Status | Tier | Limit |
|-----|--------|------|-------|
| AirLabs | ✅ Active | Free | 1,000/month |
| FlightAware | ⏳ **Add key** | Free | 10,000/month |
| OpenSky | ✅ Configured | Free | Unlimited |
| AviationStack | ⚠️ Exhausted | Free | 1,000/month |

## Why Aircraft Photos Stopped Working

**Root Cause:** AviationStack monthly limit was reached, and AirLabs doesn't provide aircraft registration on free tier.

**Solution:** Add FlightAware API key (see above) for 10,000 free requests/month!

## Alternative: Wait for Reset

AviationStack resets monthly. Check your account at https://aviationstack.com to see when your limit resets.

## Testing

After adding FlightAware key, search for any flight to verify:

```bash
# Dev server should show:
✅ Aircraft photo appears
✅ Aircraft registration visible
```

## Support

- FlightAware API Docs: https://www.flightaware.com/commercial/aeroapi/documentation.rvt
- OpenSky API Docs: https://openskynetwork.github.io/opensky-api/
