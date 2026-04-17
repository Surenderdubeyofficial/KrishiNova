import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MODEL_RETRY_COUNT = 2;
const REQUEST_TIMEOUT_MS = 20000;
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const APP_CONTEXT = `
You are KrishiNova AI, the in-app assistant for KrishiNova Smart Farming Exchange.

About this app:
- It is a MERN + MySQL agriculture platform.
- Roles: farmer, customer, admin.
- Authentication: JWT, email OTP, phone OTP, and Google sign-in.
- Farmer features: crop prediction, crop recommendation, fertilizer recommendation, rainfall prediction, yield prediction, weather forecast, news, crop trade, selling history, and chatbot help.
- Customer features: browse crop stock, buy crops from farmers, Razorpay checkout, invoices, and profile management.
- Admin features: manage farmers, customers, messages, crop stock, and profile data.
- Contact, market overview, weather, news, and AI support are part of the portal.

How to behave:
- Answer app-related questions like a product expert and guide the user step by step when useful.
- If the user asks a general question on any topic, answer it normally and helpfully.
- If the user asks about agriculture, farming, crops, fertilizer, soil, weather, markets, or rural business, answer with practical guidance.
- If the user asks something unclear about the app, make a reasonable assumption and explain it simply.
- Do not say you are only limited to app topics.
- Keep answers clear, friendly, and useful.
`.trim();

function extractGeminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim() || ""
  );
}

function buildLocalFallback(userPrompt) {
  const prompt = String(userPrompt || "").trim();
  const normalized = prompt.toLowerCase();

  if (!normalized) {
    return "Hello! I can help with KrishiNova features, farming guidance, weather search, crop trade, invoices, and general questions.";
  }

  if (["hi", "hello", "hey", "ok", "okay", "thanks", "thank you"].includes(normalized)) {
    return "Hello! I am KrishiNova AI. You can ask me about this app, farming, weather, crop recommendations, trade, invoices, login/signup, or general topics.";
  }

  if (normalized.includes("weather")) {
    return "You can use the Weather Forecast page to search real cities and locations like Delhi, Mumbai, or Udupi. The page shows date, time, temperature, humidity, wind, and forecast description. If you want farming advice based on weather, ask me that too.";
  }

  if (normalized.includes("app") || normalized.includes("feature") || normalized.includes("what can this app do")) {
    return "KrishiNova helps farmers with crop prediction, rainfall prediction, yield prediction, fertilizer and crop recommendations, weather forecast, news, crop trade, selling history, and chatbot help. Customers can browse stock, buy crops, pay with Razorpay, and access invoices. Admin can manage farmers, customers, crop stock, and contact messages.";
  }

  if (normalized.includes("login") || normalized.includes("signup") || normalized.includes("otp") || normalized.includes("google")) {
    return "KrishiNova supports email login/signup with OTP, phone OTP login/signup, Google sign-in, and admin login. Quick signup methods can enter first and complete remaining profile details later from the profile page.";
  }

  if (normalized.includes("buy") || normalized.includes("cart") || normalized.includes("invoice") || normalized.includes("payment") || normalized.includes("razorpay")) {
    return "Customers can add crops to cart, buy directly, or pay with Razorpay. After checkout, the app creates an invoice that can be opened from the customer invoices page.";
  }

  if (normalized.includes("crop") || normalized.includes("farming") || normalized.includes("fertilizer") || normalized.includes("yield") || normalized.includes("rainfall")) {
    return "KrishiNova includes farmer tools for crop prediction, crop recommendation, fertilizer recommendation, rainfall prediction, and yield prediction. Ask me a specific farming question and I will help as much as I can.";
  }

  return "KrishiNova AI is in fallback mode right now, but I can still help with app usage, farming questions, weather page usage, trade flow, invoices, and login/signup. Ask me something specific and I will guide you.";
}

