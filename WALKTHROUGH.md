# Loom Walkthrough Script & Presentation Master Guide (5–10 Minutes)

This document provides a comprehensive, scene-by-scene script, exact screen action cues, and demonstration guidelines for recording the **5–10 minute Loom walkthrough** required by Spotter's official specification (`fs-assessment-spotter.pdf`).

---

## Video Outline & Timing Breakdown (~7 Minutes Total)

```
[0:00 - 1:00] Scene 1: Introduction, Problem Statement & Architecture
[1:00 - 2:30] Scene 2: Live Demo — Inputs, 42k lb Load Rule & 3 Safe Corridors
[2:30 - 4:15] Scene 3: Corridor Heatmap, 15-min Timelapse Truck & Live Doppler Radar
[4:15 - 5:45] Scene 4: Code Deep Dive — Risk Engine & 4-Tier Recommendation Sorting
[5:45 - 7:15] Scene 5: 26 Automated Tests, Production Deployment & Closing
```

| Scene | Duration | Key Talking Points | Visual & Mouse Actions |
|---|:---:|---|---|
| **Scene 1: Introduction** | `0:00 – 1:00` | Problem statement (freight rollover crashes, weather delays), decoupled stack: Django 6 REST Framework + React 19 + TypeScript + Leaflet. | Full-screen app dashboard (dark mode). Camera bubble active in bottom-left. |
| **Scene 2: Interactive Demo** | `1:00 – 2:30` | Origin/Destination autocomplete (`Chicago, IL` → `Denver, CO`), Departure time, **42,000 lbs cargo weight** (escalating 35–44 mph wind to Severe), 25-mi milestone sampling. Generation of 3 distinct highway corridors. | Typing inputs, adjusting weight slider to show dynamic rule trigger, clicking *"Buscar y Calcular 3 Rutas Seguras"*. Reviewing the 3 route cards and safety recommendation banner. |
| **Scene 3: Heatmap, Timelapse & Radar** | `2:30 – 4:15` | Continuous weather interpolation on 0–48h slider, **15-minute fine steps (`0.25h`)**, animated truck beacon with traveled mileage line, Live Doppler Radar simulation proxy, and **checkpoint click jump with frozen map**. | Clicking Play on timelapse, toggling metric switcher (Risk, Wind, Rain, Snow), enabling "Live Radar", clicking a checkpoint to show arrival ETA sync and popup telemetry. |
| **Scene 4: Code Architecture** | `4:15 – 5:45` | Functional separation of concerns: `risk_service.py` (exact wind, rain, snow, and load rules) and `recommendation_service.py` (strict 4-tier sorting: `(severe_miles, high_miles, avg_risk, duration)`). | Switching to VS Code: scrolling through pure evaluation functions, threshold dictionaries, and sorting lambda. |
| **Scene 5: 26 Tests & Deployment** | `5:45 – 7:15` | Running the full 26-test suite in `pytest` (100% pass), production hardening with Gunicorn, WhiteNoise, Vercel SPA rewrites, and 24/7 zero-cost cloud deploy via Render + UptimeRobot. | Terminal running `pytest -v`, showing test results, quick view of `DEPLOYMENT_GUIDE_FREE.md` or GitHub repo, and professional wrap-up. |

---

## Detailed Scene-by-Scene Script with Action Cues

### Scene 1: Introduction & Architecture (`0:00 – 1:00`)

**[VISUAL: Browser showing application dashboard in dark mode with empty form. Webcam bubble visible in corner.]**

> **Presenter:**
> *"Hello everyone! Today I'm excited to present my submission for the Spotter Full Stack Developer assessment: **Weather-Aware Commercial Truck Routing**.*
>
> *For interstate trucking operators, severe weather isn't just an inconvenience—it's the leading cause of catastrophic rollover accidents, missed delivery SLAs, and millions in cargo loss. Standard GPS navigation focuses strictly on speed or shortest distance, completely blind to incoming blizzards, wind gusts, or heavy rainfall.*
>
> *This application bridges that gap. It gives fleet dispatchers and commercial drivers immediate, weather-aware route evaluations that factor in **the truck's exact cargo weight** to prevent rollover hazards.*
>
> *For the tech stack, I implemented a decoupled architecture:*
> *- On the backend: **Django 6 with Django REST Framework** in Python 3.13, using pure mathematical service layers for deterministic risk evaluation.*
> *- On the frontend: **React 19 with TypeScript, Tailwind CSS, and Leaflet** for 60-frames-per-second interactive mapping, continuous heatmap interpolation, and vehicle progress tracking."*

