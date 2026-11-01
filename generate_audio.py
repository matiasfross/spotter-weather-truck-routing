"""Generate neural TTS audio narration for the Spotter Loom Walkthrough."""
import asyncio
import os
import subprocess
from pathlib import Path
import edge_tts

AUDIO_DIR = Path(__file__).parent / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICE = "en-US-ChristopherNeural"
RATE = "+0%"
FFMPEG_BIN = r"C:\ffmpeg\ffmpeg-8.1.2-essentials_build\bin\ffmpeg.exe"
FFPROBE_BIN = r"C:\ffmpeg\ffmpeg-8.1.2-essentials_build\bin\ffprobe.exe"

SCENES = [
    {
        "id": 1,
        "name": "scene1_intro_and_rules",
        "text": (
            "Hello everyone! "
            "Today I'm excited to present my submission for the Spotter Full Stack Developer assessment: "
            "Weather-Aware Commercial Truck Routing. "
            "For commercial trucking fleets, severe weather is not just a nuisance—it is the leading cause of dangerous rollover accidents, missed delivery deadlines, and freight losses. "
            "Standard GPS navigation focuses purely on speed or the shortest distance, completely unaware of incoming blizzards, strong crosswinds, or heavy rainfall. "
            "This application solves that problem. It gives dispatchers and commercial drivers real-time, weather-aware route evaluations that factor in the truck's exact cargo weight to actively prevent rollover hazards. "
            "Before we calculate a route, let's look at the Risk Rules Reference right here in our navigation bar. "
            "This modal reflects the exact specification from Spotter's assessment document. "
            "For Wind: Under 25 miles per hour is Low, 25 to 34 is Moderate, 35 to 44 is High, 45 to 54 is Severe, and 55 plus is No Travel. "
            "For Rain and Snow: Over 1.0 inch per hour of rain or over 3.0 inches per hour of snow triggers mandatory No Travel. "
            "And here are the Truck Load Rules: For trucks over 30,000 pounds, severe winds become No Travel; and for loads over 40,000 pounds, crosswinds between 35 and 44 miles per hour are escalated to Severe. "
            "Let's close this modal and run a calculation."
        ),
    },
    {
        "id": 2,
        "name": "scene2_inputs_and_heavy_load",
        "text": (
            "Let's test this with a major freight corridor: Chicago, Illinois to Denver, Colorado. "
            "Here we provide all required inputs: Origin and destination with instant geocoding autocomplete, departure date and time, and milestone sampling frequency—10, 25, or 50 miles. "
            "Now, watch what happens when I adjust our cargo weight to 42,000 pounds—a typical loaded 53-foot semi-trailer. "
            "The interface immediately displays an active load rule indicator: Because our cargo exceeds 40,000 pounds, our engine will automatically escalate crosswinds between 35 and 44 miles per hour from High to Severe, directly protecting the driver from dangerous rollover conditions. "
            "Now, let's click Search and Calculate 3 Safe Routes."
        ),
    },
    {
        "id": 3,
        "name": "scene3_routes_and_recommendation",
        "text": (
            "The engine has generated three physically distinct commercial driving corridors across the Midwest: "
            "Route 1: The primary Interstate 80 corridor through Iowa and Nebraska. "
            "Route 2: A northern route via I-90 and I-29. "
            "Route 3: A southern bypass via I-70. "
            "Notice our Safety Recommendation Analysis banner at the top. "
            "Spotter's prompt defines a strict 4-tier preference hierarchy: "
            "First: Fewest Severe miles, including No-Travel conditions. "
            "Second: Fewest High-risk miles. "
            "Third: Lowest average trip risk score. "
            "Fourth: Shortest travel duration. "
            "Even if an alternate route were slightly faster, our engine never compromises safety: Route 1 is recommended because it contains the fewest hazardous severe miles across the Plains. "
            "Each card displays total miles broken down by severity: Low, Moderate, High, and Severe."
        ),
    },
    {
        "id": 4,
        "name": "scene4_map_timelapse_radar",
        "text": (
            "Now let's examine the interactive corridor weather map. "
            "The active route is highlighted in vibrant cyan, while alternate routes are rendered with high-contrast casings. We can switch active routes at any time by clicking directly on an alternate line or card. "
            "In the top-left map controls, we can switch between HD Dark, Satellite, and Esri Dark Gray basemaps. "
            "Each circular marker along the highway represents a scheduled milestone. Their colors are static and show the exact risk at the time the truck is scheduled to arrive at that mile. "
            "Now, look below the map at our 0 to 48-Hour Forecast Slider with smooth 15-minute fine increments. "
            "Let's press Play. "
            "Our animated truck beacon begins traveling along the highway, drawing an electric cyan path of traveled miles and displaying elapsed time and remaining distance. "
            "Simultaneously, the corridor heatmap underneath evolves smoothly in real time. We interpolate weather values continuously between hours, delivering silky-smooth 60 frames per second transitions without page lag or flickering. "
            "We can toggle the heatmap layer between Truck Composite Risk, Wind Speed, Precipitation, and Snowfall. "
            "We also added a Live Doppler Radar layer, streamed securely through our backend proxy to provide real-time precipitation radar with zero client-side secrets. "
            "Now, let's inspect an individual checkpoint."
        ),
    },
    {
        "id": 5,
        "name": "scene5_checkpoint_itinerary_closing",
        "text": (
            "When I click this checkpoint marker, notice two crucial behaviors: "
            "First, the map camera stays 100% frozen and stable—there are no disruptive auto-panning shifts or involuntary zoom resets. "
            "Second, our truck beacon and slider instantly jump to that checkpoint's exact arrival ETA. "
            "The rich popup displays milestone distance, scheduled arrival time, temperature, wind speed, rain rate, and the exact Spotter safety rule applied—such as our heavy load rule escalating crosswinds to Severe. "
            "Now let's scroll down to the Checkpoint Itinerary. "
            "For dispatchers conducting safety audits, this itinerary table lists every sampled stop. With one click on Hazards Only, the table instantly filters out calm miles, highlighting only checkpoints with wind or precipitation alerts. "
            "To summarize: "
            "We generate 3 physical commercial corridors with multi-frequency sampling. "
            "We strictly enforce Spotter's risk matrices and cargo weight rollover rules. "
            "We deliver a silky-smooth 60 frames per second interactive map with a 15-minute animated truck simulation and live radar. "
            "And the platform is fully production-hardened with Django 6 REST Framework, React 19, TypeScript, and 26 automated tests. "
            "Thank you very much for your time and review. I look forward to your feedback!"
        ),
    },
]

