# Loom Walkthrough Master Guide — 100% Web Application Demo (5–10 Minutes)

This master guide provides a scene-by-scene script, precise mouse actions, and talking points for recording the **5–10 minute Loom walkthrough** required by Spotter's official specification (`fs-assessment-spotter.pdf`).

> **Format:** 100% inside the web browser in full screen. No window-switching to VS Code or terminal required.  
> **Estimated Duration:** ~6 minutes and 30 seconds (sweet spot within the 5–10 minute requirement).  
> **Pacing:** ~130 words per minute (confident, natural, professional English).

---

## Video Outline & Timing Breakdown

```
[0:00 - 1:00] Scene 1: Introduction, Problem Statement & Navbar Risk Rules Modal
[1:00 - 2:15] Scene 2: Interactive Inputs & Heavy Cargo Load Rule (42,000 lbs)
[2:15 - 3:30] Scene 3: 3 Highway Corridors & 4-Tier Safety Recommendation
[3:30 - 5:15] Scene 4: Interactive Map, 15-Min Timelapse Truck & Live Doppler Radar
[5:15 - 6:30] Scene 5: Checkpoint Telemetry, Itinerary Filter & Closing Wrap-Up
```

| Scene | Duration | What You Say (Talking Points) | What You Show & Click On Screen |
|---|:---:|---|---|
| **Scene 1: Introduction & Risk Rules** | `0:00 – 1:00` | Problem statement: Commercial trucking rollover risks from severe weather. System overview. Click "Risk Rules Reference" in navbar to review Spotter's official threshold tables. | Full-screen app dashboard in dark mode. Click the "Risk Rules Reference" button in the top navbar to open the modal; close it after review. |
| **Scene 2: Inputs & Heavy Load Rule** | `1:00 – 2:15` | Origin/Destination autocomplete (`Chicago, IL` → `Denver, CO`), departure date/time, 25-mi milestone sampling. Drag cargo slider to **42,000 lbs** to demonstrate dynamic load rule escalation (escalating 35–44 mph wind from High to Severe). | Type locations, adjust departure time, drag the weight slider to 42,000 lbs pointing out the amber warning indicator that appears below. |
| **Scene 3: 3 Corridors & Recommendation** | `2:15 – 3:30` | Click *"Buscar y Calcular 3 Rutas Seguras"*. Review the 3 physically distinct highway corridors. Explain the **Safety Recommendation Analysis** banner and how the 4-tier preference hierarchy prioritizes fewest Severe miles over travel time. | Click the primary calculate button. Walk through the 3 route cards (I-80, Northern bypass, Southern bypass) and the recommendation banner. |
| **Scene 4: Heatmap, Timelapse & Radar** | `3:30 – 5:15` | Map controls (Mapbox Dark, Satellite, Esri Dark). The 0–48h forecast slider with **15-minute fine steps (`0.25h`)**. Click Play on the timelapse: animated truck beacon with traveled mileage line and continuous weather interpolation. Toggle Live Doppler Radar. | Toggle basemaps, press Play on the timelapse, toggle heatmap metrics (Risk, Wind, Rain, Snow), and enable the "Live Radar" button. |
| **Scene 5: Checkpoints, Itinerary & Closing** | `5:15 – 6:30` | Click a checkpoint marker on the map: show that the **camera stays 100% frozen and stable** (zero auto-pan or zoom jumps), popup telemetry with weather and active rule reasons, and the truck jumping to that arrival ETA. Filter itinerary table by `HAZARDS`. Closing remarks. | Click a checkpoint on the route, inspect the popup, scroll down to the itinerary table, click "Hazards Only", and deliver closing wrap-up. |

---

## Detailed Scene-by-Scene Script with On-Screen Action Cues

### Scene 1: Introduction, Problem Statement & Risk Rules Modal (`0:00 – 1:00`)

**[VISUAL: Full-screen browser displaying the Spotter Web Application in dark mode. Webcam bubble positioned in the lower-left corner.]**

> **Presenter:**
> *"Hello everyone! Today I'm excited to present my submission for the Spotter Full Stack Developer assessment: **Weather-Aware Commercial Truck Routing**.*
>
> *For interstate freight carriers, adverse weather isn't just a minor delay—it is the number one cause of catastrophic rollover crashes, jackknife accidents, and millions of dollars in freight damage. Traditional GPS navigation optimizes purely for shortest distance or speed, completely unaware of incoming blizzards, wind gusts, or heavy rain along the corridor.*
>
> *This application bridges that critical gap. It gives dispatchers and commercial drivers real-time, weather-aware route evaluations that factor in **the truck's exact cargo weight** to protect against rollover hazards.*
>
> *Before we calculate a route, let's take a look at the **Risk Rules Reference** right here in our navigation bar..."*

