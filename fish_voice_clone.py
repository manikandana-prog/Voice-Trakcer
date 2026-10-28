import os
import sys
import shutil
import subprocess
import requests
import msgpack

# Enable UTF-8 console output for Windows PowerShell
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_FILE = os.path.join(BASE_DIR, ".fish_key")
GROQ_FILE = os.path.join(BASE_DIR, ".groq_key")
DEFAULT_KEY = "sk-fish-bLD0TdFfsYBxY7kbF-eDzZotSmEaH8PNxekE36gDZTQ"

# Reference voice samples
RAW_REF_AUDIO = os.path.join(BASE_DIR, "user_voice_sample.wav")
CLEAN_REF_AUDIO = os.path.join(BASE_DIR, "clean_user_voice.wav")
ALT_REF_SAMPLE = os.path.join(BASE_DIR, "ref_sample.wav")
M4A_REF_SAMPLE = os.path.join(BASE_DIR, "Tamil voice sample.m4a")

DEFAULT_REF_TEXT = "Hello! This is my voice. Voice cloning working successfully."
DEFAULT_OUTPUT_MP3 = os.path.join(BASE_DIR, "fish_cloned_output.mp3")
DEFAULT_OUTPUT_WAV = os.path.join(BASE_DIR, "fish_cloned_output.wav")
FFMPEG_EXE = os.path.join(BASE_DIR, "ffmpeg.exe")

def get_ffmpeg_binary() -> str:
    if os.path.exists(FFMPEG_EXE):
        return FFMPEG_EXE
    which = shutil.which("ffmpeg")
    return which if which else "ffmpeg"

def get_fish_api_key():
    # 1. Environment variable
    k = os.environ.get("FISH_API_KEY", "").strip()
    if k:
        return k
    # 2. Local file .fish_key
    if os.path.exists(KEY_FILE):
        try:
            with open(KEY_FILE, "r", encoding="utf-8") as f:
                k = f.read().strip()
                if k:
                    return k
        except Exception:
            pass
    # 3. Default key fallback
    return DEFAULT_KEY

def get_groq_key():
    k = os.environ.get("GROQ_API_KEY", "").strip()
    if k:
        return k
    if os.path.exists(GROQ_FILE):
        try:
            with open(GROQ_FILE, "r", encoding="utf-8") as f:
                k = f.read().strip()
                if k:
                    return k
        except Exception:
            pass
    return None

def check_fish_credits(api_key: str):
    """Checks user API balance and tier status"""
    url = "https://api.fish.audio/wallet/self/api-credit"
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            credit = float(data.get("credit", 0.0))
            return credit, data
    except Exception:
        pass
    return 0.0, {}

def get_best_reference_audio() -> tuple[str, str]:
    """Finds or prepares the cleanest reference audio and its transcript"""
    ffmpeg_bin = get_ffmpeg_binary()
    
    # 1. Check clean_user_voice.wav
    if os.path.exists(CLEAN_REF_AUDIO) and os.path.getsize(CLEAN_REF_AUDIO) > 1000:
        return CLEAN_REF_AUDIO, DEFAULT_REF_TEXT

    # 2. Check user_voice_sample.wav and trim silence
    if os.path.exists(RAW_REF_AUDIO) and os.path.getsize(RAW_REF_AUDIO) > 1000:
        cmd = [
            ffmpeg_bin, "-y",
            "-ss", "0.9", "-to", "7.2",
            "-i", RAW_REF_AUDIO,
            "-ar", "24000", "-ac", "1",
            CLEAN_REF_AUDIO
        ]
        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if os.path.exists(CLEAN_REF_AUDIO):
                return CLEAN_REF_AUDIO, DEFAULT_REF_TEXT
        except Exception:
            pass
        return RAW_REF_AUDIO, DEFAULT_REF_TEXT

    # 3. Check ref_sample.wav
    if os.path.exists(ALT_REF_SAMPLE) and os.path.getsize(ALT_REF_SAMPLE) > 1000:
        return ALT_REF_SAMPLE, DEFAULT_REF_TEXT

    # 4. Check M4A sample
    if os.path.exists(M4A_REF_SAMPLE):
        conv_wav = os.path.join(BASE_DIR, "temp_sample_from_m4a.wav")
        cmd = [ffmpeg_bin, "-y", "-i", M4A_REF_SAMPLE, "-t", "8", "-ar", "24000", "-ac", "1", conv_wav]
        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if os.path.exists(conv_wav):
                return conv_wav, "Tamil voice sample for cloning."
        except Exception:
            pass

    return "", ""

