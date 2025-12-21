# Railway Backend Deployment Instructions

## Current Status
✅ Backend code pushed to GitHub (commit 5f28af2)
⏳ Awaiting environment variable configuration on Railway

## Steps to Complete Deployment

### 1. Add FlightAware API Key to Railway

1. Go to **https://railway.app** and sign in
2. Find your **oslo-queue-backend** project
3. Click on the backend service
4. Go to the **Variables** tab
5. Add this variable:
   ```
   VITE_FLIGHTAWARE_API_KEY=U2O5xLTAQM7Fj6omQby0IJl5RnA04YNv
   ```
6. Click **Add** or **Save**

### 2. Railway Will Auto-Deploy

Once you save the variable:
- Railway will automatically redeploy the backend
- The new proxy routes will be active:
  - `/api/flightaware/:flightNumber` - FlightAware AeroAPI proxy
  - `/api/opensky/flights` - OpenSky Network proxy
  - `/api/aircraft-photo/:identifier` - Planespotters proxy

### 3. Get Railway Backend URL

1. In your Railway backend service, go to **Settings** → **Networking**
2. If you don't have a domain, click **"Generate Domain"**
3. Copy the URL (e.g., `https://oslo-queue-backend-production.up.railway.app`)

### 4. Update Vercel Environment Variables

1. Go to **https://vercel.com**
2. Find your **frontend** project
3. Go to **Settings** → **Environment Variables**
4. Add this variable:
   ```
   VITE_API_URL=https://your-railway-backend-url.up.railway.app
   ```
   (Use the URL from step 3)
5. Save the variable
6. Go to **Deployments** tab
7. Click **"Redeploy"** on the latest deployment

### 5. Test the Deployment

Once both are deployed:
1. Visit your Vercel URL
2. Search for a flight (e.g., "KL1304")
3. Check for aircraft photos:
   - **With registration data**: Should show Planespotters photo
   - **Without registration data**: Should show generic Wikimedia photo with orange badge

## How the System Works

### API Call Flow (Production)

```
Frontend (Vercel)
    ↓
Calls: fetch(`${VITE_API_URL}/api/flightaware/KL1304`)
    ↓
Backend (Railway)
    ↓
Proxies to: https://aeroapi.flightaware.com/aeroapi/flights/KL1304
    ↓
Returns data to frontend (CORS-free!)
```

### Why Backend Proxy?

The backend proxy solves CORS issues:
- FlightAware API doesn't allow direct browser calls (CORS blocked)
- OpenSky Network doesn't allow direct browser calls (CORS blocked)
- Backend makes the API calls server-side and returns data to frontend

## Troubleshooting

### Backend not responding:
- Check Railway logs: Service → Deployments → View Logs
- Verify `VITE_FLIGHTAWARE_API_KEY` is set in Variables tab

### Frontend shows generic photos for all flights:
- Verify `VITE_API_URL` is set correctly in Vercel
- Check Railway backend is running (green status)
- Redeploy frontend after changing environment variables

### "Loading aircraft details..." never finishes:
- Open browser console (F12)
- Check for 404 errors on `/api/flightaware/...` calls
- This means `VITE_API_URL` is not set in Vercel

## Environment Variables Summary

### Backend (Railway)
```env
VITE_FLIGHTAWARE_API_KEY=U2O5xLTAQM7Fj6omQby0IJl5RnA04YNv
PORT=3001  # Optional, Railway sets automatically
```

### Frontend (Vercel)
```env
VITE_API_URL=https://your-railway-backend-url.up.railway.app
VITE_AIRLABS_API_KEY=14c1d056-7592-4888-9960-e3d2ac4e7b05
VITE_CHECKWX_API_KEY=your_key_here
VITE_FLIGHTAWARE_API_KEY=U2O5xLTAQM7Fj6omQby0IJl5RnA04YNv
VITE_AVIATIONSTACK_API_KEY=your_key_here
VITE_OPENROUTER_API_KEY=your_key_here
```

## Cost

Everything remains free:
- **Railway**: 500 hours/month free tier
- **FlightAware**: 10,000 requests/month free
- **Wikimedia Commons**: Unlimited, free
- **Vercel**: Unlimited deployments

---

**After completing these steps, your full fallback system will be live!** 🚀
