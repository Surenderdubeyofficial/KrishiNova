const SARVAM_API_BASE_URL = process.env.SARVAM_API_BASE_URL || "https://api.sarvam.ai";
const SARVAM_DEFAULT_TTS_MODEL = process.env.SARVAM_TTS_MODEL || "bulbul:v3";
const SARVAM_DEFAULT_STT_MODEL = process.env.SARVAM_STT_MODEL || "saaras:v3";
const SARVAM_DEFAULT_SPEAKER = process.env.SARVAM_TTS_SPEAKER || "anand";
const SARVAM_DEFAULT_TRANSLATE_MODEL = process.env.SARVAM_TRANSLATE_MODEL || "sarvam-translate:v1";
const SARVAM_DEFAULT_CHAT_MODEL = process.env.SARVAM_CHAT_MODEL || "sarvam-30b";

const SUPPORTED_LANGUAGES = [
  "en-IN",
  "hi-IN",
  "bn-IN",
  "ta-IN",
  "te-IN",
  "kn-IN",
  "mr-IN",
  "gu-IN",
  "ml-IN",
  "pa-IN",
  "od-IN",
  "as-IN",
  "brx-IN",
  "doi-IN",
  "kok-IN",
  "ks-IN",
  "mai-IN",
  "mni-IN",
  "ne-IN",
  "sa-IN",
  "sat-IN",
  "sd-IN",
  "ur-IN",
];
const TRANSLITERATION_LANGUAGES = ["en-IN", "hi-IN", "bn-IN", "gu-IN", "kn-IN", "ml-IN", "mr-IN", "od-IN", "pa-IN", "ta-IN", "te-IN"];
const SUPPORTED_SPEAKERS = [
  "shubh",
  "aditya",
  "ritu",
  "priya",
  "neha",
  "rahul",
  "pooja",
  "rohan",
  "simran",
  "kavya",
  "amit",
  "dev",
  "ishita",
  "shreya",
  "ratan",
  "varun",
  "manan",
  "sumit",
  "roopa",
  "kabir",
  "aayan",
  "ashutosh",
  "advait",
  "anand",
  "tanya",
  "tarun",
  "sunny",
  "mani",
  "gokul",
  "vijay",
  "shruti",
  "suhani",
  "mohit",
  "kavitha",
  "rehan",
  "soham",
  "rupali",
];

