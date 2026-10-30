# Loom Walkthrough Script & Presentation Guide (5–10 Minutes)

This document provides a scene-by-scene script, demonstration plan, and talking points for recording the **5–10 minute Loom walkthrough** required by the assessment specification.

---

## Walkthrough Outline & Timing

| Section | Timestamp | Focus Topic | Key Demonstration |
|---|---|---|---|
| **1. Introduction & Overview** | 0:00 – 1:00 | Problem statement, architecture, tech stack | High-level system overview & UI layout |
| **2. Interactive Demo: Chicago → Denver** | 1:00 – 3:00 | Generating 3 routes, 25-mi sampling, load rule escalation | Heavy load (42,000 lb) escalating wind risk |
| **3. Corridor Weather Heatmap & 0-48h Slider** | 3:00 – 5:00 | Corridor spatial mesh & forecast slider | Live scrubbing, animated playback, metric switches |
| **4. Risk Engine & Recommendation Logic** | 5:00 – 7:00 | 4-tier preference hierarchy & threshold rules | Backend code walk & unit test execution |
| **5. Code Quality, Tests & Docker Deployment** | 7:00 – 8:30 | Tests, Docker compose, architecture summary | `pytest` test suite run, Docker deployment |

---

## Detailed Scene-by-Scene Script

### Scene 1: Introduction & Architecture (0:00 – 1:00)
**Visual:** Browser showing Spotter application dashboard in full screen.
- **Presenter:**
  > *"Hello everyone! Today I'm excited to present my submission for the Spotter Full Stack Developer assessment: **Weather-Aware Truck Routing**.*
  >
  > *For commercial freight operators, adverse weather causes costly delays and severe rollover accidents. The goal of this application is to give truck dispatchers and drivers immediate, data-backed route recommendations that balance travel time against hazardous weather conditions—taking the truck's cargo weight directly into account.*
  >
  > *For the tech stack, I chose **Django 5 with Django REST Framework** on the backend for clean architecture, mathematical risk precision, and deterministic testing. On the frontend, I used **React with TypeScript, Tailwind CSS, and Leaflet** for 60fps rendering of routes, checkpoint markers, and interactive corridor heatmaps."*

---

### Scene 2: Interactive Demo — Chicago to Denver (1:00 – 3:00)
**Visual:** Form input, selecting "Chicago, IL → Denver, CO", setting weight to 42,000 lbs.
- **Presenter:**
  > *"Let's look at a realistic logistics route: **Chicago, IL to Denver, CO**.*
  >
  > *Notice the inputs required by the prompt:*
  > 1. *Origin and destination with geocoding autocomplete*
  > 2. *Departure date & time*
  > 3. *Truck load weight (we'll set it to 42,000 lbs—a standard loaded semi)*
  > 4. *Configurable checkpoint sampling frequency: 10, 25, or 50 miles.*
  >
  > *When I click 'Calculate 3 Safe Routes', the backend queries the routing engine to produce 3 distinct driving corridors:*
  > - **Route 1:** *Primary I-80 corridor (Fastest, 990 miles, ~15 hours)*
  > - **Route 2:** *Northern bypass through Iowa and Nebraska*
  > - **Route 3:** *Southern scenic bypass.*
  >
  > *At each 25-mile milestone, our engine interpolates the truck's cumulative driving time and queries Open-Meteo for the forecast at that exact arrival hour. Notice how the truck's weight dynamically triggers safety rules: because our load is 42,000 lbs (>40,000 lbs), any crosswinds between 35 and 44 mph are automatically escalated from High to Severe, warning the driver of rollover hazards."*

---

### Scene 3: Corridor Weather Heatmap & 0–48 Hour Forecast Slider (3:00 – 5:00)
**Visual:** Scrubbing the 0–48 hour slider at the bottom of the map, clicking Play/Pause, and toggling metrics.
- **Presenter:**
  > *"Now let's examine the weather heatmap along the trip corridor with the 0–48 hour forecast slider—a core evaluation requirement.*
  >
  > *Along all three routes, our corridor service constructs a spatial buffer mesh and pre-fetches hourly forecast vectors. Because the temporal array is cached in memory, sliding from hour 0 to hour 48 is instant and silky-smooth with zero network lag.*
  >
  > *Watch what happens as I press the 'Play' button: the map animates like a live weather radar, showing incoming cold fronts and wind shifts over the next 48 hours.*
  >
  > *We can also switch the heatmap view between:*
  > - **Truck Composite Risk** *(accounting for cargo weight)*
  > - **Wind Speed** *(mph)*
  > - **Precipitation / Rain** *(in/hr)*
  > - **Snowfall** *(in/hr)*
  >
  > *Clicking on any circular checkpoint marker on the map opens a rich telemetry popup showing the milestone distance, vehicle ETA, exact weather values, and specific hazard explanations."*

---

### Scene 4: Risk Rules & Recommendation Engine Deep-Dive (5:00 – 7:00)
**Visual:** Switching to code in IDE: `routing/services/risk_service.py` and `recommendation_service.py`.
- **Presenter:**
  > *"Let's look under the hood at how the risk and recommendation logic is implemented.*
  >
  > *The PDF specifies exact threshold tables for Wind, Rain, and Snow, plus load rules:*
  > 1. *Wind ≥ 55 mph triggers No Travel for any load.*
  > 2. *Wind 45–54 mph with load > 30,000 lb escalates from Severe to No Travel.*
  > 3. *Wind 35–44 mph with load > 40,000 lb escalates from High to Severe.*
  >
  > *For route recommendation, the prompt defines a strict 4-tier preference hierarchy:*
  > 1. **Fewest Severe miles** *(including No-Travel conditions)*
  > 2. **Fewest High miles**
  > 3. **Lowest average risk score**
  > 4. **Shortest travel time**
  >
  > *Our recommendation engine sorts routes using this exact tuple key: `(severe_and_worse_miles, high_miles, avg_risk, duration_seconds)`. This guarantees that safety always takes precedence over speed."*

---

### Scene 5: Test Suite, Docker & Production Readiness (7:00 – 8:30)
**Visual:** Terminal showing `pytest` running with 21 passed tests, and `docker-compose.yml`.
- **Presenter:**
  > *"Code quality and testability are first-class citizens in this project.*
  >
  > *Running `pytest` executes 21 automated unit and integration tests covering:*
  > - *Every threshold boundary for wind, rain, and snow*
  > - *All three load weight rules and escalations*
  > - *Great-circle geodesic distance calculation and sampling at 10, 25, 50 miles*
  > - *The 4-tier recommendation hierarchy sorting*
  > - *API endpoints, validation, and error states.*
  >
  > *For deployment, the project includes multi-stage Dockerfiles and a `docker-compose.yml` file. With a single command: `docker-compose up --build`, both the Django backend and Nginx-powered React frontend spin up and connect seamlessly.*
  >
  > *Thank you for your time, and I look forward to your feedback!"*

---

## Pre-Recording Checklist

- [ ] Backend running on `http://localhost:8000`
- [ ] Frontend running on `http://localhost:5173`
- [ ] Browser window zoomed to 100% or 110% with dark theme enabled
- [ ] Test the "Play / Pause" radar animation button
- [ ] Have terminal open with `pytest` ready to execute
- [ ] Have code open at `routing/services/risk_service.py` and `routing/services/recommendation_service.py`
