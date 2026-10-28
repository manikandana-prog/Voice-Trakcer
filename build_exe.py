import os
import sys
import subprocess
import time
import PyInstaller.__main__

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
web_dir = os.path.join(BASE_DIR, "web")
ffmpeg_exe = os.path.join(BASE_DIR, "ffmpeg.exe")
icon_file = os.path.join(BASE_DIR, "app_icon.ico")

# Terminate any running BharatVoiceStudio process before build
try:
    subprocess.run(["powershell", "-Command", "Get-Process BharatVoiceStudio -ErrorAction SilentlyContinue | Stop-Process -Force"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(1)
except Exception:
    pass

args = [
    os.path.join(BASE_DIR, "studio_app.py"),
    "--name=BharatVoiceStudio",
    "--onefile",
    "--noconsole",
    "--clean",
    "--noconfirm",
    f"--add-data={web_dir};web",
    f"--add-binary={ffmpeg_exe};.",
]

# Include app icon if exists
if os.path.exists(icon_file):
    args.append(f"--icon={icon_file}")

# Include default API key files if present so app is turnkey
for kf in [".gemini_key", ".groq_key", ".fish_key", ".hf_token"]:
    full_k = os.path.join(BASE_DIR, kf)
    if os.path.exists(full_k):
        args.append(f"--add-data={full_k};.")

# Hidden imports and package collections
args.extend([
    "--hidden-import=google.genai",
    "--hidden-import=google.genai.types",
    "--hidden-import=google.auth",
    "--hidden-import=httpx",
    "--hidden-import=http.server",
    "--hidden-import=requests",
    "--hidden-import=msgpack",
    "--hidden-import=pydantic",
    "--hidden-import=pydantic_core",
    "--collect-all=google.genai",
    "--collect-all=google.auth",
    "--exclude-module=pkg_resources",
    "--exclude-module=setuptools",
])

print("="*60)
print("Starting BharatVoiceStudio EXE Build...")
print(f"Base Directory   : {BASE_DIR}")
print(f"Python Executable: {sys.executable}")
print("="*60)

PyInstaller.__main__.run(args)

dist_exe = os.path.join(BASE_DIR, "dist", "BharatVoiceStudio.exe")
print("\n" + "="*60)
if os.path.exists(dist_exe):
    size_mb = os.path.getsize(dist_exe) / (1024 * 1024)
    print("SUCCESS: BharatVoiceStudio.exe successfully created!")
    print(f"Path : {dist_exe}")
    print(f"Size : {size_mb:.2f} MB")
else:
    print("Build finished. Check dist/ folder.")
print("="*60)