function getGeminiModels() {
  const primary = process.env.GEMINI_MODEL || DEFAULT_MODELS[0];
  const configuredFallbacks = String(process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set([primary, ...configuredFallbacks, ...DEFAULT_MODELS])];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestGeminiModel({ prompt, apiKey, model }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.6,
            topP: 0.9,
            maxOutputTokens: 1024,
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
        signal: controller.signal,
      },
    );
  } catch (error) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: error.name === "AbortError" ? 504 : 500,
      model,
      errorText: error.message || "Gemini request failed",
    };
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false,
      status: response.status,
      model,
      errorText: text,
    };
  }

  const data = await response.json();
  return {
    ok: true,
    model,
    content: extractGeminiText(data) || "Gemini returned an empty response.",
  };
}

async function requestOpenAIModel({ prompt, apiKey, model }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: error.name === "AbortError" ? 504 : 500,
      model,
      errorText: error.message || "OpenAI request failed",
    };
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false,
      status: response.status,
      model,
      errorText: text,
    };
  }

  const data = await response.json();
  const content =
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      .map((item) => item.text || "")
      .join("")
      .trim() ||
    "";

  return {
    ok: true,
    model,
    content: content || "OpenAI returned an empty response.",
  };
}

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_CHAT_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

  if (!apiKey) {
    return { configured: false, content: "OpenAI API key is not configured." };
  }

  let lastFailure = null;
  for (let attempt = 0; attempt <= MODEL_RETRY_COUNT; attempt += 1) {
    const result = await requestOpenAIModel({ prompt, apiKey, model });
    if (result.ok) {
      return {
        configured: true,
        content: result.content,
        model: result.model,
      };
    }

    lastFailure = result;
    if (!RETRYABLE_STATUS_CODES.has(result.status) || attempt === MODEL_RETRY_COUNT) {
      break;
    }

    await delay(700 * (attempt + 1));
  }

  return {
    configured: true,
    failed: true,
    status: lastFailure?.status || 500,
    content: "OpenAI fallback is unavailable right now.",
  };
}

async function callGemini(prompt, rawPrompt = "") {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { configured: false, content: "Gemini API key is not configured." };
  }

  let lastFailure = null;
  for (const model of getGeminiModels()) {
    for (let attempt = 0; attempt <= MODEL_RETRY_COUNT; attempt += 1) {
      const result = await requestGeminiModel({ prompt, apiKey, model });
      if (result.ok) {
        return {
          configured: true,
          content: result.content,
          model: result.model,
        };
      }

      lastFailure = result;
      if (!RETRYABLE_STATUS_CODES.has(result.status) || attempt === MODEL_RETRY_COUNT) {
        break;
      }

      await delay(700 * (attempt + 1));
    }
  }

  const openAiResult = await callOpenAI(prompt);
  if (openAiResult.configured && !openAiResult.failed) {
    return {
      configured: true,
      content: openAiResult.content,
      model: openAiResult.model,
      provider: "openai",
    };
  }

  if (lastFailure && RETRYABLE_STATUS_CODES.has(lastFailure.status)) {
    return {
      configured: true,
      content: buildLocalFallback(rawPrompt),
      fallback: true,
      provider: "local",
      note: "Gemini is temporarily unavailable, so a local fallback answer was used.",
    };
  }

  return {
    configured: true,
    content: buildLocalFallback(rawPrompt),
    fallback: true,
    provider: "local",
  };
}

function buildAssistantPrompt(userPrompt) {
  return `${APP_CONTEXT}

User question:
${String(userPrompt || "").trim()}

Answer as KrishiNova AI.`;
}

router.post(
  "/quote",
  asyncHandler(async (_req, res) => {
    const result = await callGemini(
      `${APP_CONTEXT}

Give me a short quote related to agriculture and farming in the format:
quote - author`,
    );
    res.json(result);
  }),
);

router.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const prompt = req.body?.prompt || "Hello";
    const result = await callGemini(buildAssistantPrompt(prompt), prompt);
    res.json(result);
  }),
);

export default router;
