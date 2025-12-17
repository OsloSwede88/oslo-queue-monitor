# Deployment Guide

This guide will help you deploy the Oslo Airport Queue Monitor to Vercel (frontend) and Railway (backend) to get HTTPS support for iOS notifications.

## Prerequisites

- GitHub account
- Vercel account (free): https://vercel.com/signup
- Railway account (free): https://railway.app/
- Git installed

## Step 1: Prepare the Code

First, initialize a git repository:

```bash
cd /Users/eliaslovvik/Documents/Q
git init
git add .
git commit -m "Initial commit: Oslo Airport Queue Monitor"
```

Push to GitHub:

```bash
# Create a new repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/oslo-queue-monitor.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Railway

1. **Go to Railway**: https://railway.app/
2. **Sign in** with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your `oslo-queue-monitor` repository
6. Railway will detect the project

### Configure Backend:

1. Click on the deployed service
2. Go to **Settings** tab
3. Set **Root Directory** to: `backend`
4. Go to **Variables** tab and add:
   ```
   PORT=3001
   ```
5. Railway will automatically deploy

### Get Backend URL:

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `https://oslo-queue-backend-production.up.railway.app`)

## Step 3: Deploy Frontend to Vercel

1. **Go to Vercel**: https://vercel.com/
2. **Sign in** with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import your `oslo-queue-monitor` repository
5. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Add Environment Variable:

1. Before deploying, go to **Environment Variables**
2. Add:
   ```
   VITE_API_URL=https://your-railway-backend-url.up.railway.app
   ```
   (Use the URL from Step 2)
3. Click **"Deploy"**

## Step 4: Get Your App URL

After Vercel finishes deploying:

1. You'll get a URL like: `https://oslo-queue-monitor.vercel.app`
2. **This is your production URL with HTTPS!**

## Step 5: Use on iPhone

1. On your iPhone, open Safari
2. Go to your Vercel URL: `https://oslo-queue-monitor.vercel.app`
3. Tap **Share** (📤) → **"Add to Home Screen"**
4. Close Safari
5. Open the app from your home screen icon
6. Tap **"Enable Notifications"**
7. **Notifications will now work!** ✅

## Troubleshooting

### Backend not scraping:
- Check Railway logs: Click on service → **Deployments** → Latest deployment → **View Logs**
- Ensure Playwright installed: Check logs for "Browser downloaded" message

### Frontend can't connect to backend:
- Verify `VITE_API_URL` in Vercel environment variables
- Check that Railway backend URL is public (should have generated domain)
- Redeploy frontend after changing environment variables

### Notifications still not working:
- Ensure you're using the Vercel HTTPS URL (not localhost)
- Make sure you installed the PWA from home screen
- Check iOS Settings → Safari → Advanced → Experimental Features → ensure notifications are allowed

## Cost

Both services are **free** for hobby projects:
- **Railway**: 500 hours/month free
- **Vercel**: Unlimited deployments

## Updating the App

To deploy updates:

```bash
git add .
git commit -m "Update: description of changes"
git push
```

Both Railway and Vercel will automatically redeploy!

## Environment Variables Reference

### Backend (Railway)
```env
PORT=3001  # Optional, Railway will provide if not set
```

### Frontend (Vercel)
```env
VITE_API_URL=https://your-railway-backend-url.up.railway.app
```

## Alternative: Quick Deploy Buttons

You can also use these one-click deploy buttons:

### Backend to Railway:
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/YOUR_USERNAME/oslo-queue-monitor&rootDirectory=backend)

### Frontend to Vercel:
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/oslo-queue-monitor&root-directory=frontend&env=VITE_API_URL)

---

**Need help?** Check the logs in Railway and Vercel for error messages.
