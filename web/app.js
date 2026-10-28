// Bharat Voice Studio - Multilingual Auto Language Detection Controller

const TARGET_LANGS = [
  { code: 'ta', name: 'Tamil', flag: '🇮🇳', native: 'தமிழ்', speechLang: 'ta-IN' },
  { code: 'en', name: 'English', flag: '🇬🇧', native: 'Global', speechLang: 'en-IN' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', native: 'हिन्दी', speechLang: 'hi-IN' },
  { code: 'ml', name: 'Malayalam', flag: '🌴', native: 'മലയാളം', speechLang: 'ml-IN' },
  { code: 'te', name: 'Telugu', flag: '🏛️', native: 'తెలుగు', speechLang: 'te-IN' },
  { code: 'kn', name: 'Kannada', flag: '🌾', native: 'ಕನ್ನಡ', speechLang: 'kn-IN' },
  { code: 'bn', name: 'Bengali', flag: '🐯', native: 'বাংলা', speechLang: 'bn-IN' },
  { code: 'mr', name: 'Marathi', flag: '🚩', native: 'मराठी', speechLang: 'mr-IN' },
  { code: 'gu', name: 'Gujarati', flag: '🦁', native: 'ગુજરાતી', speechLang: 'gu-IN' },
  { code: 'pa', name: 'Punjabi', flag: '🌾', native: 'ਪੰਜਾਬੀ', speechLang: 'pa-IN' },
  { code: 'or', name: 'Odia', flag: '🛕', native: 'ଓଡ଼ିଆ', speechLang: 'or-IN' },
  { code: 'ur', name: 'Urdu', flag: '🌙', native: 'اردو', speechLang: 'ur-IN' }
];

const LANG_MAP = {
  ta: { name: 'Tamil', flag: '🇮🇳', speech: 'ta-IN' },
  en: { name: 'English', flag: '🇬🇧', speech: 'en-IN' },
  hi: { name: 'Hindi', flag: '🇮🇳', speech: 'hi-IN' },
  ml: { name: 'Malayalam', flag: '🌴', speech: 'ml-IN' },
  te: { name: 'Telugu', flag: '🏛️', speech: 'te-IN' },
  kn: { name: 'Kannada', flag: '🌾', speech: 'kn-IN' },
  bn: { name: 'Bengali', flag: '🐯', speech: 'bn-IN' },
  mr: { name: 'Marathi', flag: '🚩', speech: 'mr-IN' },
  gu: { name: 'Gujarati', flag: '🦁', speech: 'gu-IN' },
  pa: { name: 'Punjabi', flag: '🌾', speech: 'pa-IN' },
  or: { name: 'Odia', flag: '🛕', speech: 'or-IN' },
  ur: { name: 'Urdu', flag: '🌙', speech: 'ur-IN' }
};

let currentInputLang = 'en-IN'; // Default English
let lastSpokenText = "";
let lastDetectedLang = "en";
let lastTranslations = {};
let recognition = null;
let isRecording = false;
let isImportingAudio = false;
let isOwnVoiceEnabled = false; // Switch: false = Default AI Voice (0 Tokens, Free), true = Fish Audio Clone
let audioContext = null;
let analyser = null;
let microphone = null;
let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];
let recordedAudioBlob = null;
let recordedAudioUrl = null;

// UI Elements
const micBtn = document.getElementById('micBtn');
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const spokenTextEl = document.getElementById('spokenText');
const heroHint = document.getElementById('heroHint');
const canvas = document.getElementById('visualizerCanvas');
const canvasCtx = canvas.getContext('2d');
const autoSpeakCheckbox = document.getElementById('autoSpeakCheckbox');
const autoUploadCheckbox = document.getElementById('autoUploadCheckbox');
const playMyAudioBtn = document.getElementById('playMyAudioBtn');
const downloadMyAudioBtn = document.getElementById('downloadMyAudioBtn');
const audioPlayerWrap = document.getElementById('audioPlayerWrap');
const recordedAudioPlayer = document.getElementById('recordedAudioPlayer');
const mediaPlayerContainer = document.getElementById('mediaPlayerContainer');
const videoContainer = document.getElementById('videoContainer');
const uploadedVideoPlayer = document.getElementById('uploadedVideoPlayer');
const uploadStatusBar = document.getElementById('uploadStatusBar');
const uploadStatusText = document.getElementById('uploadStatusText');
const audioFileInput = document.getElementById('audioFileInput');
const detectedBadge = document.getElementById('detectedBadge');
const masterLangFlag = document.getElementById('masterLangFlag');
const masterLangTitle = document.getElementById('masterLangTitle');
const speechEditToolbar = document.getElementById('speechEditToolbar');

// Language DOM Elements mapping for all 12 languages
const textElements = {
  ta: document.getElementById('text-ta'),
  en: document.getElementById('text-en'),
  hi: document.getElementById('text-hi'),
  ml: document.getElementById('text-ml'),
  te: document.getElementById('text-te'),
  kn: document.getElementById('text-kn'),
  bn: document.getElementById('text-bn'),
  mr: document.getElementById('text-mr'),
  gu: document.getElementById('text-gu'),
  pa: document.getElementById('text-pa'),
  or: document.getElementById('text-or'),
  ur: document.getElementById('text-ur')
};

const pronounceElements = {
  ta: document.getElementById('pronounce-ta'),
  en: document.getElementById('pronounce-en'),
  hi: document.getElementById('pronounce-hi'),
  ml: document.getElementById('pronounce-ml'),
  te: document.getElementById('pronounce-te'),
  kn: document.getElementById('pronounce-kn'),
  bn: document.getElementById('pronounce-bn'),
  mr: document.getElementById('pronounce-mr'),
  gu: document.getElementById('pronounce-gu'),
  pa: document.getElementById('pronounce-pa'),
  or: document.getElementById('pronounce-or'),
  ur: document.getElementById('pronounce-ur')
};

// Target Languages Selection State (mandatory single target language)
let selectedTargetLangs = new Set();
let currentTargetCode = ''; // mandatory - must be chosen by user
let showOnlySelected = false;

function showTargetLangRequiredWarning() {
  const toSelect = document.getElementById('toLanguageSelect');
  if (toSelect) {
    toSelect.classList.add('field-required-highlight');
    toSelect.focus();
    setTimeout(() => {
      toSelect.classList.remove('field-required-highlight');
    }, 1800);
  }
  if (heroHint) {
    heroHint.innerHTML = "<span style='color:#ef4444; font-weight:700;'>⚠️ Target Language is Mandatory!</span> Please select which language to transfer into.";
  }
  if (statusText) {
    statusText.textContent = "Please select a Target Language first!";
  }
}