**[CLICK: Click the "Risk Rules Reference" button in the top-right of the header navbar. The modal opens smoothly.]**

> **Presenter:**
> *"This reference modal reflects the exact specification from Spotter's assessment document:*
> *- **Wind Thresholds:** Under 25 mph is Low, 25 to 34 is Moderate, 35 to 44 is High, 45 to 54 is Severe, and 55 plus is No Travel.*
> *- **Precipitation & Snow:** Rain over 1.0 inch per hour or Snow over 3.0 inches per hour triggers mandatory No Travel.*
> *- And here are the **Truck Load Rules**: For trucks weighing over 30,000 lbs, severe winds become No Travel; and for loads over 40,000 lbs, crosswinds between 35 and 44 mph are escalated to Severe.*
>
> *Let's close this modal and see the engine in action."*

**[CLICK: Close the Risk Rules Reference modal by clicking the X button.]**

---

### Scene 2: Interactive Inputs & Heavy Cargo Load Rule (`1:00 – 2:15`)

**[ACTION: Click the Origin field, type "Chicago, IL" and select it from the geocoding autocomplete. Click Destination, type "Denver, CO" and select it from autocomplete.]**

> **Presenter:**
> *"Let's test this with a major Midwestern freight corridor: **Chicago, Illinois to Denver, Colorado**.*
>
> *Here we provide all the required inputs specified in the rubric:*
> 1. *Origin and destination with instant geocoding autocomplete.*
> 2. *Departure date and time.*
> 3. *Milestone sampling frequency: 10, 25, or 50 miles.*
> 4. *And crucially, the **Cargo Load Weight**.*

**[ACTION: Drag the Cargo Weight slider to 42,000 lbs. Point the mouse to the amber alert banner that dynamically appears below it.]**

> **Presenter:**
> *"Watch what happens when I adjust our cargo weight to **42,000 lbs**—a standard fully loaded 53-foot semi.*
>
> *The interface immediately displays an active load rule indicator: because our cargo exceeds 40,000 lbs, our engine will automatically escalate any crosswinds between 35 and 44 mph from High to **Severe**, warning the driver of dangerous rollover risk on open highways.*
>
> *Now, let's click **'Buscar y Calcular 3 Rutas Seguras'**."*

**[CLICK: Click the primary button "Buscar y Calcular 3 Rutas Seguras". Wait ~1-2 seconds for the calculation to render.]**

---

### Scene 3: 3 Corridors & 4-Tier Safety Recommendation (`2:15 – 3:30`)

**[VISUAL: The results render. Point the mouse to the Safety Recommendation Analysis banner at the top, then down to the 3 route cards.]**

> **Presenter:**
> *"The routing engine has generated three physically distinct driving corridors:*
> *- **Route 1:** The primary Interstate 80 corridor through Iowa and Nebraska (about 990 miles and 15 hours).*
> *- **Route 2:** A northern bypass via I-90 and I-29.*
> *- **Route 3:** A southern bypass via I-70.*
>
> *Notice our **Safety Recommendation Analysis** banner at the top.*
>
> *Spotter's prompt defines a strict **4-tier preference hierarchy** for selecting the recommended route:*
> 1. *First: **Fewest Severe miles** (including No-Travel conditions)*
> 2. *Second: **Fewest High-risk miles***
> 3. *Third: **Lowest average trip risk score***
> 4. *Fourth: **Shortest travel duration***
>
> *Even if an alternate route were slightly shorter in time, our engine will never compromise safety: Route 1 is recommended because it minimizes hazardous severe miles across the Plains.*
>
> *Each route card shows the total miles broken down by severity: Low, Moderate, High, and Severe."*

---

### Scene 4: Interactive Map, 15-Min Timelapse Truck & Live Radar (`3:30 – 5:15`)

**[VISUAL: Scroll smoothly to the map. Point out the vibrant cyan selected route, unselected alternate routes, and the start (A) and destination (B) pins.]**