def prepare_human_prosody(text: str) -> str:
    """
    Enhances Tamil/Tanglish text for voice cloning:
    - Normalizes phonetic Tanglish
    - Inserts natural breath pauses and punctuation so it doesn't sound robotic
    """
    groq_key = get_groq_key()
    if groq_key:
        try:
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            payload = {
                "model": "qwen/qwen3.8-27b",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You format Tamil/Tanglish text for voice cloning speech synthesis. "
                            "Convert any Tamil script into conversational phonetic Tanglish (Latin characters). "
                            "Insert natural breathing commas (,), question marks, and pauses so the speech sounds "
                            "like a calm, natural human speaking warmly, and NEVER like a fast machine gun robot. "
                            "Keep all words, do NOT drop meaning. Return ONLY the formatted text."
                        )
                    },
                    {"role": "user", "content": text}
                ],
                "temperature": 0.2
            }
            resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=8)
            if resp.status_code == 200:
                res_json = resp.json()
                formatted = res_json["choices"][0]["message"]["content"].strip().strip('"').strip("'")
                if formatted:
                    return formatted
        except Exception:
            pass

    # Fallback punctuation heuristics
    enhanced = text.strip()
    if not enhanced.endswith((".", "?", "!")):
        enhanced += "."
    return enhanced