// Set FROM Language (Google Translate Style Dropdown)
function setFromLang(code) {
  currentInputLang = `${code}-IN`;

  // Update FROM dropdown
  const fromSelect = document.getElementById('fromLanguageSelect');
  if (fromSelect && fromSelect.value !== code) {
    fromSelect.value = code;
  }
  const uploadSelect = document.getElementById('uploadLangSelect');
  if (uploadSelect && uploadSelect.value !== code) {
    uploadSelect.value = code;
  }

  const info = LANG_MAP[code];
  const name = info ? `${info.flag} ${info.name}` : code.toUpperCase();
  detectedBadge.textContent = `Source: ${name}`;
  heroHint.innerHTML = `Source voice set to <em>${name}</em>. Click mic or upload audio!`;

  // Update recognition language if mic is active
  if (recognition) {
    const wasRecording = isRecording;
    if (wasRecording) {
      recognition.stop();
    }
    recognition.lang = (code === 'en') ? 'en-IN' : `${code}-IN`;
    if (wasRecording) {
      setTimeout(() => {
        try { recognition.start(); } catch (e) {}
      }, 300);
    }
  }

  updateRoutingSummary();
}

// Set TO Language (Google Translate Style Dropdown - Mandatory Choice)
function setToLang(code) {
  if (!code) {
    currentTargetCode = '';
    selectedTargetLangs.clear();
    updateCardVisibility();
    updateRoutingSummary();
    return;
  }

  currentTargetCode = code;

  // Update TO dropdown
  const toSelect = document.getElementById('toLanguageSelect');
  if (toSelect && toSelect.value !== code) {
    toSelect.value = code;
  }

  selectedTargetLangs = new Set([code]);

  updateCardVisibility();
  updateRoutingSummary();
}

// Google Translate Swap Languages (⇄)
function swapLanguages() {
  const fromSelect = document.getElementById('fromLanguageSelect');
  const fromVal = fromSelect ? fromSelect.value : 'en';

  if (!currentTargetCode) {
    showTargetLangRequiredWarning();
    return;
  }

  let newTarget = fromVal;
  let newSource = currentTargetCode;

  setFromLang(newSource);
  setToLang(newTarget);

  if (lastSpokenText) {
    requestTranslations(lastSpokenText);
  }
}

// Update Cards Grid visibility and active state
function updateCardVisibility() {
  const targetCountIndicator = document.getElementById('targetCountIndicator');
  if (targetCountIndicator) {
    if (!currentTargetCode) {
      targetCountIndicator.textContent = "Select Language *";
      targetCountIndicator.style.background = 'rgba(239, 68, 68, 0.15)';
      targetCountIndicator.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      targetCountIndicator.style.color = '#f87171';
    } else {
      const info = LANG_MAP[currentTargetCode];
      targetCountIndicator.textContent = `Transfer to ${info ? info.name : currentTargetCode.toUpperCase()} only`;
      targetCountIndicator.style.background = 'rgba(56, 189, 248, 0.15)';
      targetCountIndicator.style.borderColor = 'rgba(56, 189, 248, 0.35)';
      targetCountIndicator.style.color = '#38bdf8';
    }
  }

  const cardsCounter = document.getElementById('cardsCounter');
  if (cardsCounter) {
    if (!currentTargetCode) {
      cardsCounter.textContent = "No Target Selected";
    } else {
      cardsCounter.textContent = `1 Language Active (${LANG_MAP[currentTargetCode] ? LANG_MAP[currentTargetCode].name : currentTargetCode})`;
    }
  }

  TARGET_LANGS.forEach(lang => {
    const card = document.getElementById(`card-${lang.code}`);
    if (!card) return;

    const isSelected = selectedTargetLangs.has(lang.code);
    if (isSelected) {
      card.classList.remove('not-selected');
      card.classList.remove('hidden-by-filter');
    } else {
      card.classList.add('not-selected');
      card.classList.add('hidden-by-filter');
    }
  });
}

// Toggle "Show Selected Only" filter
function toggleViewFilter(checked) {
  showOnlySelected = checked;
  updateCardVisibility();
}

// Update summary text
function updateRoutingSummary() {
  const fromSelect = document.getElementById('fromLanguageSelect');
  const fromVal = fromSelect ? fromSelect.value : 'en';
  const fromName = (LANG_MAP[fromVal] ? LANG_MAP[fromVal].name : fromVal.toUpperCase());

  const importRouteSummary = document.getElementById('importRouteSummary');
  if (importRouteSummary) {
    if (!currentTargetCode) {
      importRouteSummary.innerHTML = `<span style="color:#ef4444; font-weight:700;">Route: ${fromName} ➔ [Target Language Mandatory - Select Above]</span>`;
    } else {
      const toName = LANG_MAP[currentTargetCode] ? LANG_MAP[currentTargetCode].name : currentTargetCode.toUpperCase();
      importRouteSummary.textContent = `Route: ${fromName} ➔ ${toName}`;
    }
  }
}

