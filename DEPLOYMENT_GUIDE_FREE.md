# 🚀 Guía de Despliegue 100% Gratuito y 24/7 Activo ($0 USD)

Esta guía te permite desplegar la aplicación completa en menos de 5 minutos, **sin costo ($0)**, **sin necesidad de ingresar tarjeta de crédito**, y con el backend **despierto las 24 horas del día (0 segundos de espera o cold-start)**.

---

## 🏗️ Arquitectura de la Solución

- **Frontend:** [Vercel](https://vercel.com) (Hobby Plan - $0, CDN global ultrarrápido, 0s de retraso).
- **Backend:** [Render](https://render.com) (Free Web Service - $0, Python 3 + Gunicorn + WhiteNoise).
- **Keep-Alive 24/7:** [UptimeRobot](https://uptimerobot.com) (Monitor gratuito - $0, ping cada 10 min a `/api/health/`).

---

## Paso 1: Subir el Proyecto a GitHub (1 minuto)

1. Ve a [github.com/new](https://github.com/new) y crea un nuevo repositorio público (ej: `spotter-weather-truck-routing`).
2. En tu terminal, dentro de la carpeta `proyectito`, ejecuta:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/spotter-weather-truck-routing.git
   git branch -M main
   git push -u origin main
   ```

---

## Paso 2: Desplegar el Backend en Render (2 minutos)

1. Entra en [dashboard.render.com](https://dashboard.render.com/) e inicia sesión con tu cuenta de GitHub (gratis, sin tarjeta).
2. Haz clic en **New +** ➔ **Web Service**.
3. Selecciona tu repositorio `spotter-weather-truck-routing`.
4. Rellena los campos con estos valores:
   - **Name:** `spotter-truck-backend` (o el nombre que elijas)
   - **Root Directory:** `backend`
   - **Language / Environment:** `Python 3`
   - **Region:** `Ohio (US East)` u `Oregon (US West)`
   - **Branch:** `main`
   - **Build Command:**
     ```bash
     pip install -r requirements.txt && python manage.py migrate --noinput && python manage.py collectstatic --noinput
     ```
   - **Start Command:**
     ```bash
     gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120
     ```
   - **Instance Type:** Selecciona **Free** ($0/month).
5. Despliega la sección **Advanced** / **Environment Variables** y agrega:
   | Key | Value |
   |---|---|
   | `DEBUG` | `False` |
   | `DJANGO_SECRET_KEY` | `spotter-prod-secure-weather-routing-2026-key` |
6. En **Health Check Path**, escribe: `/api/health/`.
7. Haz clic en **Create Web Service**.
   - En ~2 minutos tu backend estará en línea con una URL como:
     `https://spotter-truck-backend.onrender.com`
   - Para verificarlo, abre en tu navegador:
     `https://spotter-truck-backend.onrender.com/api/health/`
     (Debe responder: `{"status": "ok", "service": "weather-aware-truck-routing", "version": "1.0.0"}`)

---

## Paso 3: Desplegar el Frontend en Vercel (1 minuto)

1. Entra en [vercel.com](https://vercel.com/) e inicia sesión con tu GitHub (gratis, sin tarjeta).
2. Haz clic en **Add New...** ➔ **Project**.
3. Importa el repositorio `spotter-weather-truck-routing`.
4. Configura el proyecto:
   - **Root Directory:** Haz clic en *Edit* y selecciona la carpeta **`frontend`**.
   - **Framework Preset:** `Vite` (se detectará automáticamente).
   - En **Environment Variables**, agrega:
     | Name | Value |
     |---|---|
     | `VITE_API_URL` | `https://spotter-truck-backend.onrender.com/api` |
     *(Reemplaza con la URL generada por Render en el Paso 2, agregando `/api` al final)*.
5. Haz clic en **Deploy**.
   - En ~40 segundos Vercel te entregará tu URL pública:
     `https://spotter-weather-truck-routing.vercel.app`

---

## Paso 4: Eliminar el Cold-Start con UptimeRobot (1 minuto)

> [!TIP]
> Render suspende los contenedores gratuitos tras 15 minutos de inactividad. Sin embargo, Render regala **750 horas de servidor al mes** y un mes completo tiene solo **744 horas**. Si el servidor recibe un ping cada 10 minutos, **NUNCA SE APAGA** y responde al instante todo el mes.

1. Ve a [uptimerobot.com](https://uptimerobot.com/) y crea una cuenta gratuita (con tu email o Google).
2. Haz clic en **+ Add New Monitor**.
3. Configura el monitor:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Spotter Truck Backend Keep-Alive`
   - **URL (or IP):** `https://spotter-truck-backend.onrender.com/api/health/`
   - **Monitoring Interval:** `10 minutes` (o 5 minutes).
4. Haz clic en **Create Monitor**.

🎉 **¡Listo!** A partir de este momento:
- Tu backend recibirá un ping liviano cada 10 minutos.
- Estará activo las **24 horas del día, los 7 días de la semana**.
- Cuando el evaluador abra tu enlace de Vercel, el cálculo de rutas responderá **de inmediato en menos de 1 segundo**, exactamente igual que un plan pago de $50/mes.

---

## Verificación Final de la Entrega

1. Abre tu URL de Vercel en modo incógnito.
2. Ingresa `Chicago, IL` a `Denver, CO` con `42,000 lbs`.
3. Presiona **"Buscar y Calcular 3 Rutas Seguras"**.
4. Verifica que:
   - Se calculen las 3 rutas sobre autopistas reales.
   - Los checkpoints aparezcan en verde/ámbar/rojo con su riesgo ETA.
   - El slider de pronóstico 0–48h anime el heatmap fluidamente en pasos de 15 min.
   - La tarjeta de recomendación justifique la ruta ganadora.