function getSarvamKey() {
  return process.env.SARVAM_API_KEY || process.env.SARVAM_API_SUBSCRIPTION_KEY || "";
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeLanguage(language, fallback = "hi-IN") {
  return SUPPORTED_LANGUAGES.includes(language) ? language : fallback;
}

function normalizeTransliterationLanguage(language, fallback = "hi-IN") {
  return TRANSLITERATION_LANGUAGES.includes(language) ? language : fallback;
}

function normalizeSpeaker(speaker) {
  const normalized = String(speaker || SARVAM_DEFAULT_SPEAKER).trim().toLowerCase();
  return SUPPORTED_SPEAKERS.includes(normalized) ? normalized : SARVAM_DEFAULT_SPEAKER;
}

function assertConfigured() {
  if (!getSarvamKey()) {
    const error = new Error("Sarvam AI API key is not configured. Add SARVAM_API_KEY in backend .env.");
    error.status = 503;
    throw error;
  }
}

async function readSarvamError(response) {
  const text = await response.text().catch(() => "");
  try {
    const json = JSON.parse(text);
    return json.message || json.error?.message || json.detail || text;
  } catch {
    return text;
  }
}

export function getSarvamStatus() {
  return {
    configured: Boolean(getSarvamKey()),
    ttsModel: SARVAM_DEFAULT_TTS_MODEL,
    sttModel: SARVAM_DEFAULT_STT_MODEL,
    translateModel: SARVAM_DEFAULT_TRANSLATE_MODEL,
    chatModel: SARVAM_DEFAULT_CHAT_MODEL,
    defaultSpeaker: SARVAM_DEFAULT_SPEAKER,
    languages: SUPPORTED_LANGUAGES,
    transliterationLanguages: TRANSLITERATION_LANGUAGES,
    speakers: SUPPORTED_SPEAKERS,
    features: {
      speechToText: true,
      speechToTextTranslate: true,
      textToSpeech: true,
      translate: true,
      transliterate: true,
      languageDetection: true,
      chatCompletion: true,
      agentToolCalling: true,
    },
    realtimePlan: "REST voice is enabled now; LiveKit/Pipecat can be added next for sub-second streaming calls.",
  };
}

export async function translateText({
  input,
  sourceLanguage = "auto",
  targetLanguage = "hi-IN",
  mode = "formal",
  speakerGender,
  outputScript,
  numeralsFormat = "international",
} = {}) {
  assertConfigured();
  const text = String(input || "").trim().slice(0, 2000);
  if (!text) {
    const error = new Error("Text is required for translation.");
    error.status = 400;
    throw error;
  }

  const response = await fetch(`${SARVAM_API_BASE_URL}/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": getSarvamKey(),
    },
    body: JSON.stringify({
      input: text,
      source_language_code: sourceLanguage === "auto" ? "auto" : normalizeLanguage(sourceLanguage),
      target_language_code: normalizeLanguage(targetLanguage),
      model: SARVAM_DEFAULT_TRANSLATE_MODEL,
      mode: ["formal", "modern-colloquial", "classic-colloquial", "code-mixed"].includes(mode) ? mode : "formal",
      ...(speakerGender ? { speaker_gender: speakerGender } : {}),
      ...(outputScript ? { output_script: outputScript } : {}),
      numerals_format: ["international", "native"].includes(numeralsFormat) ? numeralsFormat : "international",
    }),
  });

  if (!response.ok) {
    const error = new Error((await readSarvamError(response)) || "Sarvam translation failed.");
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return {
    provider: "sarvam",
    requestId: data.request_id || null,
    translatedText: data.translated_text || "",
    sourceLanguageCode: data.source_language_code || sourceLanguage,
    targetLanguageCode: normalizeLanguage(targetLanguage),
  };
}

export async function transliterateText({
  input,
  sourceLanguage = "hi-IN",
  targetLanguage = "en-IN",
  spokenForm = false,
  numeralsFormat = "international",
  spokenFormNumeralsLanguage = "native",
} = {}) {
  assertConfigured();
  const text = String(input || "").trim().slice(0, 1000);
  if (!text) {
    const error = new Error("Text is required for transliteration.");
    error.status = 400;
    throw error;
  }

  const response = await fetch(`${SARVAM_API_BASE_URL}/transliterate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": getSarvamKey(),
    },
    body: JSON.stringify({
      input: text,
      source_language_code: normalizeTransliterationLanguage(sourceLanguage),
      target_language_code: normalizeTransliterationLanguage(targetLanguage, "en-IN"),
      numerals_format: ["international", "native"].includes(numeralsFormat) ? numeralsFormat : "international",
      spoken_form: Boolean(spokenForm),
      spoken_form_numerals_language: ["english", "native"].includes(spokenFormNumeralsLanguage) ? spokenFormNumeralsLanguage : "native",
    }),
  });

  if (!response.ok) {
    const error = new Error((await readSarvamError(response)) || "Sarvam transliteration failed.");
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return {
    provider: "sarvam",
    requestId: data.request_id || null,
    transliteratedText: data.transliterated_text || "",
    sourceLanguageCode: data.source_language_code || sourceLanguage,
    targetLanguageCode: normalizeTransliterationLanguage(targetLanguage, "en-IN"),
  };
}

export async function detectLanguage({ input } = {}) {
  assertConfigured();
  const text = String(input || "").trim().slice(0, 1000);
  if (!text) {
    const error = new Error("Text is required for language detection.");
    error.status = 400;
    throw error;
  }

  const response = await fetch(`${SARVAM_API_BASE_URL}/text-lid`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": getSarvamKey(),
    },
    body: JSON.stringify({ input: text }),
  });

  if (!response.ok) {
    const error = new Error((await readSarvamError(response)) || "Sarvam language detection failed.");
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return {
    provider: "sarvam",
    requestId: data.request_id || null,
    languageCode: data.language_code || null,
    scriptCode: data.script_code || null,
  };
}