// Switch Input Voice Language Pill
function setInputLanguage(langCode) {
  currentInputLang = langCode;

  // Sync From Language Dropdown
  const fromSelect = document.getElementById('fromLanguageSelect');
  if (fromSelect) {
    const baseCode = (langCode === 'auto') ? 'auto' : langCode.split('-')[0];
    if (fromSelect.value !== baseCode) {
      fromSelect.value = baseCode;
    }
  }

  // Update pills UI
  const pills = document.querySelectorAll('.lang-pill');
  pills.forEach(p => {
    if (p.getAttribute('data-lang') === langCode) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  if (langCode === 'auto') {
    detectedBadge.textContent = '🌐 Auto-Detect: On (Speak in Any Language)';
    heroHint.innerHTML = "Auto-detect is <em>ACTIVE</em>. Speak in Tamil, English, Hindi, etc.";
  } else {
    const langKey = langCode.split('-')[0];
    const info = LANG_MAP[langKey];
    const name = info ? `${info.flag} ${info.name}` : langCode;
    detectedBadge.textContent = `Voice Model: ${name}`;
    heroHint.innerHTML = `Voice input set to <em>${name}</em>. Click mic & speak!`;
  }

  updateRoutingSummary();

  // Update recognition language
  if (recognition) {
    const wasRecording = isRecording;
    if (wasRecording) {
      recognition.stop();
    }
    recognition.lang = (langCode === 'auto') ? 'ta-IN' : langCode;
    if (wasRecording) {
      setTimeout(() => {
        try { recognition.start(); } catch (e) {}
      }, 300);
    }
  }
}

// Request Multi-Language Translation from Python Backend with Auto-Detection & Selected Targets
async function requestTranslations(spokenText) {
  if (!spokenText || spokenText.length < 2) return;
  lastSpokenText = spokenText;

  if (!currentTargetCode || selectedTargetLangs.size === 0) {
    showTargetLangRequiredWarning();
    return;
  }

  const targetArray = Array.from(selectedTargetLangs);
  const toInfo = LANG_MAP[currentTargetCode];
  statusText.textContent = `Translating into ${toInfo ? toInfo.name : currentTargetCode}...`;

  // Show loading spinner on ONLY the selected target cards
  targetArray.forEach(code => {
    if (textElements[code]) {
      textElements[code].innerHTML = '<span class="card-loader"><span class="spinner-ring"></span> Translating...</span>';
    }
  });

  try {
    const fromSelect = document.getElementById('fromLanguageSelect');
    let sourceCode = (fromSelect && fromSelect.value !== 'auto') ? fromSelect.value : ((currentInputLang === 'auto') ? 'auto' : currentInputLang.split('-')[0]);

    const resp = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: spokenText,
        source_lang: sourceCode,
        targets: targetArray
      })
    });

    if (resp.ok) {
      const data = await resp.json();
      lastTranslations = data.translations || {};
      const detected = data.detected_lang || 'ta';
      lastDetectedLang = detected;

      // Update Detected Language Badge
      const info = LANG_MAP[detected];
      if (info) {
        detectedBadge.textContent = `🎯 Detected: ${info.name} ${info.flag}`;
        detectedBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        detectedBadge.style.borderColor = '#10b981';
        detectedBadge.style.color = '#34d399';
        masterLangFlag.textContent = info.flag;
        masterLangTitle.textContent = `Spoken Voice (${info.name})`;
      } else {
        detectedBadge.textContent = `🎯 Detected: ${detected.toUpperCase()}`;
      }

      // Update text & pronunciation in selected cards
      if (data.translations) {
        targetArray.forEach(code => {
          const trans = data.translations[code];
          if (trans) {
            let textVal = (typeof trans === 'object') ? (trans.text || '') : trans;
            let pronVal = (typeof trans === 'object') ? (trans.pronounce || '') : '';

            // If this card is the detected language, display spoken text directly
            if (code === detected && !textVal) {
              textVal = spokenText;
            }

            // Update main script text
            if (textElements[code]) {
              textElements[code].textContent = textVal;
            }

            // Update pronunciation text
            if (pronounceElements[code]) {
              const wrap = document.getElementById(`pronounce-wrap-${code}`);
              if (pronVal && pronVal.trim().length > 0) {
                pronounceElements[code].textContent = pronVal;
                if (wrap) wrap.style.display = 'flex';
              } else {
                if (wrap && code === 'en') {
                  wrap.style.display = 'none';
                } else if (wrap && textVal) {
                  pronounceElements[code].textContent = textVal;
                  wrap.style.display = 'flex';
                }
              }
            }
          }
        });
      }

      statusText.textContent = `Done! Transferred to ${targetArray.length} languages (Detected: ${LANG_MAP[detected] ? LANG_MAP[detected].name : detected.toUpperCase()})`;
      setTimeout(() => {
        if (isRecording) statusText.textContent = "Hearing Voice (Listening...)";
        else statusText.textContent = "Ready to Listen";
      }, 1800);

      // Auto-Upload to Server if enabled and recording has cleanly finished
      if (autoUploadCheckbox && autoUploadCheckbox.checked && !isRecording && recordedAudioBlob) {
        autoUploadToServer(spokenText, data.translations, detected);
      }
    }
  } catch (err) {
    console.error("Translation fetch error:", err);
  }
}

// Auto-Upload recording + translations to Python backend server
async function autoUploadToServer(spokenText, translations, detectedLang) {
  let audioBase64 = null;
  if (recordedAudioBlob) {
    try {
      audioBase64 = await blobToBase64(recordedAudioBlob);
    } catch (e) {
      console.warn("Audio conversion error:", e);
    }
  }

  try {
    const payload = {
      detected_language: detectedLang,
      spoken_text: spokenText,
      translations: translations,
      audio_base64: audioBase64
    };

    const resp = await fetch('/api/save-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      const res = await resp.json();
      if (uploadStatusBar) {
        uploadStatusBar.style.display = 'flex';
        uploadStatusText.textContent = `Auto-Saved to server folder! (${res.id || 'Saved'}) [Detected: ${detectedLang.toUpperCase()}]`;
        setTimeout(() => {
          uploadStatusBar.style.display = 'none';
        }, 4000);
      }
    }
  } catch (err) {
    console.warn("Auto upload error:", err);
  }
}

// Helper: Convert Blob to Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Global audio tracker and in-memory TTS cache for language cards
let currentCardAudio = null;
let currentPlayingLang = null;
const ttsAudioCache = new Map();      // Key: `${langCode}:${repFlag}:${text}` -> Object URL (blob)
const ttsPendingFetches = new Map();  // Key: `${langCode}:${repFlag}:${text}` -> Promise<blobUrl>

const SPEAKER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
const STOP_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
const SPINNER_SVG = `<svg class="tts-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 0 1 9 9" stroke-linecap="round"/></svg>`;

// Fallback to browser SpeechSynthesis
function fallbackSpeechSynthesis(text, langCode) {
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
    const utterance = new SpeechSynthesisUtterance(text);
    const langObj = TARGET_LANGS.find(l => l.code === langCode);
    utterance.lang = (langObj && langObj.speechLang) ? langObj.speechLang : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => stopAllCardAudio();
    utterance.onerror = () => stopAllCardAudio();
    window.speechSynthesis.speak(utterance);
  } else {
    stopAllCardAudio();
  }
}

// Play audio given a Blob URL or Audio URL
function playAudioFromBlobUrl(blobUrl, langCode, card, speakBtn, text) {
  if (currentCardAudio) {
    try {
      currentCardAudio.pause();
      currentCardAudio.currentTime = 0;
    } catch(e) {}
    currentCardAudio = null;
  }

  currentPlayingLang = langCode;

  if (speakBtn) {
    speakBtn.classList.remove('is-loading');
    speakBtn.classList.add('is-playing');
    speakBtn.innerHTML = STOP_SVG;
    speakBtn.setAttribute('title', 'Click to Stop Playing');
  }

  if (card) {
    card.style.boxShadow = '0 0 25px rgba(239, 68, 68, 0.4)';
    card.style.borderColor = 'rgba(239, 68, 68, 0.7)';
  }

  const audio = new Audio(blobUrl);
  currentCardAudio = audio;

  audio.onended = () => {
    stopAllCardAudio();
  };

  audio.onerror = () => {
    fallbackSpeechSynthesis(text, langCode);
  };

  audio.play().catch(() => {
    fallbackSpeechSynthesis(text, langCode);
  });
}

