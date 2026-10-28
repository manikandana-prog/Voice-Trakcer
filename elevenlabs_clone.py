import os
import sys
import json
import httpx

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_FILE = os.path.join(BASE_DIR, ".elevenlabs_key")
AUDIO_SAMPLE = os.path.join(BASE_DIR, "Tamil voice sample.m4a")
OUTPUT_FILE = os.path.join(BASE_DIR, "cloned_voice_output.mp3")

def get_elevenlabs_api_key():
    # 0. Command-line argument
    if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
        return sys.argv[1].strip()

    # 1. Environment variable
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if key:
        return key

    # 2. Local file .elevenlabs_key
    if os.path.exists(KEY_FILE):
        try:
            with open(KEY_FILE, "r", encoding="utf-8") as f:
                k = f.read().strip()
                if k:
                    return k
        except Exception:
            pass

    return ""

def check_account_subscription(api_key: str):
    headers = {"xi-api-key": api_key}
    url = "https://api.elevenlabs.io/v1/user/subscription"
    try:
        resp = httpx.get(url, headers=headers, timeout=15.0)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 401:
            print("[Error]: ElevenLabs API Key invalid or expired!")
            return None
        else:
            print(f"[Subscription Check]: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"[Network Error]: {e}")
        return None

def find_existing_cloned_voice(api_key: str, voice_name: str = "My Cloned Tamil Voice"):
    headers = {"xi-api-key": api_key}
    url = "https://api.elevenlabs.io/v1/voices"
    try:
        resp = httpx.get(url, headers=headers, timeout=15.0)
        if resp.status_code == 200:
            voices = resp.json().get("voices", [])
            for v in voices:
                if v.get("name") == voice_name:
                    return v.get("voice_id")
    except Exception as e:
        print(f"[Voice lookup error]: {e}")
    return None

def clone_voice(api_key: str, audio_path: str, voice_name: str = "My Cloned Tamil Voice"):
    if not os.path.exists(audio_path):
        print(f"[Error]: Audio sample not found at: {audio_path}")
        return None

    # Check if voice already created
    existing_id = find_existing_cloned_voice(api_key, voice_name)
    if existing_id:
        print(f"[Info]: Voice '{voice_name}' already exists with Voice ID: {existing_id}")
        return existing_id

    headers = {"xi-api-key": api_key}
    url = "https://api.elevenlabs.io/v1/voices/add"
    
    print(f">> Uploading '{os.path.basename(audio_path)}' to ElevenLabs for Instant Voice Cloning...")
    with open(audio_path, "rb") as f:
        file_bytes = f.read()

    files = {
        "files": (os.path.basename(audio_path), file_bytes, "audio/mp4")
    }
    data = {
        "name": voice_name,
        "description": "Tamil speech voice clone",
        "labels": json.dumps({"accent": "Tamil", "language": "ta"})
    }

    resp = httpx.post(url, headers=headers, data=data, files=files, timeout=60.0)
    if resp.status_code == 200:
        voice_id = resp.json().get("voice_id")
        print(f"[SUCCESS]: Voice cloned successfully! Voice ID: {voice_id}")
        return voice_id
    else:
        print(f"[Clone Error {resp.status_code}]: {resp.text}")
        return None

def text_to_speech_cloned(api_key: str, voice_id: str, text: str, output_path: str):
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2", # Best model for Tamil & regional languages
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.85,
            "style": 0.2,
            "use_speaker_boost": True
        }
    }

    print(f">> Generating Speech with your Cloned Voice...")
    print(f">> Text: \"{text}\"")
    
    resp = httpx.post(url, headers=headers, json=payload, timeout=60.0)
    if resp.status_code == 200:
        with open(output_path, "wb") as f:
            f.write(resp.content)
        size_kb = os.path.getsize(output_path) / 1024
        print(f"[SUCCESS]: Cloned Audio generated successfully!")
        print(f">> Saved to: {output_path} ({size_kb:.1f} KB)")
        return True
    else:
        print(f"[TTS Error {resp.status_code}]: {resp.text}")
        return False

def main():
    print("="*60)
    print("     ELEVENLABS VOICE CLONING (TAMIL / MULTILINGUAL)")
    print("="*60)

    api_key = get_elevenlabs_api_key()
    if not api_key:
        print("\n[!] ElevenLabs API Key not found!")
        print("    1. Copy your ElevenLabs API Key from (https://elevenlabs.io -> Profile -> API Keys)")
        print(f"    2. Save the key in this file: {KEY_FILE}")
        print("       (or) set the environment variable 'ELEVENLABS_API_KEY'.\n")
        
        entered_key = input("Enter your ElevenLabs API Key here (or press Enter to exit): ").strip()
        if entered_key:
            with open(KEY_FILE, "w", encoding="utf-8") as f:
                f.write(entered_key)
            api_key = entered_key
            print(f"[Key saved to {KEY_FILE}]")
        else:
            print("Exiting. Please set the API key and run again.")
            return

    # Check account subscription
    print("\n>> Checking ElevenLabs account...")
    sub = check_account_subscription(api_key)
    if not sub:
        return

    tier = sub.get("tier", "free")
    char_count = sub.get("character_count", 0)
    char_limit = sub.get("character_limit", 0)
    print(f"   Account Tier : {tier.upper()}")
    print(f"   Characters   : {char_count} / {char_limit}")

    # ElevenLabs Instant Voice Cloning requires Starter tier or higher
    if tier == "free":
        print("\n[IMPORTANT NOTE]:")
        print("ElevenLabs 'Instant Voice Cloning' requires a minimum Starter tier subscription ($5/month).")
        print("Free tier accounts do not support custom voice cloning.")
        print("If your account is upgraded to Starter or Creator tier, it will proceed automatically.\n")

    # Clone voice
    voice_id = clone_voice(api_key, AUDIO_SAMPLE, voice_name="My Cloned Tamil Voice")
    if not voice_id:
        print("\n[!] Voice cloning failed. Check above error messages.")
        return

    # Generate test speech in cloned voice
    test_text = "வணக்கம்! இது ElevenLabs மூலமாக என்னுடைய குரலில் க்ளோன் செய்யப்பட்டு பேசப்படும் ஆடியோ."
    print("\n>> Testing speech synthesis in cloned voice...")
    ok = text_to_speech_cloned(api_key, voice_id, test_text, OUTPUT_FILE)
    if ok:
        print("\n" + "="*60)
        print("✨ VOICE CLONING COMPLETED SUCCESSFULLY! ✨")
        print(f"Cloned Voice Output File: {OUTPUT_FILE}")
        print("="*60)

if __name__ == "__main__":
    main()
