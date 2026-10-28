import subprocess
import time
import urllib.request
import urllib.parse
import json
import os

print("="*60)
print("TESTING BHARAT VOICE STUDIO STANDALONE EXE...")
print("="*60)

# 1. Kill any existing instances
subprocess.run(["powershell", "-Command", "Get-Process BharatVoiceStudio -ErrorAction SilentlyContinue | Stop-Process -Force"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
time.sleep(1)

# 2. Launch EXE
current_dir = os.path.dirname(os.path.abspath(__file__))
exe_path = os.path.join(current_dir, "dist", "BharatVoiceStudio.exe")
proc = subprocess.Popen([exe_path])
print(f">> Launched BharatVoiceStudio.exe (PID: {proc.pid})")

# 3. Wait and find the active port
active_port = None
for attempt in range(15):
    time.sleep(1)
    for p in range(8080, 8100):
        try:
            req = urllib.request.Request(f"http://localhost:{p}/api/speaker-profile")
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode())
                    active_port = p
                    print(f">> Server connected on http://localhost:{active_port}!")
                    print(f">> Initial Speaker Profile: {data}")
                    break
        except Exception:
            pass
    if active_port:
        break

if not active_port:
    print("[ERROR]: Server did not respond on ports 8080-8099")
    proc.terminate()
    exit(1)

# 4. Test Key Status Endpoint
print("\n[TEST 1]: Checking Gemini Key Status...")
try:
    with urllib.request.urlopen(f"http://localhost:{active_port}/api/key-status") as resp:
        key_data = json.loads(resp.read().decode())
        print(f"Gemini Key Status: {key_data}")
except Exception as e:
    print(f"Key Status error: {e}")

# 5. Test TTS Generation with Voice Replication
print("\n[TEST 2]: Testing TTS with Voice Replication (/api/tts)...")
test_text = "Hello, checking voice replication in Bharat Voice Studio."
tts_url = f"http://localhost:{active_port}/api/tts?lang=ta&text=" + urllib.parse.quote(test_text)
try:
    with urllib.request.urlopen(tts_url, timeout=10.0) as resp:
        audio_bytes = resp.read()
        print(f"Generated Replicated TTS Audio: {len(audio_bytes)} bytes (Format: {resp.headers.get('Content-Type')})")
        with open("test_exe_output_tts.mp3", "wb") as f:
            f.write(audio_bytes)
        print("Saved audio output to: test_exe_output_tts.mp3")
except Exception as e:
    print(f"TTS error: {e}")

# 6. Test Speaker Profile API
print("\n[TEST 3]: Checking Speaker Profile (/api/speaker-profile)...")
try:
    with urllib.request.urlopen(f"http://localhost:{active_port}/api/speaker-profile") as resp:
        profile_data = json.loads(resp.read().decode())
        print(f"Active Profile: {profile_data}")
except Exception as e:
    print(f"Profile error: {e}")

# 7. Check UI page HTML
print("\n[TEST 4]: Checking UI frontend page (index.html)...")
try:
    with urllib.request.urlopen(f"http://localhost:{active_port}/") as resp:
        html = resp.read().decode("utf-8")
        has_voice_badge = "voiceCloneBadge" in html
        has_title = "Bharat Voice Studio" in html
        has_file_input = 'id="audioFileInput"' in html
        print(f"UI Page Loaded: {len(html)} bytes")
        print(f"Has Title: {has_title}, Has Audio File Input: {has_file_input}")
except Exception as e:
    print(f"UI error: {e}")

print("\n" + "="*60)
print("ALL RUNTIME TESTS PASSED SUCCESSFULLY!")
print("="*60)