// Stop any currently playing card audio
function stopAllCardAudio() {
  if (currentCardAudio) {
    try {
      currentCardAudio.pause();
      currentCardAudio.currentTime = 0;
    } catch(e) {}
    currentCardAudio = null;
  }
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
  }
  if (currentPlayingLang) {
    const prevCard = document.getElementById(`card-${currentPlayingLang}`);
    if (prevCard) {
      prevCard.style.boxShadow = '';
      prevCard.style.borderColor = '';
      const prevBtn = prevCard.querySelector('.speak-btn');
      if (prevBtn) {
        prevBtn.innerHTML = SPEAKER_SVG;
        prevBtn.classList.remove('is-playing', 'is-loading');
        prevBtn.setAttribute('title', 'Listen Native Voice');
      }
    }
    currentPlayingLang = null;
  }
}

// Play / Stop Voice Audio for any language card (Toggle Functionality with In-Memory Caching)
async function speakLanguage(langCode) {
  // If user clicked the SAME card that is currently playing or loading -> STOP IT!
  if (currentPlayingLang === langCode) {
    stopAllCardAudio();
    return;
  }

  // Stop any other currently playing card first
  stopAllCardAudio();

  const textEl = textElements[langCode];
  if (!textEl || !textEl.textContent) return;
  const text = textEl.textContent.trim();
  if (!text) return;

  const card = document.getElementById(`card-${langCode}`) || textEl.closest('.card');
  const speakBtn = card ? card.querySelector('.speak-btn') : null;

  const repFlag = isOwnVoiceEnabled ? 1 : 0;
  const cacheKey = `${langCode}:${repFlag}:${text}`;

  // 1. Check in-memory cache: if already generated, DO NOT hit modal/model API again!
  if (ttsAudioCache.has(cacheKey)) {
    const cachedUrl = ttsAudioCache.get(cacheKey);
    playAudioFromBlobUrl(cachedUrl, langCode, card, speakBtn, text);
    return;
  }

  // 2. Not cached yet: show loading spinner and fetch from model API once
  currentPlayingLang = langCode;

  if (speakBtn) {
    speakBtn.classList.remove('is-playing');
    speakBtn.classList.add('is-loading');
    speakBtn.innerHTML = SPINNER_SVG;
    speakBtn.setAttribute('title', 'Generating voice from model...');
  }

  if (card) {
    card.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.3)';
    card.style.borderColor = 'rgba(99, 102, 241, 0.6)';
  }

  try {
    let fetchPromise = ttsPendingFetches.get(cacheKey);
    if (!fetchPromise) {
      const audioUrl = `/api/tts?lang=${encodeURIComponent(langCode)}&text=${encodeURIComponent(text)}&replicate=${repFlag}`;
      fetchPromise = fetch(audioUrl)
        .then(async (res) => {
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
          const blob = await res.blob();
          if (blob.size < 100) throw new Error("Empty audio response");
          const blobUrl = URL.createObjectURL(blob);
          ttsAudioCache.set(cacheKey, blobUrl);
          return blobUrl;
        })
        .finally(() => {
          ttsPendingFetches.delete(cacheKey);
        });
      ttsPendingFetches.set(cacheKey, fetchPromise);
    }

    const blobUrl = await fetchPromise;

    // Only play if the user is still waiting for this card
    if (currentPlayingLang === langCode) {
      playAudioFromBlobUrl(blobUrl, langCode, card, speakBtn, text);
    }
  } catch (err) {
    console.warn("TTS model request failed, using browser speech synthesis fallback:", err);
    if (currentPlayingLang === langCode) {
      fallbackSpeechSynthesis(text, langCode);
    }
  }
}