> **Presenter:**
> *"Now let's examine the interactive corridor weather map.*
>
> *The active route is highlighted in vibrant cyan, while alternate routes are rendered with high-contrast casings. If we want to switch routes, we can simply click an alternate line or card.*
>
> *In the top-left map controls, we can switch between **HD Dark, Satellite, and Esri Dark Gray** basemaps.*
>
> *Each circular marker along the highway represents a scheduled milestone. Notice that their colors are static: they represent the exact forecasted weather risk at the time the truck is scheduled to arrive at that mile.*
>
> *Now, look below the map at our **0 to 48-Hour Forecast Slider** with fluid **15-minute fine increments** (`0.25h`). Let's press **Play**..."*

**[CLICK: Click the 'Play' button on the ForecastSlider.]**

> **Presenter:**
> *"Watch the simulation:*
> *Our animated truck beacon advances continuously along the highway, drawing an electric cyan traveled path and displaying real-time elapsed time and remaining distance.*
>
> *Simultaneously, the corridor heatmap underneath updates dynamically in real time. We implemented continuous linear weather interpolation between hours, ensuring silky-smooth 60 FPS transitions without page lag or flickering.*
>
> *We can switch the heatmap layer between:*
> - ***Truck Composite Risk*** *(combining all hazards and cargo weight)*
> - ***Wind Speed***
> - ***Precipitation***
> - *And ***Snowfall***.*

**[CLICK: Click the 'Live Radar' button in the top-left map controls.]**

> **Presenter:**
> *"We also added a **Live Doppler Radar layer**, streamed securely through our backend proxy to provide real-time precipitation radar without exposing client-side API keys.*
>
> *Now, let's inspect an individual checkpoint along the route..."*

---

### Scene 5: Checkpoint Telemetry, Itinerary & Closing (`5:15 – 6:30`)

**[CLICK: Click on a Moderate, High, or Severe checkpoint marker along the active route.]**

> **Presenter:**
> *"When I click this checkpoint marker, notice two crucial behaviors:*
> *First, the map camera stays **100% frozen and stable**—there are no disruptive auto-panning shifts or involuntary zoom resets.*
> *Second, our truck beacon and slider immediately jump to that checkpoint's exact arrival ETA.*
>
> *The rich popup displays the milestone distance, scheduled arrival time, temperature, wind speed, rain, and the exact Spotter safety rule applied—such as our heavy load rule escalating crosswinds to Severe.*
>
> *Now let's scroll down to the **Checkpoint Itinerary** below the map..."*

**[ACTION: Scroll to the Checkpoint Weather & Risk Itinerary table. Click the "Hazards Only" filter button.]**

> **Presenter:**
> *"For dispatchers conducting safety audits, this itinerary table lists every sampled stop along the route. With one click on **'Hazards Only'**, the table instantly filters out calm miles, highlighting only the checkpoints with wind or precipitation warnings.*
>
> *To summarize:*
> - *We generate 3 physical commercial corridors with multi-frequency sampling.*
> - *We strictly enforce Spotter's risk matrices and cargo weight rollover rules.*
> - *We deliver a silky-smooth 60 FPS interactive map with a 15-minute animated truck simulation and live radar.*
> - *And the platform is fully production-hardened with Django 6 REST Framework, React 19, TypeScript, and 26 automated unit and integration tests.*
>
> *Thank you very much for your time and review. I look forward to your feedback!"*

---

## Pre-Recording Checklist (100% Web App)

Before clicking **Record** on Loom:

- [ ] **Browser Window:**
  - Full-screen mode (F11 or maximized 1080p window).
  - Zoom set to 100%.
  - Dark theme enabled.
  - App loaded at `http://localhost:5173` (or live deployed Vercel URL).
- [ ] **Loom Setup:**
  - Webcam enabled and positioned in lower-left corner (ensuring it doesn't cover the route form or map controls).
  - Microphone audio levels checked and clear.
  - Loom Teleprompter widget opened with `LOOM_SCRIPT_EN.md` or displayed on a secondary monitor.
- [ ] **Test Inputs Ready:**
  - Origin: `Chicago, IL`
  - Destination: `Denver, CO`
  - Cargo Weight: `42,000 lbs`
  - Sampling: `25 miles`
- [ ] **Pre-Click Verification:**
  - Click "Risk Rules Reference" in navbar once to confirm it opens smoothly.
  - Test Play/Pause on the timelapse slider.
  - Click a checkpoint marker to verify popup opens without moving the map.
