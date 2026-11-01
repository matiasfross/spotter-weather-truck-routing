# Loom Teleprompter Script (100% Web Application)

> **Estimated Duration:** ~6:30 minutes  
> **Target Pacing:** ~130 words per minute  
> **Format:** Short lines optimized for teleprompter scrolling or reading beside your webcam.  
> **Location:** 100% inside the web browser. No external windows or code switching required.

---

## SCENE 1: INTRODUCTION & RISK RULES MODAL (0:00 – 1:00)

**[VISUAL: Spotter Web App open on screen in dark mode. Webcam bubble in lower-left.]**

Hello everyone!

Today I'm excited to present my submission
for the Spotter Full Stack Developer assessment:
Weather-Aware Commercial Truck Routing.

For commercial trucking fleets,
severe weather is not just a nuisance—
it is the leading cause of dangerous rollover accidents,
missed delivery deadlines, and freight losses.

Standard GPS navigation focuses purely on speed
or the shortest distance,
completely unaware of incoming blizzards,
strong crosswinds, or heavy rainfall.

This application solves that problem.
It gives dispatchers and commercial drivers real-time,
weather-aware route evaluations
that factor in the truck's exact cargo weight
to actively prevent rollover hazards.

Before we calculate a route,
let's look at the Risk Rules Reference
right here in our navigation bar...

**[CLICK: Click "Risk Rules Reference" in the top-right navbar.]**

This modal reflects the exact specification
from Spotter's assessment document:

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

And here are the Truck Load Rules:
For trucks over 30,000 pounds,
severe winds become No Travel;
and for loads over 40,000 pounds,
crosswinds between 35 and 44 miles per hour
are escalated to Severe.

Let's close this modal and run a calculation.

**[CLICK: Close modal by clicking X.]**

---

## SCENE 2: INTERACTIVE INPUTS & HEAVY LOAD RULE (1:00 – 2:15)

**[ACTION: Click Origin, type "Chicago, IL", select autocomplete. Click Destination, type "Denver, CO", select autocomplete.]**

Let's test this with a major freight corridor:
Chicago, Illinois to Denver, Colorado.

Here we provide all required inputs:
Origin and destination with instant geocoding autocomplete,
departure date and time,
and milestone sampling frequency—10, 25, or 50 miles.

**[ACTION: Drag Cargo Weight slider to 42,000 lbs. Point to the amber warning banner below it.]**

Now, watch what happens when I adjust our cargo weight
to 42,000 pounds—
a typical loaded 53-foot semi-trailer.

The interface immediately displays an active load rule indicator:
Because our cargo exceeds 40,000 pounds,
our engine will automatically escalate
crosswinds between 35 and 44 miles per hour
from High to Severe,
directly protecting the driver from dangerous rollover conditions.

Now, let's click "Buscar y Calcular 3 Rutas Seguras".

**[CLICK: Click the primary button. Wait ~1-2 seconds for routes to render.]**

---

## SCENE 3: 3 HIGHWAY CORRIDORS & RECOMMENDATION (2:15 – 3:30)

**[VISUAL: Point mouse to the Safety Recommendation banner, then to the 3 route cards.]**

The engine has generated three physically distinct
commercial driving corridors across the Midwest:
Route 1: The primary Interstate 80 corridor through Iowa and Nebraska.
Route 2: A northern route via I-90 and I-29.
Route 3: A southern bypass via I-70.

Notice our Safety Recommendation Analysis banner at the top.

Spotter's prompt defines a strict
4-tier preference hierarchy:
First: Fewest Severe miles (including No-Travel conditions).
Second: Fewest High-risk miles.
Third: Lowest average trip risk score.
Fourth: Shortest travel duration.

Even if an alternate route were slightly faster,
our engine never compromises safety:
Route 1 is recommended because it contains
the fewest hazardous severe miles across the Plains.

Each card displays total miles broken down
by severity: Low, Moderate, High, and Severe.

---

## SCENE 4: INTERACTIVE MAP, TIMELAPSE & RADAR (3:30 – 5:15)

**[VISUAL: Scroll smoothly to the map. Point out the cyan selected route and alternate route lines.]**

Now let's examine the interactive corridor weather map.

The active route is highlighted in vibrant cyan,
while alternate routes are rendered with high-contrast casings.
We can switch active routes at any time
by clicking directly on an alternate line or card.

In the top-left map controls,
we can switch between HD Dark, Satellite,
and Esri Dark Gray basemaps.

Each circular marker along the highway
represents a scheduled milestone.
Their colors are static and show the exact risk
at the time the truck is scheduled to arrive at that mile.

Now, look below the map at our 0 to 48-Hour Forecast Slider
with smooth 15-minute fine increments.

Let's press Play...

**[CLICK: Click Play on the forecast slider.]**

Our animated truck beacon begins traveling along the highway,
drawing an electric cyan path of traveled miles
and displaying elapsed time and remaining distance.

Simultaneously, the corridor heatmap underneath
evolves smoothly in real time.
We interpolate weather values continuously between hours,
delivering silky-smooth 60 FPS transitions
without page lag or flickering.

We can toggle the heatmap layer between:
Truck Composite Risk,
Wind Speed,
Precipitation,
and Snowfall.

**[CLICK: Click the 'Live Radar' button in the top-left map controls.]**

We also added a Live Doppler Radar layer,
streamed securely through our backend proxy
to provide real-time precipitation radar
with zero client-side secrets.

Now, let's inspect an individual checkpoint...

---

## SCENE 5: CHECKPOINT TELEMETRY, ITINERARY & CLOSING (5:15 – 6:30)

**[CLICK: Click a Moderate or Severe checkpoint marker along the active route.]**

When I click this checkpoint marker,
notice two crucial behaviors:

First, the map camera stays 100% frozen and stable—
there are no disruptive auto-panning shifts
or involuntary zoom resets.

Second, our truck beacon and slider
instantly jump to that checkpoint's exact arrival ETA.

The rich popup displays milestone distance,
scheduled arrival time, temperature,
wind speed, rain rate,
and the exact Spotter safety rule applied—
such as our heavy load rule escalating crosswinds to Severe.

Now let's scroll down to the Checkpoint Itinerary...

**[ACTION: Scroll to the itinerary table. Click the "Hazards Only" filter button.]**

For dispatchers conducting safety audits,
this itinerary table lists every sampled stop.
With one click on "Hazards Only",
the table instantly filters out calm miles,
highlighting only checkpoints with wind or precipitation alerts.

To summarize:
We generate 3 physical commercial corridors with multi-frequency sampling.
We strictly enforce Spotter's risk matrices and cargo weight rollover rules.
We deliver a silky-smooth 60 FPS interactive map
with a 15-minute animated truck simulation and live radar.
And the platform is fully production-hardened with Django 6 REST Framework,
React 19, TypeScript, and 26 automated tests.

Thank you very much for your time and review.
I look forward to your feedback!

---
*(End of recording - ~6:30 minutes)*