// Download Audio (MP3) for any language card (uses cache if available)
function downloadLanguageAudio(langCode) {
  const textEl = textElements[langCode];
  if (!textEl || !textEl.textContent) return;
  const text = textEl.textContent.trim();
  if (!text) return;

  const repFlag = isOwnVoiceEnabled ? 1 : 0;
  const cacheKey = `${langCode}:${repFlag}:${text}`;

  if (ttsAudioCache.has(cacheKey)) {
    const blobUrl = ttsAudioCache.get(cacheKey);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${langCode}_translation.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const audioUrl = `/api/tts?lang=${encodeURIComponent(langCode)}&text=${encodeURIComponent(text)}&replicate=${repFlag}`;
  const link = document.createElement('a');
  link.href = audioUrl;
  link.download = `${langCode}_translation.mp3`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Copy Card Text to Clipboard
function copyLanguage(langCode) {
  const textEl = textElements[langCode];
  if (!textEl) return;
  navigator.clipboard.writeText(textEl.textContent).then(() => {
    alert(`Copied ${langCode.toUpperCase()} text to clipboard!`);
  });
}

// Play / Pause User's Own Recorded Mic Audio or Uploaded Media (Toggle)
function playMyRecording() {
  stopAllCardAudio();
  if (mediaPlayerContainer) mediaPlayerContainer.style.display = 'block';

  if (videoContainer && videoContainer.style.display !== 'none' && uploadedVideoPlayer && uploadedVideoPlayer.src) {
    if (!uploadedVideoPlayer.paused) {
      uploadedVideoPlayer.pause();
    } else {
      uploadedVideoPlayer.play().catch(e => console.warn("Video play error:", e));
    }
  } else if (recordedAudioPlayer && recordedAudioPlayer.src) {
    if (audioPlayerWrap) audioPlayerWrap.style.display = 'block';
    if (!recordedAudioPlayer.paused) {
      recordedAudioPlayer.pause();
    } else {
      recordedAudioPlayer.play().catch(e => console.warn("Audio play error:", e));
    }
  }
}

// Download User's Own Recorded Mic Audio or Uploaded Media File
function downloadMyRecording() {
  if (!recordedAudioBlob) {
    alert("No spoken voice recorded or imported yet!");
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(recordedAudioBlob);
  const ext = (recordedAudioBlob.type && recordedAudioBlob.type.includes('mp4')) 
    ? 'mp4' 
    : (recordedAudioBlob.name && recordedAudioBlob.name.includes('.'))
      ? recordedAudioBlob.name.split('.').pop()
      : 'webm';
  link.download = `voice_media_${Date.now()}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export All Translations to a Text File
function downloadAllTranslations() {
  if (!lastSpokenText) {
    alert("First speak something to translate!");
    return;
  }

  let content = "=== BHARAT MULTILINGUAL VOICE STUDIO RECORD ===\n";
  content += `Date & Time: ${new Date().toLocaleString()}\n`;
  content += `Detected Language: ${lastDetectedLang.toUpperCase()}\n`;
  content += `Spoken Voice: ${lastSpokenText}\n\n`;
  content += "--- 12 SIMULTANEOUS TRANSLATIONS & PRONUNCIATIONS ---\n\n";

  TARGET_LANGS.forEach((lang, idx) => {
    const textEl = textElements[lang.code];
    const pronEl = pronounceElements[lang.code];
    const textVal = textEl ? textEl.textContent : '';
    const pronVal = pronEl ? pronEl.textContent : '';
    content += `${idx + 1}. ${lang.name} [${lang.code.toUpperCase()}]:\n`;
    content += `   Text: ${textVal}\n`;
    if (pronVal && pronVal.length > 0) {
      content += `   Pronunciation (How to speak): ${pronVal}\n`;
    }
    content += "\n";
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `multilingual_translations_${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Re-translate when user edits the speech box directly
function retranslateCurrentText() {
  const currentText = spokenTextEl.innerText.trim();
  if (!currentText) return;
  lastSpokenText = currentText;

  const targetArray = Array.from(selectedTargetLangs);
  statusText.textContent = `Updating Translations for ${targetArray.length} chosen languages...`;
  if (uploadStatusBar) {
    uploadStatusBar.style.display = 'flex';
    uploadStatusText.textContent = `🔄 Re-translating edited text into ${targetArray.length} selected languages...`;
  }

  targetArray.forEach(code => {
    if (textElements[code] && code !== lastDetectedLang) {
      textElements[code].innerHTML = '<span class="card-loader"><span class="spinner-ring"></span> Updating...</span>';
    }
  });

  requestTranslations(currentText);
}

// Trigger Manual Audio File Upload
function triggerAudioUpload() {
  if (isRecording) {
    alert("Microphone is actively recording! Please stop the microphone before importing audio/video.");
    return;
  }
  if (!currentTargetCode) {
    showTargetLangRequiredWarning();
    return;
  }
  if (audioFileInput) {
    audioFileInput.click();
  }
}

// Handle User Uploaded Audio / Video File (Transfers speech ONLY to chosen languages)
async function handleAudioFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Mutual Exclusivity: Stop any ongoing mic recording
  if (isRecording) {
    isRecording = false;
    if (recognition) {
      try { recognition.stop(); } catch(e) {}
    }
    stopAudioVisualizerAndRecording();
    updateRecordingUI(false);
  }

  if (!currentTargetCode || selectedTargetLangs.size === 0) {
    showTargetLangRequiredWarning();
    event.target.value = '';
    return;
  }

  // Mutually Exclusive state: IMPORT ACTIVE
  isImportingAudio = true;
  if (micBtn) {
    micBtn.disabled = true;
    micBtn.classList.add('disabled');
    micBtn.title = "Audio import in progress... Please wait";
  }
  const micContainer = document.querySelector('.mic-container');
  if (micContainer) micContainer.classList.add('disabled');

  const targetArray = Array.from(selectedTargetLangs);

  const isVideo = file.type.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm|flv|wmv|m4v|3gp)$/i.test(file.name);
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const url = URL.createObjectURL(file);

  recordedAudioUrl = url;
  recordedAudioBlob = file;

  if (mediaPlayerContainer) mediaPlayerContainer.style.display = 'block';

  if (isVideo) {
    if (videoContainer) videoContainer.style.display = 'block';
    if (uploadedVideoPlayer) {
      uploadedVideoPlayer.src = url;
      uploadedVideoPlayer.load();
    }
    if (audioPlayerWrap) audioPlayerWrap.style.display = 'none';
    if (masterLangTitle) masterLangTitle.textContent = `Uploaded Video (${file.name})`;
  } else {
    if (videoContainer) {
      videoContainer.style.display = 'none';
      if (uploadedVideoPlayer) uploadedVideoPlayer.pause();
    }
    if (audioPlayerWrap) {
      audioPlayerWrap.style.display = 'block';
      if (recordedAudioPlayer) {
        try { recordedAudioPlayer.pause(); } catch(e) {}
        recordedAudioPlayer.currentTime = 0;
        recordedAudioPlayer.src = url;
        recordedAudioPlayer.load();
        try { recordedAudioPlayer.pause(); } catch(e) {}
      }
    }
    if (masterLangTitle) masterLangTitle.textContent = `Uploaded Audio (${file.name})`;
  }

  if (playMyAudioBtn) playMyAudioBtn.disabled = false;
  if (downloadMyAudioBtn) downloadMyAudioBtn.disabled = false;

  spokenTextEl.textContent = `Processing "${file.name}" (${fileSizeMB} MB)... Extracting speech & transferring into ${targetArray.length} chosen languages...`;
  statusText.textContent = `Extracting words & transferring to ${targetArray.length} languages...`;
  if (uploadStatusBar) {
    uploadStatusBar.style.display = 'flex';
    uploadStatusText.textContent = `⏳ Uploading "${file.name}" (${fileSizeMB} MB) & transferring to ${targetArray.length} chosen languages...`;
  }

  // Show loading spinner on ONLY the selected target language cards
  targetArray.forEach(code => {
    if (textElements[code]) {
      textElements[code].innerHTML = '<span class="card-loader"><span class="spinner-ring"></span> Transcribing & transferring...</span>';
    }
  });

  // Mark non-selected cards with friendly message
  TARGET_LANGS.forEach(lang => {
    if (!selectedTargetLangs.has(lang.code) && textElements[lang.code]) {
      textElements[lang.code].innerHTML = '<span class="card-not-selected-banner">(Not selected for this transfer)</span>';
    }
  });

  try {
    const fromSelect = document.getElementById('fromLanguageSelect');
    let chosenLang = fromSelect ? fromSelect.value : 'auto';
    if (chosenLang === 'auto') {
      const uploadLangSelect = document.getElementById('uploadLangSelect');
      if (uploadLangSelect && uploadLangSelect.value !== 'auto') {
        chosenLang = uploadLangSelect.value;
      } else if (currentInputLang !== 'auto') {
        chosenLang = currentInputLang.split('-')[0];
      }
    }

    // Direct binary streaming upload - passing X-Source-Lang and X-Target-Langs!
    const resp = await fetch('/api/upload-media', {
      method: 'POST',
      headers: {
        'X-Filename': encodeURIComponent(file.name),
        'X-Source-Lang': chosenLang,
        'X-Target-Langs': targetArray.join(','),
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });

    if (resp.ok) {
      const data = await resp.json();
      const transcribed = data.transcribed_text || "";
      const detected = data.detected_lang || "ta";
      lastSpokenText = transcribed;
      lastTranslations = data.translations || {};
      lastDetectedLang = detected;

      // Update spoken text display with the extracted words!
      spokenTextEl.textContent = transcribed;
      if (speechEditToolbar) speechEditToolbar.style.display = 'flex';

      // Update detected badge
      const info = LANG_MAP[detected];
      if (info) {
        detectedBadge.textContent = `🎯 Detected from File: ${info.name} ${info.flag}`;
        detectedBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        detectedBadge.style.borderColor = '#10b981';
        detectedBadge.style.color = '#34d399';
        masterLangFlag.textContent = info.flag;
        masterLangTitle.textContent = `${isVideo ? 'Uploaded Video' : 'Uploaded Audio'} (${info.name})`;
      } else {
        detectedBadge.textContent = `🎯 Detected: ${detected.toUpperCase()}`;
      }

      // Update ONLY the chosen target language cards!
      if (data.translations) {
        targetArray.forEach(code => {
          const trans = data.translations[code];
          if (trans) {
            let textVal = (typeof trans === 'object') ? (trans.text || '') : trans;
            let pronVal = (typeof trans === 'object') ? (trans.pronounce || '') : '';

            if (code === detected && !textVal) {
              textVal = transcribed;
            }

            if (textElements[code]) {
              textElements[code].textContent = textVal;
            }

            if (pronounceElements[code]) {
              const wrap = document.getElementById(`pronounce-wrap-${code}`);
              if (pronVal && pronVal.trim().length > 0) {
                pronounceElements[code].textContent = pronVal;
                if (wrap) wrap.style.display = 'flex';
              } else {
                if (wrap && code === 'en') {
                  wrap.style.display = 'none';
                } else if (wrap && textVal) {
                  pronounceElements[code].textContent = textVal;
                  wrap.style.display = 'flex';
                }
              }
            }
          }
        });
      }

      if (data.speaker_profile) {
        updateSpeakerBadge(data.speaker_profile);
      }

      const targetNames = targetArray.map(c => LANG_MAP[c] ? LANG_MAP[c].name : c.toUpperCase()).join(', ');
      statusText.textContent = `Extracted! Transferred to ${targetArray.length} languages (${targetNames})`;
      if (uploadStatusBar) {
        uploadStatusBar.style.display = 'flex';
        uploadStatusText.textContent = `✅ Extracted speech from "${file.name}" & transferred to ${targetArray.length} chosen languages: [${targetNames}]!`;
        setTimeout(() => { uploadStatusBar.style.display = 'none'; }, 6000);
      }
    } else {
      const errData = await resp.json().catch(() => ({}));
      spokenTextEl.textContent = `Media extraction failed: ${errData.error || 'No speech found in file'}`;
      if (uploadStatusBar) {
        uploadStatusBar.style.display = 'flex';
        uploadStatusText.textContent = `❌ ${errData.error || 'Failed to extract speech from file'}`;
      }
    }
  } catch (err) {
    console.error("Media upload error:", err);
    spokenTextEl.textContent = `Error uploading media: ${err.message}`;
    if (uploadStatusBar) {
      uploadStatusBar.style.display = 'flex';
      uploadStatusText.textContent = `❌ ${err.message}`;
    }
  } finally {
    // Reset Mutually Exclusive state: IMPORT COMPLETE
    isImportingAudio = false;
    if (micBtn) {
      micBtn.disabled = false;
      micBtn.classList.remove('disabled');
      micBtn.title = "Toggle Microphone";
    }
    const micContainer = document.querySelector('.mic-container');
    if (micContainer) micContainer.classList.remove('disabled');
    if (event.target) event.target.value = '';
  }
}

// Helper: Update recording state in UI
function updateRecordingUI(active) {
  const micContainer = document.querySelector('.mic-container');
  const gtImportBtn = document.querySelector('.gt-import-btn');
  const uploadToolBtn = document.querySelector('.upload-tool-btn');

  if (active) {
    if (micBtn) micBtn.classList.add('recording');
    if (micContainer) micContainer.classList.add('active');
    if (statusBadge) statusBadge.classList.add('listening');
    if (statusText) statusText.textContent = "Hearing Voice (Listening...)";
    if (heroHint) heroHint.innerHTML = "Mic is <em>ACTIVE</em>. Speak now...";

    // Pause any playing media when mic starts
    if (recordedAudioPlayer) {
      try { recordedAudioPlayer.pause(); } catch (e) {}
    }
    if (uploadedVideoPlayer) {
      try { uploadedVideoPlayer.pause(); } catch (e) {}
    }

    // Mutual exclusivity: Disable import buttons while recording
    if (gtImportBtn) {
      gtImportBtn.disabled = true;
      gtImportBtn.classList.add('disabled');
      gtImportBtn.title = "Microphone is recording... Stop mic to import audio";
    }
    if (uploadToolBtn) {
      uploadToolBtn.disabled = true;
      uploadToolBtn.classList.add('disabled');
    }
    if (audioFileInput) audioFileInput.disabled = true;
  } else {
    if (micBtn) micBtn.classList.remove('recording');
    if (micContainer) micContainer.classList.remove('active');
    if (statusBadge) statusBadge.classList.remove('listening');
    if (statusText) statusText.textContent = "Ready to Listen";
    if (heroHint) heroHint.innerHTML = "Click the microphone & speak or import audio!";

    // Mutual exclusivity: Re-enable import buttons
    if (gtImportBtn) {
      gtImportBtn.disabled = false;
      gtImportBtn.classList.remove('disabled');
      gtImportBtn.title = "Import audio/video to transfer into chosen languages";
    }
    if (uploadToolBtn) {
      uploadToolBtn.disabled = false;
      uploadToolBtn.classList.remove('disabled');
    }
    if (audioFileInput) audioFileInput.disabled = false;
  }
}

// Helper: Detect best supported recording MIME type
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4'
  ];
  for (const t of types) {
    if (window.MediaRecorder && typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

// Speech Recognition Init
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    statusText.textContent = "Web Speech Not Supported (Use Chrome/Edge)";
    statusBadge.classList.add('listening');
    return null;
  }

  const rec = new SpeechRecognition();
  rec.lang = (currentInputLang === 'auto') ? 'ta-IN' : currentInputLang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    // Only synchronize UI - do NOT restart MediaRecorder or wipe audioChunks here!
    if (isRecording) {
      updateRecordingUI(true);
    }
  };

  rec.onend = () => {
    if (isRecording) {
      // Speech recognition automatically paused in Chrome/Edge. Keep speech recognizer alive!
      try { rec.start(); } catch (e) {}
    } else {
      updateRecordingUI(false);
    }
  };

  rec.onerror = (event) => {
    console.warn("Speech recognition error:", event.error);
    if (event.error === 'not-allowed' || event.error === 'audio-capture') {
      isRecording = false;
      stopAudioVisualizerAndRecording();
      updateRecordingUI(false);
      alert("Microphone Access Required:\n\n1. Check Windows Settings -> Privacy -> Microphone (ensure 'Let desktop apps access your microphone' is ON).\n2. If needed, click '🌐 Open in Browser' in the top right to open in Chrome/Edge with standard browser permissions.");
    }
  };

  let debounceTimer = null;
  rec.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    let hasFinal = false;

    for (let i = 0; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
        hasFinal = true;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    const displayText = (finalTranscript + interimTranscript).trim();
    if (displayText) {
      spokenTextEl.textContent = displayText;
      if (speechEditToolbar) speechEditToolbar.style.display = 'flex';
      
      // Only fire translation on final sentence or after at least 800ms of pause
      clearTimeout(debounceTimer);
      const delay = hasFinal ? 400 : 900;
      debounceTimer = setTimeout(() => {
        if (displayText !== lastSpokenText) {
          requestTranslations(displayText);
        }
      }, delay);
    }
  };

  return rec;
}

// Real-time Canvas Soundwave Visualizer & MediaRecorder
function startAudioVisualizerAndRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    return;
  }
  if (mediaStream) {
    try { mediaStream.getTracks().forEach(t => t.stop()); } catch (e) {}
    mediaStream = null;
  }
  audioChunks = [];

  navigator.mediaDevices.getUserMedia({ 
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    } 
  }).then((stream) => {
    mediaStream = stream;
    audioChunks = [];

    const preferredMime = getSupportedMimeType();
    const recorderOptions = preferredMime ? { mimeType: preferredMime } : {};

    // Start MediaRecorder for audio playback and download
    try {
      mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };
      mediaRecorder.onstop = () => {
        if (audioChunks.length > 0) {
          const finalMime = (mediaRecorder && mediaRecorder.mimeType) || preferredMime || 'audio/webm';
          recordedAudioBlob = new Blob(audioChunks, { type: finalMime });
          if (recordedAudioUrl) {
            try { URL.revokeObjectURL(recordedAudioUrl); } catch (e) {}
          }
          recordedAudioUrl = URL.createObjectURL(recordedAudioBlob);
          if (recordedAudioPlayer) {
            recordedAudioPlayer.src = recordedAudioUrl;
            recordedAudioPlayer.load();

            // Fix Chromium WebM duration Infinity bug
            recordedAudioPlayer.onloadedmetadata = () => {
              if (recordedAudioPlayer.duration === Infinity) {
                recordedAudioPlayer.currentTime = 1e101;
                recordedAudioPlayer.ontimeupdate = () => {
                  recordedAudioPlayer.ontimeupdate = null;
                  recordedAudioPlayer.currentTime = 0;
                };
              }
            };
          }
          if (mediaPlayerContainer) mediaPlayerContainer.style.display = 'block';
          if (videoContainer) videoContainer.style.display = 'none';
          if (audioPlayerWrap) audioPlayerWrap.style.display = 'block';
          if (playMyAudioBtn) playMyAudioBtn.disabled = false;
          if (downloadMyAudioBtn) downloadMyAudioBtn.disabled = false;

          // Auto upload to server once recording has cleanly finished
          if (autoUploadCheckbox && autoUploadCheckbox.checked && lastSpokenText) {
            autoUploadToServer(lastSpokenText, lastTranslations, lastDetectedLang);
          }
        }
      };
      mediaRecorder.start(250); // Record chunks every 250ms
    } catch (e) {
      console.warn("MediaRecorder init error:", e);
    }

    // Audio Visualizer
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 64;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function draw() {
        if (!isRecording) {
          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
          const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#6366f1');
          gradient.addColorStop(1, '#06b6d4');
          
          canvasCtx.fillStyle = gradient;
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
          x += barWidth + 1;
        }
      }
      draw();
    } catch (e) {
      console.warn("Visualizer audioContext error:", e);
    }
  }).catch((e) => {
    console.error("Visualizer mic error:", e);
    isRecording = false;
    updateRecordingUI(false);
    if (statusText) statusText.textContent = "Microphone access blocked. Click 'Open in Browser' at top right.";
    alert("Microphone Access Blocked:\n\n1. Ensure your microphone is connected.\n2. In Windows Settings -> Privacy -> Microphone, ensure 'Let desktop apps access your microphone' is ON.\n3. Or click '🌐 Open in Browser' at the top bar to run in Chrome/Edge directly.");
  });
}

function stopAudioVisualizerAndRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      if (typeof mediaRecorder.requestData === 'function') {
        mediaRecorder.requestData();
      }
    } catch (e) {}
    try { mediaRecorder.stop(); } catch (e) {}
  }
  if (audioContext && audioContext.state !== 'closed') {
    try { audioContext.close(); } catch (e) {}
    audioContext = null;
  }
  if (mediaStream) {
    try {
      mediaStream.getTracks().forEach(track => track.stop());
    } catch (e) {}
    mediaStream = null;
  }
}

// Toggle Mic Button
micBtn.addEventListener('click', () => {
  if (isImportingAudio) {
    alert("Audio import is currently processing! Please wait until it completes.");
    return;
  }
  if (!currentTargetCode) {
    showTargetLangRequiredWarning();
    return;
  }

  if (isRecording) {
    // STOP RECORDING
    isRecording = false;
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
    stopAudioVisualizerAndRecording();
    updateRecordingUI(false);
  } else {
    // START RECORDING
    isRecording = true;
    updateRecordingUI(true);
    startAudioVisualizerAndRecording();
    if (!recognition) {
      recognition = initSpeechRecognition();
    }
    if (recognition) {
      try { recognition.start(); } catch (e) {}
    }
  }
});

// ===================================================
// GEMINI AI KEY & STATUS MANAGEMENT
// ===================================================