async def generate_scene_audio(scene):
    out_file = AUDIO_DIR / f"{scene['name']}.mp3"
    print(f"Generating audio for Scene {scene['id']} -> {out_file.name}...")
    communicate = edge_tts.Communicate(scene["text"], voice=VOICE, rate=RATE)
    await communicate.save(str(out_file))
    
    # Get exact duration with ffprobe
    cmd = [
        FFPROBE_BIN,
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(out_file)
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    duration = float(res.stdout.strip())
    print(f"  -> Duration: {duration:.2f}s ({duration/60:.2f} min)")
    return str(out_file), duration

async def main():
    durations = {}
    total_sec = 0.0
    file_list = []
    
    for scene in SCENES:
        path, dur = await generate_scene_audio(scene)
        durations[scene["id"]] = {
            "name": scene["name"],
            "path": path,
            "duration": dur
        }
        total_sec += dur
        file_list.append(path)
        
    print(f"\nAll scenes generated! Total narration length: {total_sec:.2f}s ({total_sec/60:.2f} min)")
    
    # Combine into single full narration file with a small 1s silence between scenes
    concat_txt = AUDIO_DIR / "concat_list.txt"
    with open(concat_txt, "w", encoding="utf-8") as f:
        for p in file_list:
            f.write(f"file '{p.replace('\\', '/')}'\n")
            
    full_audio = AUDIO_DIR / "full_narration.mp3"
    concat_cmd = [
        FFMPEG_BIN,
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_txt),
        "-c", "copy",
        str(full_audio)
    ]
    subprocess.run(concat_cmd, check=True)
    print(f"Combined full narration audio created at: {full_audio}")
    
    # Save scene durations json for playwright sync
    import json
    timing_file = AUDIO_DIR / "timing.json"
    with open(timing_file, "w", encoding="utf-8") as f:
        json.dump(durations, f, indent=2)
    print(f"Saved timing metadata to: {timing_file}")

if __name__ == "__main__":
    asyncio.run(main())