---

### Scene 2: Interactive Demo — Inputs & 3 Safe Highway Corridors (`1:00 – 2:30`)

**[ACTION: Click Origin input, type "Chicago, IL" and select from dropdown. Click Destination, type "Denver, CO" and select from dropdown.]**

> **Presenter:**
> *"Let's test this with a realistic interstate freight corridor: **Chicago, Illinois to Denver, Colorado**.*
>
> *Notice the required inputs from the Spotter specification:*
> 1. *Origin and destination with instant geocoding autocomplete.*
> 2. *Departure date and time.*
> 3. *Configurable checkpoint sampling frequency: 10, 25, or 50 miles.*
> 4. *And crucially, the **Truck Cargo Load Weight**.*

**[ACTION: Move the Cargo Weight slider to 42,000 lbs. Point to the alert badge that appears below it.]**

> **Presenter:**
> *"Watch what happens when I adjust our cargo weight to **42,000 lbs**—a typical loaded 53-foot semi-trailer. The interface immediately indicates that the **Heavy Load Rule** is active: per Spotter's safety specification, any crosswinds between 35 and 44 miles per hour will be automatically escalated from High to **Severe**, warning our driver of heightened rollover danger.*
>
> *Now, let's click **'Buscar y Calcular 3 Rutas Seguras'**."*

**[ACTION: Click the primary button "Buscar y Calcular 3 Rutas Seguras". Wait ~1-2 seconds for calculation.]**

> **Presenter:**
> *"The backend queries OSRM to generate three physically distinct driving corridors across the Midwest:*
> *- **Route 1:** The primary I-80 corridor through Iowa and Nebraska.*
> *- **Route 2:** A northern route via I-90 and I-29.*
> *- **Route 3:** A southern bypass via I-70 through Kansas.*
>
> *Notice our **Safety Recommendation Banner** at the top. The engine doesn't simply pick the fastest trip—it rigorously evaluates all hazards to recommend the route with the **fewest Severe miles**, ensuring cargo and driver safety first."*

---

### Scene 3: Corridor Heatmap, 15-min Timelapse Truck & Live Radar (`2:30 – 4:15`)

**[ACTION: Scroll to the interactive map. Point out the vibrant cyan selected route, origin pin A, and destination pin B.]**

> **Presenter:**
> *"Now let's examine the heart of the user experience: the interactive corridor map.*
>
> *Every checkpoint along the active route is rendered with high-contrast safety styling based on its scheduled vehicle arrival time. These pins stay pinned to their scheduled ETA risk.*
>
> *Below the map, we have the **0–48 Hour Forecast Slider** with fluid **15-minute fine increments** (`0.25 hours`). Notice as I press **Play**..."*

**[ACTION: Click the 'Play' button on the ForecastSlider.]**

> **Presenter:**
> *"Our animated truck beacon advances continuously along the physical highway geometry, drawing an electric cyan traveled path and displaying the elapsed time and remaining mileage.*
>
> *Simultaneously, the corridor heatmap underneath updates smoothly in real time. We implemented continuous linear weather interpolation between forecast hours, so there are no jarring visual jumps or page re-renders.*
>
> *We can switch the heatmap layer between:*
> - ***Truck Composite Risk*** *(combining all hazards and load weight)*
> - ***Wind Speed***
> - ***Precipitation***
> - *And ***Snowfall***.*

**[ACTION: Click the 'Live Radar' toggle button in the top-left map controls.]**

> **Presenter:**
> *"We also added a **Live Doppler Radar layer**, streamed securely through a backend proxy to preserve zero client-side secrets.*
>
> *Now, watch what happens when I click any specific checkpoint marker on the map..."*

**[ACTION: Click a Moderate or Severe checkpoint marker along the route.]**

> **Presenter:**
> *"Notice two critical details:*
> *First, the map camera stays **100% stable and frozen**—no disruptive auto-panning or zoom resets.*
> *Second, our timelapse truck and slider immediately jump to that checkpoint's exact arrival ETA, and a rich telemetry popup displays the milestone, temperature, wind, rain, and the exact Spotter safety rule triggered.*
>
> *Below the map, dispatchers also have an exhaustive itinerary table and mobile cards with instant severity filters: Hazards Only, High, Severe, or No Travel."*

