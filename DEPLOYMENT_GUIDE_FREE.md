# 🚀 100% Free & 24/7 Always-On Cloud Deployment Guide ($0 USD)

This guide walks you through deploying the complete application in under 5 minutes, **with $0 cost**, **no credit card required**, and with the backend **kept alive 24/7 (zero seconds cold-start delay)**.

---

## 🏗️ Architecture Overview

- **Frontend:** [Vercel](https://vercel.com) (Hobby Plan - $0, ultra-fast global CDN edge network, 0s delay).
- **Backend:** [Render](https://render.com) (Free Web Service - $0, Python 3 + Gunicorn WSGI + WhiteNoise static compression).
- **Keep-Alive 24/7:** [UptimeRobot](https://uptimerobot.com) (Free Monitor - $0, automated HTTP ping every 10 min to `/api/health/`).

---

## Step 1: Push Project to GitHub (1 minute)

1. Go to [github.com/new](https://github.com/new) and create a new public repository (e.g., `spotter-weather-truck-routing`).
2. In your terminal inside the `proyectito` folder, run:
   ```bash
   git remote add origin https://github.com/<your-username>/spotter-weather-truck-routing.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Deploy Backend on Render (2 minutes)

1. Go to [dashboard.render.com](https://dashboard.render.com/) and log in with your GitHub account (free, no credit card required).
2. Click **New +** ➔ **Web Service**.
3. Select your repository `spotter-weather-truck-routing`.
4. Configure the service settings:
   - **Name:** `spotter-truck-backend` (or your preferred name)
   - **Root Directory:** `backend`
   - **Language / Environment:** `Python 3`
   - **Region:** `Ohio (US East)` or `Oregon (US West)`
   - **Branch:** `main`
   - **Build Command:**
     ```bash
     pip install -r requirements.txt && python manage.py migrate --noinput && python manage.py collectstatic --noinput
     ```
   - **Start Command:**
     ```bash
     gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120
     ```
   - **Instance Type:** Select **Free** ($0/month).
5. Open the **Advanced** / **Environment Variables** section and add:
   | Key | Value |
   |---|---|
   | `DEBUG` | `False` |
   | `DJANGO_SECRET_KEY` | `spotter-prod-secure-weather-routing-2026-key` |
6. In **Health Check Path**, enter: `/api/health/`.
7. Click **Create Web Service**.
   - Within ~2 minutes your backend will be live with a URL like:
     `https://spotter-truck-backend.onrender.com`
   - To verify it, open in your browser:
     `https://spotter-truck-backend.onrender.com/api/health/`
     (Should return: `{"status": "ok", "service": "weather-aware-truck-routing", "version": "1.0.0"}`)

---

## Step 3: Deploy Frontend on Vercel (1 minute)

1. Go to [vercel.com](https://vercel.com/) and log in with your GitHub account (free, no credit card required).
2. Click **Add New...** ➔ **Project**.
3. Import your repository `spotter-weather-truck-routing`.
4. Configure project settings:
   - **Root Directory:** Click *Edit* and select the **`frontend`** folder.
   - **Framework Preset:** `Vite` (detected automatically).
   - In **Environment Variables**, add:
     | Name | Value |
     |---|---|
     | `VITE_API_URL` | `https://spotter-truck-backend.onrender.com/api` |
     *(Replace with your live Render backend URL from Step 2, appending `/api` at the end)*.
5. Click **Deploy**.
   - Within ~40 seconds Vercel will provide your live public URL:
     `https://spotter-weather-truck-routing.vercel.app`

---

## Step 4: Eliminate Cold-Start with UptimeRobot (1 minute)

> [!TIP]
> Render suspends free containers after 15 minutes of inactivity. However, Render provides **750 free compute hours per month**, while an entire calendar month has only **744 hours**. By sending a lightweight HTTP ping every 10 minutes, the container **NEVER GOES TO SLEEP** and answers requests instantaneously all month long.

1. Go to [uptimerobot.com](https://uptimerobot.com/) and create a free account (with your email or Google).
2. Click **+ Add New Monitor**.
3. Configure the monitor:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Spotter Truck Backend Keep-Alive`
   - **URL (or IP):** `https://spotter-truck-backend.onrender.com/api/health/`
   - **Monitoring Interval:** `10 minutes` (or 5 minutes).
4. Click **Create Monitor**.

🎉 **You are all set!**
- Your backend receives a lightweight ping every 10 minutes.
- It stays active **24 hours a day, 7 days a week**.
- When an evaluator opens your Vercel URL, route calculations respond **instantaneously in under 1 second**, identical to a $50/month paid server plan.

---

## Final Verification Checklist

1. Open your public Vercel URL in an incognito browser window.
2. Enter `Chicago, IL` to `Denver, CO` with `42,000 lbs`.
3. Click **"Search & Calculate 3 Safe Routes"**.
4. Verify that:
   - 3 routes are generated along physical highways.
   - Checkpoint markers display green/amber/red risk according to arrival ETA.
   - The 0–48h forecast slider animates the heatmap smoothly in 15-minute steps.
   - The recommendation card clearly justifies the winning route based on the 4-tier preference hierarchy.
