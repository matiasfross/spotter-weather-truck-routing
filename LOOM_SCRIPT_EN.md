# Loom Teleprompter Script (English)

> **Estimated Time:** 6:45 – 7:15 minutes  
> **Target Pacing:** ~130 words per minute  
> **Format:** Short lines optimized for teleprompter scrolling or reading beside the webcam.

---

## SCENE 1: INTRODUCTION & ARCHITECTURE (0:00 – 1:00)

**[VISUAL: App dashboard open on screen in dark mode. Camera bubble bottom-left.]**

Hello everyone!

Today I'm excited to present my submission
for the Spotter Full Stack Developer assessment:
Weather-Aware Commercial Truck Routing.

For commercial trucking fleets,
adverse weather is not just a nuisance—
it is the leading cause of dangerous rollover crashes,
missed delivery deadlines, and freight losses.

Standard GPS navigators focus only on speed
or the shortest distance,
completely unaware of crosswinds,
blizzards, or heavy downpours.

This application solves that problem.
It provides dispatchers and drivers with real-time,
weather-aware route evaluations
that directly incorporate the truck's cargo weight.

For the architecture:
On the backend, I built a modular REST API
using Django 6 and Django REST Framework in Python 3.13,
focusing on deterministic, testable risk calculation services.

On the frontend, I used React 19 with TypeScript,
Tailwind CSS, and Leaflet,
delivering 60 frames-per-second interactive mapping,
continuous heatmap interpolation,
and real-time trip simulation.

---

## SCENE 2: LIVE DEMO & CARGO LOAD RULES (1:00 – 2:30)

**[ACTION: Type "Chicago, IL" into Origin, select from autocomplete. Type "Denver, CO" into Destination.]**

Let's demonstrate this with a real-world freight corridor:
Chicago, Illinois to Denver, Colorado.

Here we provide all the required inputs:
Origin and destination with instant geocoding autocomplete,
departure date and time,
and milestone sampling frequency—10, 25, or 50 miles.

**[ACTION: Drag the Cargo Weight slider to 42,000 lbs. Point to the amber alert badge below.]**

Now, look at the Cargo Weight slider.
I'll set it to 42,000 pounds—
a typical loaded semi-trailer.

Notice the safety rule indicator immediately updates:
Because our cargo exceeds 40,000 pounds,
any crosswinds between 35 and 44 miles per hour
will be escalated from High to Severe,
directly protecting the driver from high-profile rollovers.

Let's click "Buscar y Calcular 3 Rutas Seguras".

**[ACTION: Click the primary button. Wait ~1-2 seconds for routes to render.]**

The engine queries OSRM to generate three physically distinct
commercial highway corridors across the Midwest:
Route 1: The primary Interstate 80 corridor.
Route 2: A northern route via I-90 and I-29.
Route 3: A southern bypass via I-70.

Notice our Safety Recommendation Banner:
Our algorithm evaluated all hazards
and selected Route 1 because it contains
the fewest Severe and No-Travel miles,
proving that safety always takes precedence over pure speed.

---

## SCENE 3: HEATMAP, TIMELAPSE & RADAR (2:30 – 4:15)

**[ACTION: Scroll to the interactive map. Highlight the cyan route and milestone pins.]**

Now, let's explore the interactive corridor map.

Each circular marker represents a scheduled milestone along the route.
Their colors are static and show the exact risk
at the time the truck is scheduled to arrive at that mile.

Below the map, we have our 0 to 48-hour forecast slider
with smooth 15-minute fine increments.

Watch what happens when I click Play...

**[ACTION: Click Play on the forecast slider.]**

Our animated truck beacon begins traveling along the highway,
drawing an electric cyan path of traveled miles
and showing real-time elapsed time and distance.

At the exact same time,
the corridor heatmap underneath smoothly evolves.
We interpolate weather values continuously between hours,
ensuring silky-smooth 60 FPS transitions without page lag.

We can toggle between:
Truck Composite Risk,
Wind Speed,
Precipitation,
and Snowfall.

**[ACTION: Click the 'Live Radar' button in the top-left map controls.]**

We can also toggle our Live Doppler Radar layer,
proxied securely through our backend without exposing API keys.

Now, watch what happens when I click any checkpoint marker...

**[ACTION: Click a checkpoint marker on the map.]**

Two key things happen:
First, the map camera stays 100% frozen and stable—
no annoying auto-panning or zoom resets.

Second, the truck beacon and forecast slider
instantly jump to that milestone's exact arrival ETA,
and a rich popup displays temperature, wind gusts, rain rate,
and the exact Spotter safety rule triggered.

Below the map, dispatchers also have an itinerary table
with instant hazard filters:
Hazards Only, High, Severe, or No Travel.

---

## SCENE 4: RISK SERVICE & 4-TIER RECOMMENDATION (4:15 – 5:45)

**[ACTION: Switch to VS Code. Open `routing/services/risk_service.py`.]**

Now let's examine the code architecture.

In `risk_service.py`, all evaluations are pure functions
strictly adhering to the assessment specification:

For Wind:
Under 25 mph is Low,
25 to 34 is Moderate,
35 to 44 is High,
45 to 54 is Severe,
and 55 plus is No Travel.

For Rain and Snow:
Over 1.0 inch per hour of rain
or over 3.0 inches per hour of snow
triggers mandatory No Travel.

Here in lines 112 through 130,
we implement the truck weight rules:
Wind above 55 is No Travel for any weight.
Wind 45 to 54 with load over 30,000 pounds becomes No Travel.
And wind 35 to 44 with load over 40,000 pounds becomes Severe.

**[ACTION: Switch to `routing/services/recommendation_service.py`, highlight lines 45–65.]**

Now, in `recommendation_service.py`,
we implement Spotter's exact 4-tier preference hierarchy:
1. Fewest Severe miles (including No-Travel conditions)
2. Fewest High-risk miles
3. Lowest average trip risk score
4. Shortest travel duration

We achieve this cleanly using Python's native tuple comparison:
`(severe_and_worse_miles, high_miles, average_risk_score, duration_seconds)`.

Because Python compares tuples lexicographically from left to right,
safety mathematically dominates travel duration.

---

## SCENE 5: TEST SUITE & PRODUCTION DEPLOYMENT (5:45 – 7:15)

**[ACTION: Switch to terminal and run pytest.]**

Verification and code quality are central to this project.

In the terminal, let's run pytest:

```
pytest proyectito/backend -v
```

**[ACTION: Let tests run and show 26 green PASS rows.]**

All 26 automated unit and integration tests pass cleanly in 7 seconds.
We test:
- Every threshold boundary for wind, rain, and snow,
- All three load weight escalation rules,
- Great-circle geodesic distance sampling at 10, 25, and 50 miles,
- Multi-tier recommendation sorting,
- And API validation and error handling.

On the frontend, `oxlint` and TypeScript build
with zero warnings and zero errors.

For deployment, the app is production-ready with:
- Gunicorn WSGI and WhiteNoise static asset compression,
- Docker containerization,
- And a free 24/7 cloud deployment on Render and Vercel
  with automated health checks.

Thank you very much for your time and review.
I look forward to discussing the architecture further!

---
*(End of recording - ~7 minutes)*
