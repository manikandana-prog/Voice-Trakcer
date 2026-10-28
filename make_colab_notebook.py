import json
import os

notebook = {
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "# \u2728 F5-TTS Zero-Shot Voice Cloning (Google Colab Free GPU)\n",
    "\n",
    "Use this Google Colab notebook to clone your **own voice with 100% accuracy**.\n",
    "- \u2705 **100% Free NVIDIA Tesla T4 GPU (16GB VRAM)**\n",
    "- \u2705 **Zero Rate Limits** (Generate unlimited speech without throttling)\n",
    "- \u2705 **Full Quality Audio** without compression\n",
    "\n",
    "---\n",
    "### \u26a1 Step 1: Check GPU Runtime\n",
    "Go to **Runtime \u2192 Change runtime type \u2192 T4 GPU** and verify GPU acceleration is enabled."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Check NVIDIA GPU allocated by Google Colab\n",
    "!nvidia-smi"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### \u26a1 Step 2: Install F5-TTS and Dependencies (Takes ~1 min)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "!pip install -q git+https://github.com/SWivid/F5-TTS.git\n",
    "!pip install -q gradio soundfile"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### \u26a1 Step 3: Upload your Voice Sample\n",
    "In the left-hand panel, click the Files icon and upload your **`user_voice_sample.wav`** file,\n",
    "or run the cell below to select your file directly with the file picker."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "from google.colab import files\n",
    "import os\n",
    "\n",
    "print(\"Upload your voice sample (user_voice_sample.wav):\")\n",
    "uploaded = files.upload()\n",
    "for fn in uploaded.keys():\n",
    "    print(f'Uploaded: {fn} ({len(uploaded[fn])} bytes)')\n",
    "    ref_audio_path = fn\n",
    "    break"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### \u26a1 Step 4: Generate Cloned Speech in Your Own Voice\n",
    "Enter your desired text in `gen_text` below and run the cell. Speech will be synthesized in your exact cloned voice!"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "import IPython.display as ipd\n",
    "from f5_tts.api import F5TTS\n",
    "\n",
    "# Initialize F5-TTS on GPU\n",
    "f5tts = F5TTS(device=\"cuda\")\n",
    "\n",
    "# Reference audio and what was spoken in it\n",
    "ref_audio = \"user_voice_sample.wav\"\n",
    "ref_text = \"Hello! This is my voice. Voice cloning working successfully.\"\n",
    "\n",
    "# Type any sentence you want your cloned voice to speak\n",
    "gen_text = \"Hello! This speech was generated using F5-TTS in my own cloned voice on Google Colab. The audio quality is crystal clear!\"\n",
    "output_wav = \"my_cloned_voice_output.wav\"\n",
    "\n",
    "print(\">> Generating speech with your exact cloned voice...\")\n",
    "wav, sr, _ = f5tts.infer(\n",
    "    ref_file=ref_audio,\n",
    "    ref_text=ref_text,\n",
    "    gen_text=gen_text,\n",
    "    file_wave_out=output_wav\n",
    ")\n",
    "print(f\">> Generated successfully: {output_wav}\")\n",
    "\n",
    "# Play Audio Directly in Colab\n",
    "ipd.Audio(output_wav)"
   ]
  },
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "### \u26a1 Step 5 (Optional): Launch Interactive Web UI\n",
    "Running this launches a web interface with a public link where you can type text and generate unlimited voice clones easily!"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "from f5_tts.infer.infer_gradio import app\n",
    "# Launch with public URL\n",
    "app.launch(share=True)"
   ]
  }
 ],
 "metadata": {
  "accelerator": "GPU",
  "colab": {
   "provenance": [],
   "gpuType": "T4"
  },
  "language_info": {
   "name": "python"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 0
}

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "F5_TTS_Voice_Cloning.ipynb")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=1, ensure_ascii=False)

print(f"Notebook successfully created at: {output_path}")