async function checkGeminiKeyStatus() {
  try {
    const res = await fetch('/api/key-status');
    if (res.ok) {
      const data = await res.json();
      renderGeminiStatus(data);
    }
  } catch (err) {
    console.warn("Could not check Gemini key status:", err);
  }
}

function renderGeminiStatus(data) {
  const loginBtn = document.getElementById('googleLoginBtn');
  const profileBadge = document.getElementById('userProfileBadge');
  const keyMaskSpan = document.getElementById('userGeminiKeyMask');
  const geminiInput = document.getElementById('geminiApiKeyInput');
  const feedbackMsg = document.getElementById('keyFeedbackMsg');

  if (data && data.gemini_connected) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (profileBadge) profileBadge.style.display = 'flex';
    if (keyMaskSpan) keyMaskSpan.textContent = data.gemini_masked_key || 'Connected';
    if (geminiInput && !geminiInput.value) {
      geminiInput.placeholder = data.gemini_masked_key || 'Key saved';
    }
    if (feedbackMsg) {
      feedbackMsg.className = 'key-feedback-msg success';
      feedbackMsg.textContent = `✨ Gemini Key Connected (${data.gemini_masked_key || 'Active'}). You can paste a new key anytime to update.`;
      feedbackMsg.style.display = 'block';
    }
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (profileBadge) profileBadge.style.display = 'none';
    if (feedbackMsg) feedbackMsg.style.display = 'none';
  }
}