def apply_studio_human_mastering(input_audio: str, output_wav: str, output_mp3: str, speed: float = 0.92):
    """
    Applies audio mastering to ensure warm, natural studio acoustics:
    1. atempo: Custom conversational speech pace
    2. equalizer 220Hz +2.0dB: Warm vocal chest presence
    3. equalizer 3500Hz -2.0dB: Reduces robotic digital hiss
    4. acompressor: Smooths volume dynamics
    """
    ffmpeg_bin = get_ffmpeg_binary()
    af_filter = (
        f"atempo={speed},"
        "equalizer=f=220:t=q:w=1:g=2.0,"
        "equalizer=f=3500:t=q:w=1:g=-2.0,"
        "acompressor=threshold=-18dB:ratio=2.5:attack=20:release=150,"
        "volume=1.10"
    )

    # 1. Mastered MP3
    cmd_mp3 = [
        ffmpeg_bin, "-y",
        "-i", input_audio,
        "-af", af_filter,
        "-b:a", "192k",
        output_mp3
    ]
    subprocess.run(cmd_mp3, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 2. Mastered WAV
    cmd_wav = [
        ffmpeg_bin, "-y",
        "-i", output_mp3,
        "-ar", "24000",
        "-ac", "1",
        output_wav
    ]
    subprocess.run(cmd_wav, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def clone_and_speak(text: str, ref_audio_path: str = None, ref_text: str = None, speed: float = 0.92, preferred_model: str = None):
    api_key = get_fish_api_key()
    if not api_key:
        print("[Error]: Fish Audio API Key not found. Please add to .fish_key or FISH_API_KEY environment variable.")
        return False

    # Check reference audio
    if not ref_audio_path or not os.path.exists(ref_audio_path):
        ref_audio_path, auto_ref_text = get_best_reference_audio()
        if not ref_text:
            ref_text = auto_ref_text

    if not ref_audio_path or not os.path.exists(ref_audio_path):
        print(f"[Error]: No reference audio sample found. Please provide an audio file.")
        return False

    if not ref_text:
        ref_text = DEFAULT_REF_TEXT

    # Check credits to intelligently select model
    credit_balance, _ = check_fish_credits(api_key)
    if preferred_model:
        model_name = preferred_model
    else:
        # If user has paid credits, use s2.1-pro, else s2.1-pro-free
        model_name = "s2.1-pro" if credit_balance > 0.05 else "s2.1-pro-free"

    print("=" * 64)
    print("      FISH AUDIO ZERO-SHOT VOICE CLONING (STUDIO HUMAN ENHANCED)")
    print("=" * 64)
    print(f">> Reference Audio : {os.path.basename(ref_audio_path)}")
    print(f">> API Credit      : ${credit_balance:.4f}")
    print(f">> Model           : {model_name}")
    print(f">> Raw Text        : \"{text}\"")

    # Format text for natural human cadence
    gen_text = prepare_human_prosody(text)
    print(f">> Human Prosody   : \"{gen_text}\"")
    print(f">> Speech Pace     : {speed}x (Relaxed Human Conversational Speed)")

    # Read reference audio bytes
    try:
        with open(ref_audio_path, "rb") as f:
            audio_bytes = f.read()
    except Exception as e:
        print(f"[Error]: Unable to read reference audio: {e}")
        return False

    # Build MessagePack payload for zero-shot instant cloning
    payload = {
        "text": gen_text,
        "references": [
            {
                "audio": audio_bytes,
                "text": ref_text
            }
        ],
        "format": "mp3"
    }

    try:
        packed_data = msgpack.packb(payload)
    except Exception as e:
        print(f"[Error]: Failed to pack request data: {e}")
        return False

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/msgpack",
        "model": model_name
    }

    print("\n>> Sending request to Fish Audio API...")
    url = "https://api.fish.audio/v1/tts"
    
    resp = requests.post(url, data=packed_data, headers=headers, timeout=60)

    # Automatic fallback to free tier if 402 Insufficient Credit
    if resp.status_code == 402 and model_name != "s2.1-pro-free":
        print(f"[Info]: Insufficient paid credits for {model_name}. Auto-switching to s2.1-pro-free...")
        headers["model"] = "s2.1-pro-free"
        resp = requests.post(url, data=packed_data, headers=headers, timeout=60)

    if resp.status_code != 200:
        print(f"[Fish Audio Error {resp.status_code}]: {resp.text}")
        return False

    raw_temp_mp3 = os.path.join(BASE_DIR, "fish_raw_temp.mp3")
    with open(raw_temp_mp3, "wb") as f:
        f.write(resp.content)

    print(">> Applying Studio Human Vocal Warmth & Pace Mastering...")
    apply_studio_human_mastering(raw_temp_mp3, DEFAULT_OUTPUT_WAV, DEFAULT_OUTPUT_MP3, speed=speed)

    # Clean up temp raw file
    if os.path.exists(raw_temp_mp3):
        try:
            os.remove(raw_temp_mp3)
        except Exception:
            pass

    print("\n" + "=" * 64)
    print("✨ VOICE CLONED SUCCESSFULLY VIA FISH AUDIO!")
    print(f">> MP3 Output : {DEFAULT_OUTPUT_MP3}")
    print(f">> WAV Output : {DEFAULT_OUTPUT_WAV}")
    print("=" * 64)

    # Auto play preview on Windows
    try:
        import winsound
        print(">> 🔊 Playing cloned speech...")
        winsound.PlaySound(DEFAULT_OUTPUT_WAV, winsound.SND_FILENAME)
    except Exception:
        pass

    return True

if __name__ == "__main__":
    speed_arg = 0.92
    custom_ref = None
    custom_ref_text = None
    custom_model = None
    text_args = []

    args = sys.argv[1:]
    idx = 0
    while idx < len(args):
        if args[idx] == "--speed" and idx + 1 < len(args):
            try:
                speed_arg = float(args[idx + 1])
                idx += 2
                continue
            except ValueError:
                pass
        elif args[idx] == "--ref" and idx + 1 < len(args):
            custom_ref = args[idx + 1]
            idx += 2
            continue
        elif args[idx] == "--ref-text" and idx + 1 < len(args):
            custom_ref_text = args[idx + 1]
            idx += 2
            continue
        elif args[idx] == "--model" and idx + 1 < len(args):
            custom_model = args[idx + 1]
            idx += 2
            continue
        text_args.append(args[idx])
        idx += 1

    if text_args:
        input_text = " ".join(text_args)
    else:
        input_text = input("Enter text for Fish Audio voice clone: ").strip()

    if not input_text:
        input_text = "Hello! Fish Audio voice cloning is speaking very naturally."

    clone_and_speak(
        text=input_text,
        ref_audio_path=custom_ref,
        ref_text=custom_ref_text,
        speed=speed_arg,
        preferred_model=custom_model
    )