---

### Scene 4: Risk Engine & Recommendation Logic Deep Dive (`4:15 – 5:45`)

**[ACTION: Switch to VS Code. Open `proyectito/backend/routing/services/risk_service.py`.]**

> **Presenter:**
> *"Now let's dive into the backend code to examine how the risk and recommendation logic is implemented.*
>
> *In `risk_service.py`, all evaluations are pure, deterministic functions adhering strictly to the assessment specification:*
>
> 1. ***Wind Thresholds:*** *Under 25 mph is Low, 25 to 34 is Moderate, 35 to 44 is High, 45 to 54 is Severe, and 55 plus is No Travel.*
> 2. ***Rain and Snow:*** *Rain over 1.0 inch per hour or Snow over 3.0 inches per hour triggers mandatory No Travel.*
> 3. ***Load Rules:*** *Lines 112 through 130 implement the truck weight matrix. A wind gust of 46 mph is Severe for an empty trailer, but if the truck weighs over 30,000 lbs, it escalates to No Travel. If wind is 38 mph and cargo exceeds 40,000 lbs, it escalates to Severe.*
>
> *Now let's open `recommendation_service.py`."*

**[ACTION: Open `proyectito/backend/routing/services/recommendation_service.py` and highlight lines 45–65.]**

> **Presenter:**
> *"The Spotter prompt specifies a strict **4-tier preference hierarchy** for selecting the recommended route:*
> 1. *First: **Fewest Severe miles** (including No-Travel conditions)*
> 2. *Second: **Fewest High-risk miles***
> 3. *Third: **Lowest average trip risk score***
> 4. *Fourth: **Shortest travel duration***
>
> *We implement this cleanly using Python's native tuple comparison in our sorting key: `(severe_and_worse_miles, high_miles, average_risk_score, duration_seconds)`. Because Python compares tuples lexicographically from left to right, safety mathematically supersedes trip duration in every scenario."*

---

### Scene 5: Automated Test Suite, Cloud Deploy & Wrap-Up (`5:45 – 7:15`)

**[ACTION: Switch to terminal inside `proyectito/backend` and execute `pytest -v`.]**

```powershell
proyectito/backend/.venv/Scripts/python.exe -m pytest proyectito/backend -v
```

> **Presenter:**
> *"Verification and reliability are built into the foundation of this project.*
>
> *Let's run `pytest -v`. In just 7 seconds, **all 26 automated unit and integration tests** execute and pass with zero warnings:*
> - *We test every threshold boundary for wind, rain, and snow.*
> - *All three load-weight escalation rules.*
> - *Geodesic great-circle distance sampling at 10, 25, and 50 miles.*
> - *Multi-tier recommendation sorting.*
> - *And complete API endpoint serialization and error handling.*
>
> *On the frontend, `oxlint` and TypeScript compile with **zero errors and zero warnings**.*
>
> *Finally, for deployment, the application is production-hardened with **Gunicorn WSGI**, **WhiteNoise** static asset compression, Docker containers, and a free 24/7 deployment architecture on Render and Vercel with UptimeRobot health monitoring.*
>
> *Thank you very much for your time and consideration. I look forward to discussing the architecture further during the interview!"*

---

## Pre-Recording Checklist

Before clicking **Record** on Loom:

- [ ] **Display Setup:** Resolution set to 1080p (1920x1080). Browser zoom at 100%. Dark mode enabled.
- [ ] **Browser Tabs Ready:**
  1. Tab 1: Spotter Web App (`http://localhost:5173` or deployed Vercel URL).
  2. Tab 2: GitHub Repository (`https://github.com/matiasfross/spotter-weather-truck-routing`).
- [ ] **Editor Open (VS Code):**
  - Left pane: `proyectito/backend/routing/services/risk_service.py`
  - Right pane: `proyectito/backend/routing/services/recommendation_service.py`
  - Font size readable (14-16px).
- [ ] **Terminal Open:**
  - Directory: `C:\proyectoRouting\proyectito`
  - Ready command: `proyectito/backend/.venv/Scripts/python.exe -m pytest proyectito/backend -v`
- [ ] **Loom Setup:**
  - Webcam enabled and positioned in lower-left corner (does not obstruct the route form or map controls).
  - Microphone checked (good levels, low background noise).
  - Loom Teleprompter opened with `LOOM_SCRIPT_EN.md` or displayed on secondary screen.