function openGoogleLoginModal() {
  const modal = document.getElementById('googleAuthModal');
  if (modal) {
    modal.style.display = 'flex';
    checkGeminiKeyStatus();
  }
}

function closeGoogleLoginModal() {
  const modal = document.getElementById('googleAuthModal');
  if (modal) modal.style.display = 'none';
}

function handleModalOverlayClick(event) {
  if (event.target.id === 'googleAuthModal') {
    closeGoogleLoginModal();
  }
}

async function openGeminiAIStudioLink() {
  try {
    await fetch('/api/open-gemini-link');
  } catch (e) {
    window.open('https://aistudio.google.com/app/apikey', '_blank');
  }
}

function toggleKeyVisibility() {
  const input = document.getElementById('geminiApiKeyInput');
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const input = document.getElementById('geminiApiKeyInput');
    if (input && text) {
      input.value = text.trim();
    }
  } catch (err) {
    alert("Please allow clipboard access or press Ctrl+V to paste your key.");
  }
}

async function saveGeminiApiKey() {
  const input = document.getElementById('geminiApiKeyInput');
  const btn = document.getElementById('btnSaveGemini');
  const feedbackMsg = document.getElementById('keyFeedbackMsg');
  
  const key = input ? input.value.trim() : '';
  if (!key) {
    if (feedbackMsg) {
      feedbackMsg.className = 'key-feedback-msg error';
      feedbackMsg.textContent = '⚠️ API Key is empty. Please enter your Gemini key.';
      feedbackMsg.style.display = 'block';
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Verifying with Google AI...</span>';
  }
  if (feedbackMsg) {
    feedbackMsg.className = 'key-feedback-msg info';
    feedbackMsg.textContent = 'Google AI authentication test running... Please wait.';
    feedbackMsg.style.display = 'block';
  }

  try {
    const resp = await fetch('/api/save-gemini-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key })
    });
    const result = await resp.json();

    if (resp.ok && result.status === 'success') {
      if (feedbackMsg) {
        feedbackMsg.className = 'key-feedback-msg success';
        feedbackMsg.textContent = `✅ ${result.message || 'Gemini Key connected!'}`;
        feedbackMsg.style.display = 'block';
      }
      if (input) input.value = '';
      checkGeminiKeyStatus();

      if (uploadStatusBar) {
        uploadStatusBar.style.display = 'flex';
        uploadStatusText.textContent = `✨ Gemini AI Active! Multimodal Audio & 12 Languages translation ready.`;
        setTimeout(() => { uploadStatusBar.style.display = 'none'; }, 4000);
      }

      setTimeout(() => {
        closeGoogleLoginModal();
      }, 1500);
    } else {
      if (feedbackMsg) {
        feedbackMsg.className = 'key-feedback-msg error';
        feedbackMsg.textContent = `❌ ${result.error || 'Invalid API Key. Please check and try again.'}`;
        feedbackMsg.style.display = 'block';
      }
    }
  } catch (err) {
    if (feedbackMsg) {
      feedbackMsg.className = 'key-feedback-msg error';
      feedbackMsg.textContent = `❌ Network Error: ${err.message}`;
      feedbackMsg.style.display = 'block';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>✨ Connect & Verify Key</span>';
    }
  }
}

// Speaker Voice Replication & Own Voice Switch Controller (No Modal)
function updateOwnVoiceToggleUI(active) {
  isOwnVoiceEnabled = active;
  const toggle = document.getElementById('ownVoiceToggle');
  const wrap = document.getElementById('ownVoiceToggleWrap');
  const pill = document.getElementById('ownVoiceStatePill');

  if (toggle) toggle.checked = active;

  if (active) {
    if (wrap) {
      wrap.classList.remove('voice-off');
      wrap.title = "Own Voice active. Own voice has limited tokens, use consciously! Switch to Default AI Voice to save tokens.";
    }
    if (pill) {
      pill.textContent = "Fish Clone";
    }
  } else {
    if (wrap) {
      wrap.classList.add('voice-off');
      wrap.title = "Default AI Voice active. Own voice has limited tokens, use consciously — switch to Own Voice if needed.";
    }
    if (pill) {
      pill.textContent = "Default AI Voice";
    }
  }
}

async function toggleOwnVoiceClone(checked) {
  updateOwnVoiceToggleUI(checked);
  try {
    await fetch('/api/toggle-voice-replication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: checked })
    });
  } catch (err) {
    console.warn("Could not sync voice replication toggle:", err);
  }
}

async function checkSpeakerVoiceProfile() {
  try {
    const res = await fetch('/api/speaker-profile');
    if (res.ok) {
      const data = await res.json();
      if (data && data.profile) {
        // Default to false (Default AI Voice) so tokens are conserved, user switches if needed
        const isActive = data.profile.replicate_active === true;
        updateOwnVoiceToggleUI(isActive);
      } else {
        updateOwnVoiceToggleUI(false);
      }
    }
  } catch (err) {
    console.warn("Could not fetch speaker voice profile:", err);
    updateOwnVoiceToggleUI(false);
  }
}

// Auto initialize on load
window.addEventListener('DOMContentLoaded', () => {
  checkGeminiKeyStatus();
  checkSpeakerVoiceProfile();
  setFromLang('en'); // Default source English
  setToLang('ta');   // Default target Tamil (user can switch anytime)
  updateCardVisibility();
  updateRoutingSummary();
  recognition = initSpeechRecognition();

  if (recordedAudioPlayer) {
    recordedAudioPlayer.addEventListener('play', () => {
      stopAllCardAudio();
      if (playMyAudioBtn) playMyAudioBtn.textContent = '⏸ Pause Audio';
    });
    recordedAudioPlayer.addEventListener('pause', () => {
      if (playMyAudioBtn) playMyAudioBtn.textContent = '▶ Play My Audio';
    });
    recordedAudioPlayer.addEventListener('ended', () => {
      if (playMyAudioBtn) playMyAudioBtn.textContent = '▶ Play My Audio';
    });
  }

  if (uploadedVideoPlayer) {
    uploadedVideoPlayer.addEventListener('play', () => {
      stopAllCardAudio();
      if (playMyAudioBtn) playMyAudioBtn.textContent = '⏸ Pause Audio';
    });
    uploadedVideoPlayer.addEventListener('pause', () => {
      if (playMyAudioBtn) playMyAudioBtn.textContent = '▶ Play My Audio';
    });
    uploadedVideoPlayer.addEventListener('ended', () => {
      if (playMyAudioBtn) playMyAudioBtn.textContent = '▶ Play My Audio';
    });
  }
});

