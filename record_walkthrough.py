"""Automated Playwright browser recording synchronized with neural TTS narration."""
import asyncio
import json
import os
import subprocess
import time
from pathlib import Path
from playwright.async_api import async_playwright

BASE_DIR = Path(__file__).parent
AUDIO_DIR = BASE_DIR / "audio"
RECORDINGS_DIR = BASE_DIR / "recordings"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

TIMING_FILE = AUDIO_DIR / "timing.json"
FULL_AUDIO = AUDIO_DIR / "full_narration.mp3"
OUTPUT_VIDEO = BASE_DIR / "spotter_walkthrough.mp4"
FFMPEG_BIN = r"C:\ffmpeg\ffmpeg-8.1.2-essentials_build\bin\ffmpeg.exe"

async def smooth_mouse_move(page, start_x, start_y, end_x, end_y, steps=25, delay=0.02):
    """Move mouse smoothly across the screen."""
    for i in range(1, steps + 1):
        x = start_x + (end_x - start_x) * (i / steps)
        y = start_y + (end_y - start_y) * (i / steps)
        await page.mouse.move(x, y)
        await asyncio.sleep(delay)

async def record():
    if not TIMING_FILE.exists():
        raise FileNotFoundError(f"Missing {TIMING_FILE}. Run generate_audio.py first.")

    with open(TIMING_FILE, "r", encoding="utf-8") as f:
        timing = json.load(f)

    # Durations from TTS
    d1 = timing["1"]["duration"]  # ~94.4s
    d2 = timing["2"]["duration"]  # ~48.9s
    d3 = timing["3"]["duration"]  # ~60.7s
    d4 = timing["4"]["duration"]  # ~89.9s
    d5 = timing["5"]["duration"]  # ~85.7s
    total_expected = d1 + d2 + d3 + d4 + d5

    print(f"Total narration duration: {total_expected:.2f}s ({total_expected/60:.2f} min)")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--start-maximized",
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ]
        )
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(RECORDINGS_DIR),
            record_video_size={"width": 1920, "height": 1080},
        )
        page = await context.new_page()

        print("Navigating to http://localhost:5173/ ...")
        await page.goto("http://localhost:5173/", wait_until="networkidle")
        await asyncio.sleep(2)

        start_time = time.time()

        # ==========================================
        # SCENE 1: INTRO & RISK RULES MODAL (duration: d1)
        # ==========================================
        s1_start = time.time()
        print(f"--- Starting Scene 1 ({d1:.2f}s) ---")
        
        # Initial overview & smooth mouse movement over header
        await smooth_mouse_move(page, 960, 540, 250, 40, steps=30, delay=0.03)
        await asyncio.sleep(12)
        await smooth_mouse_move(page, 250, 40, 960, 400, steps=25, delay=0.03)
        await asyncio.sleep(18)

        # Move mouse to "Risk Rules Reference" in navbar and click
        rules_btn = page.get_by_role("button", name="Risk Rules Reference")
        box = await rules_btn.bounding_box()
        if box:
            await smooth_mouse_move(page, 960, 400, box["x"] + box["width"]/2, box["y"] + box["height"]/2, steps=25, delay=0.02)
        await rules_btn.click()
        await asyncio.sleep(2)

        # In modal: hover over wind table and load rules
        await smooth_mouse_move(page, 1600, 40, 960, 450, steps=30, delay=0.03)
        await asyncio.sleep(12)
        await smooth_mouse_move(page, 960, 450, 960, 600, steps=25, delay=0.03)
        await asyncio.sleep(14)

        # Close modal
        close_btn = page.locator("button:has(svg.lucide-x)")
        cbox = await close_btn.bounding_box()
        if cbox:
            await smooth_mouse_move(page, 960, 600, cbox["x"] + cbox["width"]/2, cbox["y"] + cbox["height"]/2, steps=20, delay=0.02)
        await close_btn.click()
        await asyncio.sleep(2)

        # Wait remaining time of scene 1
        elapsed_s1 = time.time() - s1_start
        if elapsed_s1 < d1:
            await asyncio.sleep(d1 - elapsed_s1)
        print(f"Scene 1 completed in {time.time() - s1_start:.2f}s (target: {d1:.2f}s)")

        # ==========================================
        # SCENE 2: INTERACTIVE INPUTS & HEAVY LOAD (duration: d2)
        # ==========================================
        s2_start = time.time()
        print(f"--- Starting Scene 2 ({d2:.2f}s) ---")

        # Hover origin input
        origin_input = page.locator("input[placeholder*='Chicago']").first
        obox = await origin_input.bounding_box()
        if obox:
            await smooth_mouse_move(page, 960, 200, obox["x"] + obox["width"]/2, obox["y"] + obox["height"]/2, steps=20, delay=0.02)
        await asyncio.sleep(4)

        # Hover destination input
        dest_input = page.locator("input[placeholder*='Denver']").first
        dbox = await dest_input.bounding_box()
        if dbox:
            await smooth_mouse_move(page, obox["x"] + obox["width"]/2, obox["y"] + obox["height"]/2, dbox["x"] + dbox["width"]/2, dbox["y"] + dbox["height"]/2, steps=20, delay=0.02)
        await asyncio.sleep(6)

        # Highlight Cargo Weight Slider & Amber Banner
        slider = page.locator("input[type='range']")
        sbox = await slider.bounding_box()
        if sbox:
            await smooth_mouse_move(page, dbox["x"] + dbox["width"]/2, dbox["y"] + dbox["height"]/2, sbox["x"] + sbox["width"]/2, sbox["y"] + sbox["height"]/2, steps=25, delay=0.02)
        await asyncio.sleep(8)

        # Point down to the amber warning banner
        await smooth_mouse_move(page, sbox["x"] + sbox["width"]/2, sbox["y"] + sbox["height"]/2, 960, 360, steps=20, delay=0.02)
        await asyncio.sleep(10)

        # Click "Search & Calculate 3 Safe Routes"
        calc_btn = page.get_by_role("button", name="Search & Calculate 3 Safe Routes")
        cbox = await calc_btn.bounding_box()
        if cbox:
            await smooth_mouse_move(page, 960, 360, cbox["x"] + cbox["width"]/2, cbox["y"] + cbox["height"]/2, steps=20, delay=0.02)
        await calc_btn.click()
        print("Clicked calculate button, waiting for route calculation response...")

        # Wait for results to render
        await page.wait_for_selector(".space-y-6", timeout=30000)
        await asyncio.sleep(2)

        # Wait remaining time of scene 2
        elapsed_s2 = time.time() - s2_start
        if elapsed_s2 < d2:
            await asyncio.sleep(d2 - elapsed_s2)
        print(f"Scene 2 completed in {time.time() - s2_start:.2f}s (target: {d2:.2f}s)")

        # ==========================================
        # SCENE 3: 3 ROUTES & RECOMMENDATION (duration: d3)
        # ==========================================
        s3_start = time.time()
        print(f"--- Starting Scene 3 ({d3:.2f}s) ---")

        # Scroll slightly to show recommendation and route cards clearly
        await page.evaluate("window.scrollTo({top: 260, behavior: 'smooth'})")
        await asyncio.sleep(2)

        # Hover Safety Recommendation Analysis banner
        await smooth_mouse_move(page, 960, 400, 960, 350, steps=20, delay=0.03)
        await asyncio.sleep(14)

        # Hover over Route 1 card
        route1_card = page.locator("div.cursor-pointer").first
        r1_box = await route1_card.bounding_box()
        if r1_box:
            await smooth_mouse_move(page, 960, 350, r1_box["x"] + r1_box["width"]/2, r1_box["y"] + 60, steps=20, delay=0.03)
        await asyncio.sleep(14)

        # Hover over Route 2 & 3 cards to compare
        cards = await page.locator("div.cursor-pointer").all()
        if len(cards) >= 2:
            r2_box = await cards[1].bounding_box()
            if r2_box:
                await smooth_mouse_move(page, r1_box["x"] + r1_box["width"]/2, r1_box["y"] + 60, r2_box["x"] + r2_box["width"]/2, r2_box["y"] + 60, steps=25, delay=0.03)
            await asyncio.sleep(10)
        if len(cards) >= 3:
            r3_box = await cards[2].bounding_box()
            if r3_box:
                await smooth_mouse_move(page, r2_box["x"] + r2_box["width"]/2, r2_box["y"] + 60, r3_box["x"] + r3_box["width"]/2, r3_box["y"] + 60, steps=25, delay=0.03)
            await asyncio.sleep(10)

        # Move back to recommended Route 1
        if r1_box:
            await smooth_mouse_move(page, 960, 450, r1_box["x"] + r1_box["width"]/2, r1_box["y"] + 60, steps=20, delay=0.03)

        elapsed_s3 = time.time() - s3_start
        if elapsed_s3 < d3:
            await asyncio.sleep(d3 - elapsed_s3)
        print(f"Scene 3 completed in {time.time() - s3_start:.2f}s (target: {d3:.2f}s)")

        # ==========================================
        # SCENE 4: INTERACTIVE MAP, TIMELAPSE & RADAR (duration: d4)
        # ==========================================
        s4_start = time.time()
        print(f"--- Starting Scene 4 ({d4:.2f}s) ---")

        # Scroll down smoothly to center the Map
        await page.evaluate("window.scrollTo({top: 540, behavior: 'smooth'})")
        await asyncio.sleep(3)

        # Mouse glides over the active cyan route line on the map
        await smooth_mouse_move(page, 500, 400, 1000, 420, steps=30, delay=0.03)
        await asyncio.sleep(10)

        # Basemap toggle: Click "Satellite" button, wait, then back
        sat_btn = page.locator("button:has-text('Satellite')")
        sbox = await sat_btn.bounding_box()
        if sbox:
            await smooth_mouse_move(page, 1000, 420, sbox["x"] + sbox["width"]/2, sbox["y"] + sbox["height"]/2, steps=20, delay=0.02)
            await sat_btn.click()
            await asyncio.sleep(5)
            # Switch back to HD Dark / Esri Dark
            dark_btn = page.locator("button:has-text('HD Dark'), button:has-text('Esri Dark')").first
            await dark_btn.click()
            await asyncio.sleep(3)

        # Move down to Forecast Slider
        await smooth_mouse_move(page, 500, 300, 500, 750, steps=25, delay=0.03)
        await asyncio.sleep(6)

        # Click Play button on Forecast Slider
        play_btn = page.locator("button[title*='Play']").first
        pbox = await play_btn.bounding_box()
        if pbox:
            await smooth_mouse_move(page, 500, 750, pbox["x"] + pbox["width"]/2, pbox["y"] + pbox["height"]/2, steps=20, delay=0.02)
            await play_btn.click()
            print("Started forecast timelapse simulation!")

        # Let the animation run smoothly across the corridor
        await asyncio.sleep(18)

        # Toggle Heatmap metrics: Wind Speed, Precipitation, Composite Risk
        wind_btn = page.locator("button:has-text('Wind Speed')").first
        if await wind_btn.count() > 0:
            wbox = await wind_btn.bounding_box()
            if wbox:
                await smooth_mouse_move(page, pbox["x"] + pbox["width"]/2 if pbox else 500, pbox["y"] + pbox["height"]/2 if pbox else 750, wbox["x"] + wbox["width"]/2, wbox["y"] + wbox["height"]/2, steps=20, delay=0.02)
                await wind_btn.click()
                await asyncio.sleep(7)

        precip_btn = page.locator("button:has-text('Precipitation')").first
        if await precip_btn.count() > 0:
            pr_box = await precip_btn.bounding_box()
            if pr_box:
                await smooth_mouse_move(page, wbox["x"] + wbox["width"]/2 if 'wbox' in locals() and wbox else 500, wbox["y"] + wbox["height"]/2 if 'wbox' in locals() and wbox else 750, pr_box["x"] + pr_box["width"]/2, pr_box["y"] + pr_box["height"]/2, steps=20, delay=0.02)
                await precip_btn.click()
                await asyncio.sleep(7)

        risk_metric_btn = page.locator("button:has-text('Truck Risk')").first
        if await risk_metric_btn.count() > 0:
            rm_box = await risk_metric_btn.bounding_box()
            if rm_box:
                await smooth_mouse_move(page, pr_box["x"] + pr_box["width"]/2 if 'pr_box' in locals() and pr_box else 500, pr_box["y"] + pr_box["height"]/2 if 'pr_box' in locals() and pr_box else 750, rm_box["x"] + rm_box["width"]/2, rm_box["y"] + rm_box["height"]/2, steps=20, delay=0.02)
                await risk_metric_btn.click()
                await asyncio.sleep(4)

        # Toggle Live Radar
        radar_btn = page.locator("button:has-text('Live Radar')").first
        if await radar_btn.count() > 0:
            rd_box = await radar_btn.bounding_box()
            if rd_box:
                await smooth_mouse_move(page, rm_box["x"] + rm_box["width"]/2 if 'rm_box' in locals() and rm_box else 500, rm_box["y"] + rm_box["height"]/2 if 'rm_box' in locals() and rm_box else 750, rd_box["x"] + rd_box["width"]/2, rd_box["y"] + rd_box["height"]/2, steps=25, delay=0.02)
                await radar_btn.click()
                await asyncio.sleep(8)

        elapsed_s4 = time.time() - s4_start
        if elapsed_s4 < d4:
            await asyncio.sleep(d4 - elapsed_s4)
        print(f"Scene 4 completed in {time.time() - s4_start:.2f}s (target: {d4:.2f}s)")

        # ==========================================
        # SCENE 5: CHECKPOINT TELEMETRY, ITINERARY & CLOSING (duration: d5)
        # ==========================================
        s5_start = time.time()
        print(f"--- Starting Scene 5 ({d5:.2f}s) ---")

        # Click a checkpoint marker on the map to trigger popup
        # Locate circle markers in the overlay pane
        circle_markers = await page.locator(".leaflet-overlay-pane path.leaflet-interactive").all()
        if len(circle_markers) > 5:
            target_cp = circle_markers[len(circle_markers) // 2]
            cp_box = await target_cp.bounding_box()
            if cp_box:
                await smooth_mouse_move(page, 960, 500, cp_box["x"] + cp_box["width"]/2, cp_box["y"] + cp_box["height"]/2, steps=20, delay=0.02)
            await target_cp.dispatch_event('click')
            print("Clicked checkpoint marker to open popup!")
        await asyncio.sleep(14)

        # Hover popup telemetry
        await smooth_mouse_move(page, 960, 450, 960, 380, steps=20, delay=0.03)
        await asyncio.sleep(12)

        # Scroll down smoothly to Checkpoint Itinerary table
        await page.evaluate("window.scrollTo({top: 1100, behavior: 'smooth'})")
        await asyncio.sleep(4)

        # Click "Hazards Only" filter button
        hazards_btn = page.locator("button:has-text('Hazards Only')").first
        if await hazards_btn.count() > 0:
            hz_box = await hazards_btn.bounding_box()
            if hz_box:
                await smooth_mouse_move(page, 960, 500, hz_box["x"] + hz_box["width"]/2, hz_box["y"] + hz_box["height"]/2, steps=25, delay=0.02)
            await hazards_btn.click()
            print("Clicked Hazards Only filter button!")
        await asyncio.sleep(14)

        # Gently scroll through filtered hazards table
        await page.evaluate("window.scrollBy({top: 150, behavior: 'smooth'})")
        await asyncio.sleep(14)

        # Scroll back up to the full view for closing remarks
        await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        await asyncio.sleep(6)

        elapsed_s5 = time.time() - s5_start
        if elapsed_s5 < d5:
            await asyncio.sleep(d5 - elapsed_s5)
        print(f"Scene 5 completed in {time.time() - s5_start:.2f}s (target: {d5:.2f}s)")

        total_time = time.time() - start_time
        print(f"Total video recorded: {total_time:.2f}s (target: {total_expected:.2f}s)")

        # Close page & context to flush the WebM recording
        await page.close()
        await context.close()
        await browser.close()

    print("Browser closed. Locating recorded WebM file...")
    recorded_files = list(RECORDINGS_DIR.glob("*.webm"))
    if not recorded_files:
        raise RuntimeError("No .webm file found in recordings directory!")
    
    # Pick the newest webm file
    recorded_webm = max(recorded_files, key=lambda f: f.stat().st_mtime)
    print(f"Found recorded WebM: {recorded_webm} ({recorded_webm.stat().st_size / (1024*1024):.2f} MB)")

    # Mux with FFmpeg
    print("Muxing video with TTS audio into final MP4...")
    mux_cmd = [
        FFMPEG_BIN,
        "-y",
        "-i", str(recorded_webm),
        "-i", str(FULL_AUDIO),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        str(OUTPUT_VIDEO)
    ]
    subprocess.run(mux_cmd, check=True)
    print(f"\nSUCCESS! Final walkthrough video generated at:\n{OUTPUT_VIDEO}")
    print(f"File size: {OUTPUT_VIDEO.stat().st_size / (1024*1024):.2f} MB")

if __name__ == "__main__":
    asyncio.run(record())