export async function chatCompletion({ messages = [], tools, toolChoice = "auto", temperature = 0.2, maxTokens = 700 } = {}) {
  assertConfigured();
  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((message) => message && ["system", "user", "assistant", "tool"].includes(message.role) && message.content)
        .slice(-12)
        .map((message) => ({ role: message.role, content: String(message.content).slice(0, 6000) }))
    : [];

  if (!safeMessages.length) {
    const error = new Error("Messages are required for Sarvam chat.");
    error.status = 400;
    throw error;
  }

  const response = await fetch(`${SARVAM_API_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getSarvamKey()}`,
      "api-subscription-key": getSarvamKey(),
    },
    body: JSON.stringify({
      model: SARVAM_DEFAULT_CHAT_MODEL,
      messages: safeMessages,
      temperature: clampNumber(temperature, 0, 2, 0.2),
      max_tokens: clampNumber(maxTokens, 64, 2048, 700),
      ...(tools ? { tools, tool_choice: toolChoice || "auto" } : {}),
    }),
  });

  if (!response.ok) {
    const error = new Error((await readSarvamError(response)) || "Sarvam chat completion failed.");
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message || {};
  return {
    provider: "sarvam",
    id: data.id || null,
    model: data.model || SARVAM_DEFAULT_CHAT_MODEL,
    content: message.content || "",
    reasoning: message.reasoning_content || "",
    toolCalls: message.tool_calls || [],
    usage: data.usage || null,
  };
}

export async function textToSpeech({ text, language = "hi-IN", speaker, pace = 0.92, temperature = 0.45 } = {}) {
  assertConfigured();
  const trimmed = String(text || "").replace(/\s+/g, " ").trim().slice(0, 2400);
  if (!trimmed) {
    const error = new Error("Text is required for Sarvam speech.");
    error.status = 400;
    throw error;
  }

  const response = await fetch(`${SARVAM_API_BASE_URL}/text-to-speech/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": getSarvamKey(),
    },
    body: JSON.stringify({
      text: trimmed,
      target_language_code: normalizeLanguage(language),
      model: SARVAM_DEFAULT_TTS_MODEL,
      speaker: normalizeSpeaker(speaker),
      pace: clampNumber(pace, 0.5, 2, 0.92),
      temperature: clampNumber(temperature, 0.01, 2, 0.45),
      speech_sample_rate: 22050,
      output_audio_codec: "mp3",
      enable_preprocessing: true,
    }),
  });

  if (!response.ok) {
    const error = new Error((await readSarvamError(response)) || "Sarvam text-to-speech failed.");
    error.status = response.status;
    throw error;
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  if (!audioBuffer.length) {
    const error = new Error("Sarvam did not return audio.");
    error.status = 502;
    throw error;
  }

  return {
    provider: "sarvam",
    requestId: response.headers.get("x-request-id") || null,
    audioBase64: audioBuffer.toString("base64"),
    audioMimeType: "audio/mpeg",
    language: normalizeLanguage(language),
    speaker: normalizeSpeaker(speaker),
  };
}

export async function speechToText({ audioBase64, mimeType = "audio/webm", language = "unknown", mode = "transcribe" } = {}) {
  assertConfigured();
  if (!audioBase64) {
    const error = new Error("Audio is required for Sarvam transcription.");
    error.status = 400;
    throw error;
  }

  const buffer = Buffer.from(String(audioBase64).replace(/^data:audio\/\w+;base64,/, ""), "base64");
  if (!buffer.length) {
    const error = new Error("Audio data is empty.");
    error.status = 400;
    throw error;
  }

  const form = new FormData();
  const extension = mimeType.includes("wav") ? "wav" : mimeType.includes("mp4") ? "m4a" : "webm";
  form.append("file", new Blob([buffer], { type: mimeType }), `krishinova-voice.${extension}`);
  form.append("model", SARVAM_DEFAULT_STT_MODEL);
  form.append("mode", ["transcribe", "translate", "verbatim", "translit", "codemix"].includes(mode) ? mode : "transcribe");
  form.append("language_code", language === "unknown" ? "unknown" : normalizeLanguage(language, "unknown"));

  const response = await fetch(`${SARVAM_API_BASE_URL}/speech-to-text`, {
    method: "POST",
    headers: {
      "api-subscription-key": getSarvamKey(),
    },
    body: form,
  });

  if (!response.ok) {
    const error = new Error((await readSarvamError(response)) || "Sarvam speech-to-text failed.");
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return {
    provider: "sarvam",
    requestId: data.request_id || null,
    transcript: data.transcript || "",
    languageCode: data.language_code || null,
    languageProbability: data.language_probability ?? null,
  };
}
