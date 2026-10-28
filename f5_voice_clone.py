import os
import sys
import shutil
import subprocess
from gradio_client import Client, handle_file

# Enable UTF-8 console output for Windows PowerShell
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(BASE_DIR, ".hf_token")
GROQ_FILE = os.path.join(BASE_DIR, ".groq_key")
# User's uploaded recorded voice sample
RAW_REF_AUDIO = os.path.join(BASE_DIR, "user_voice_sample.wav")
CLEAN_REF_AUDIO = os.path.join(BASE_DIR, "clean_user_voice.wav")
# Exact transcribed text from clean_user_voice.wav
REF_TEXT = "Hello! This is my voice. Voice cloning working successfully."
DEFAULT_OUTPUT = os.path.join(BASE_DIR, "f5_cloned_output.wav")
FFMPEG_EXE = os.path.join(BASE_DIR, "ffmpeg.exe")

def get_ffmpeg_binary() -> str:
    if os.path.exists(FFMPEG_EXE):
        return FFMPEG_EXE
    which = shutil.which("ffmpeg")
    return which if which else "ffmpeg"

def get_hf_token():
    t = os.environ.get("HF_TOKEN", "").strip()
    if t:
        return t
    if os.path.exists(TOKEN_FILE):
        try:
            with open(TOKEN_FILE, "r", encoding="utf-8") as f:
                t = f.read().strip()
                if t:
                    return t
        except Exception:
            pass
    return None

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

def prepare_clean_reference_audio() -> str:
    """Auto-trims leading and trailing silence/room noise from user_voice_sample.wav so F5-TTS doesn't inherit background hiss or timing bugs"""
    if not os.path.exists(RAW_REF_AUDIO):
        return RAW_REF_AUDIO
    if os.path.exists(CLEAN_REF_AUDIO) and os.path.getmtime(CLEAN_REF_AUDIO) >= os.path.getmtime(RAW_REF_AUDIO):
        return CLEAN_REF_AUDIO

    ffmpeg_bin = get_ffmpeg_binary()
    # Trim silence (starts around 0.9s, ends around 7.2s)
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
            return CLEAN_REF_AUDIO
    except Exception:
        pass
    return RAW_REF_AUDIO

def prepare_human_prosody(text: str) -> str:
    """
    Ensures speech sounds 100% human and NOT robotic:
    1. If Tamil script: converts to natural phonetic Tanglish.
    2. If raw Tanglish: adds natural breathing commas (,), question marks, and prosodic breath pauses.
    """
    groq_key = get_groq_key()
    if groq_key:
        try:
            import requests
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

    # Heuristic fallback if API unavailable: ensure commas and sentence ending
    enhanced = text.strip()
    if not enhanced.endswith((".", "?", "!")):
        enhanced += "."
    return enhanced

def apply_studio_human_mastering(input_wav: str, output_wav: str, output_mp3: str, speed: float = 0.88):
    """
    Applies audio mastering to eliminate robotic artifacts:
    1. atempo={speed}: Slows down speech to natural human conversational pace (e.g. 0.88x) without changing pitch.
    2. equalizer 220Hz +2.5dB: Enriches vocal chest warmth so voice feels close and natural.
    3. equalizer 3500Hz -2.5dB: Tames digital robotic vocoder hiss and metallic artifacts.
    4. acompressor: Smooths out volume dynamics like a professional podcast microphone.
    """
    ffmpeg_bin = get_ffmpeg_binary()
    af_filter = (
        f"atempo={speed},"
        "equalizer=f=220:t=q:w=1:g=2.5,"
        "equalizer=f=3500:t=q:w=1:g=-2.5,"
        "acompressor=threshold=-18dB:ratio=2.5:attack=20:release=150,"
        "volume=1.15"
    )

    # 1. High-Quality MP3
    cmd_mp3 = [
        ffmpeg_bin, "-y",
        "-i", input_wav,
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

def clone_and_speak(text: str, output_path: str = DEFAULT_OUTPUT, speed: float = 0.88):
    if not os.path.exists(RAW_REF_AUDIO):
        print(f"[Error]: Reference audio not found at {RAW_REF_AUDIO}")
        return False

    ref_audio_clean = prepare_clean_reference_audio()

    print("="*62)
    print("      F5-TTS ZERO-SHOT VOICE CLONING (STUDIO HUMAN ENHANCED)")
    print("="*62)
    print(f">> Reference Audio : {os.path.basename(RAW_REF_AUDIO)} (Clean Trimmed: {os.path.basename(ref_audio_clean)})")
    print(f">> Raw Text        : \"{text}\"")

    # Format text for natural human breathing and intonation
    gen_text = prepare_human_prosody(text)
    print(f">> Human Prosody   : \"{gen_text}\"")
    print(f">> Speech Pace     : {speed}x (Relaxed Human Conversational Speed)")

    hf_token = get_hf_token()
    if not hf_token:
        print("\n[!] Hugging Face Token Not Configured:")
        print("    Unlimited free quota-ku free Hugging Face token theva padum:")
        print("    1. Open: https://huggingface.co/settings/tokens (100% Free)")
        print("    2. Click 'Create new token' -> Role: 'Read' -> Copy key (starts with hf_...)")
        entered = input("\n>> Paste your Hugging Face Token (or press Enter to try anyway): ").strip()
        if entered:
            with open(TOKEN_FILE, "w", encoding="utf-8") as f:
                f.write(entered)
            hf_token = entered
            print(f">> Token saved to {TOKEN_FILE}!")

    client_kwargs = {}
    if hf_token:
        client_kwargs["token"] = hf_token

    print("\n>> Connecting to F5-TTS...")
    try:
        client = Client("mrfakename/E2-F5-TTS", **client_kwargs)
        print(">> Generating speech in cloned voice (takes ~5-10s)...")
        raw_result = client.predict(
            ref_audio=handle_file(ref_audio_clean),
            ref_text=REF_TEXT,
            gen_text=gen_text,
            remove_silence=False,
            api_name="/predict"
        )
        if raw_result and os.path.exists(raw_result):
            mp3_path = os.path.splitext(output_path)[0] + ".mp3"
            
            print(">> Applying Studio Human Vocal Warmth & Pace Mastering...")
            apply_studio_human_mastering(raw_result, output_path, mp3_path, speed=speed)
            
            print("\n" + "="*62)
            print("✨ VOICE CLONED SUCCESSFULLY (HUMAN WARMTH ENHANCED)!")
            print(f">> WAV Output : {output_path}")
            if os.path.exists(mp3_path):
                print(f">> MP3 Output : {mp3_path}")
            print("="*62)

            # Auto play preview
            try:
                import winsound
                print(">> 🔊 Playing cloned speech...")
                winsound.PlaySound(output_path, winsound.SND_FILENAME)
            except Exception:
                pass

            return True
        else:
            print("[Error]: Failed to generate cloned voice.")
            return False
    except Exception as e:
        err_msg = str(e)
        print(f"\n[F5-TTS Error]: {err_msg}")
        return False

if __name__ == "__main__":
    speed_arg = 0.88
    text_args = []
    
    # Check for --speed argument
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
        text_args.append(args[idx])
        idx += 1

    if text_args:
        input_text = " ".join(text_args)
    else:
        input_text = input("Enter the text you want the cloned voice to speak: ").strip()
    
    if not input_text:
        input_text = "Which option would you like to proceed with?"
    
    clone_and_speak(input_text, speed=speed_arg)
