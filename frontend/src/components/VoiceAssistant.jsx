import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext.jsx";
import { ADMIN_CONTACT, BRAND } from "../branding.js";

const languages = [
  { code: "en-IN", label: "English", name: "English" },
  { code: "hi-IN", label: "Hindi", name: "Hindi" },
  { code: "bho-IN", apiCode: "hi-IN", label: "Bhojpuri", name: "Bhojpuri", dialect: true },
  { code: "hry-IN", apiCode: "hi-IN", label: "Haryanvi", name: "Haryanvi", dialect: true },
  { code: "raj-IN", apiCode: "hi-IN", label: "Rajasthani", name: "Rajasthani", dialect: true },
  { code: "chg-IN", apiCode: "hi-IN", label: "Chhattisgarhi", name: "Chhattisgarhi", dialect: true },
  { code: "as-IN", label: "Assamese", name: "Assamese" },
  { code: "bn-IN", label: "Bengali", name: "Bengali" },
  { code: "brx-IN", label: "Bodo", name: "Bodo" },
  { code: "doi-IN", label: "Dogri", name: "Dogri" },
  { code: "gu-IN", label: "Gujarati", name: "Gujarati" },
  { code: "kn-IN", label: "Kannada", name: "Kannada" },
  { code: "kok-IN", label: "Konkani", name: "Konkani" },
  { code: "ks-IN", label: "Kashmiri", name: "Kashmiri" },
  { code: "mai-IN", label: "Maithili", name: "Maithili" },
  { code: "ml-IN", label: "Malayalam", name: "Malayalam" },
  { code: "mni-IN", label: "Manipuri", name: "Manipuri" },
  { code: "mr-IN", label: "Marathi", name: "Marathi" },
  { code: "ne-IN", label: "Nepali", name: "Nepali" },
  { code: "od-IN", label: "Odia", name: "Odia" },
  { code: "pa-IN", label: "Punjabi", name: "Punjabi" },
  { code: "sa-IN", label: "Sanskrit", name: "Sanskrit" },
  { code: "sat-IN", label: "Santali", name: "Santali" },
  { code: "sd-IN", label: "Sindhi", name: "Sindhi" },
  { code: "ta-IN", label: "Tamil", name: "Tamil" },
  { code: "te-IN", label: "Telugu", name: "Telugu" },
  { code: "ur-IN", label: "Urdu", name: "Urdu" },
];

const quickActions = [
  "My name is Ravi. Introduce me to this app.",
  "Who made you?",
  "Explain farmer, customer and admin work",
  "My tomato leaves are yellow",
];

const SARVAM_RECORDING_MS = 6500;
const ROBOT_MEMORY_KEY = "krishi_voice_user_name";
const ROBOT_SESSION_KEY = "krishi_robot_session_id";

const localMessages = {
  "en-IN": {
    welcome:
      "Namaste. I am KrishiNova assistant. Use chat mode or voice mode. Say open contact page, open marketplace, add product, buy crops, orders, payment, invoice, weather, or help.",
    listening: "I am listening. Please speak now.",
    continuousOn:
      "Continuous listening is on. Ask one question at a time. I will reply, then listen again until you press Stop listening.",
    unsupported: "Voice listening is not supported in this browser. You can still use chat mode.",
    micError: "I could not start the microphone. Please allow microphone permission or use chat mode.",
    help:
      "I can answer app and farming questions, and I can open website pages. Try open contact page, open customer marketplace, open farmer products, open admin farmers, open fertilizer, or ask what is urea.",
    needPageName: "Please say the page name also. For example: open contact page, open weather page, open invoice, or open marketplace.",
    stop: "Okay, continuous listening is off.",
    noAnswer: "I could not answer right now. Please try again.",
    assistantDown: "Assistant is not available right now. Please try again.",
  },
  "hi-IN": {
    welcome:
      "नमस्ते। मैं KrishiNova assistant हूं। Chat mode या voice mode इस्तेमाल करें। बोलिए: contact page खोलो, marketplace खोलो, product जोड़ो, फसल खरीदो, orders, payment, invoice, weather, या मदद।",
    listening: "मैं सुन रहा हूं। कृपया अब बोलिए।",
    continuousOn:
      "Continuous listening चालू है। एक बार में एक सवाल बोलिए। मैं जवाब देकर फिर अपने आप सुनूंगा, जब तक आप Stop listening नहीं दबाते।",
    unsupported: "इस browser में voice listening supported नहीं है। आप chat mode इस्तेमाल कर सकते हैं।",
    micError: "Microphone शुरू नहीं हो पाया। Permission दीजिए या chat mode इस्तेमाल करें।",
    help:
      "मैं app और farming questions का जवाब दे सकता हूं, और website pages खोल सकता हूं। बोलिए: contact page खोलो, customer marketplace खोलो, farmer products खोलो, admin farmers खोलो, fertilizer खोलो, या urea क्या है।",
    needPageName: "कृपया page का नाम भी बोलिए। जैसे: contact page खोलो, weather page खोलो, invoice खोलो, या marketplace खोलो।",
    stop: "ठीक है, continuous listening बंद है।",
    noAnswer: "मैं अभी जवाब नहीं दे पाया। कृपया दोबारा कोशिश करें।",
    assistantDown: "Assistant अभी available नहीं है। कृपया बाद में कोशिश करें।",
  },
};

const spokenLocalMessages = {
  ...localMessages,
  "hi-IN": {
    welcome:
      "\u0928\u092e\u0938\u094d\u0924\u0947\u0964 \u092e\u0948\u0902 KrishiNova assistant \u0939\u0942\u0902\u0964 Chat mode \u092f\u093e voice mode \u0907\u0938\u094d\u0924\u0947\u092e\u093e\u0932 \u0915\u0930\u0947\u0902\u0964 \u092c\u094b\u0932\u093f\u090f: contact page \u0916\u094b\u0932\u094b, marketplace \u0916\u094b\u0932\u094b, product \u091c\u094b\u0921\u093c\u094b, \u092b\u0938\u0932 \u0916\u0930\u0940\u0926\u094b, orders, payment, invoice, weather, \u092f\u093e \u092e\u0926\u0926\u0964",
    listening: "\u092e\u0948\u0902 \u0938\u0941\u0928 \u0930\u0939\u093e \u0939\u0942\u0902\u0964 \u0915\u0943\u092a\u092f\u093e \u0905\u092c \u092c\u094b\u0932\u093f\u090f\u0964",
    continuousOn:
      "Continuous listening \u091a\u093e\u0932\u0942 \u0939\u0948\u0964 \u090f\u0915 \u092c\u093e\u0930 \u092e\u0947\u0902 \u090f\u0915 \u0938\u0935\u093e\u0932 \u092c\u094b\u0932\u093f\u090f\u0964 \u092e\u0948\u0902 \u091c\u0935\u093e\u092c \u0926\u0947\u0915\u0930 \u092b\u093f\u0930 \u0905\u092a\u0928\u0947 \u0906\u092a \u0938\u0941\u0928\u0942\u0902\u0917\u093e, \u091c\u092c \u0924\u0915 \u0906\u092a Stop listening \u0928\u0939\u0940\u0902 \u0926\u092c\u093e\u0924\u0947\u0964",
    unsupported: "\u0907\u0938 browser \u092e\u0947\u0902 voice listening supported \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u0906\u092a chat mode \u0907\u0938\u094d\u0924\u0947\u092e\u093e\u0932 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964",
    micError: "Microphone \u0936\u0941\u0930\u0942 \u0928\u0939\u0940\u0902 \u0939\u094b \u092a\u093e\u092f\u093e\u0964 Permission \u0926\u0940\u091c\u093f\u090f \u092f\u093e chat mode \u0907\u0938\u094d\u0924\u0947\u092e\u093e\u0932 \u0915\u0930\u0947\u0902\u0964",
    help:
      "\u092e\u0948\u0902 app \u0914\u0930 farming questions \u0915\u093e \u091c\u0935\u093e\u092c \u0926\u0947 \u0938\u0915\u0924\u093e \u0939\u0942\u0902, \u0914\u0930 website pages \u0916\u094b\u0932 \u0938\u0915\u0924\u093e \u0939\u0942\u0902\u0964 \u092c\u094b\u0932\u093f\u090f: contact page \u0916\u094b\u0932\u094b, customer marketplace \u0916\u094b\u0932\u094b, farmer products \u0916\u094b\u0932\u094b, admin farmers \u0916\u094b\u0932\u094b, fertilizer \u0916\u094b\u0932\u094b, \u092f\u093e urea \u0915\u094d\u092f\u093e \u0939\u0948\u0964",
    needPageName: "\u0915\u0943\u092a\u092f\u093e page \u0915\u093e \u0928\u093e\u092e \u092d\u0940 \u092c\u094b\u0932\u093f\u090f\u0964 \u091c\u0948\u0938\u0947: contact page \u0916\u094b\u0932\u094b, weather page \u0916\u094b\u0932\u094b, invoice \u0916\u094b\u0932\u094b, \u092f\u093e marketplace \u0916\u094b\u0932\u094b\u0964",
    stop: "\u0920\u0940\u0915 \u0939\u0948, continuous listening \u092c\u0902\u0926 \u0939\u0948\u0964",
    noAnswer: "\u092e\u0948\u0902 \u0905\u092d\u0940 \u091c\u0935\u093e\u092c \u0928\u0939\u0940\u0902 \u0926\u0947 \u092a\u093e\u092f\u093e\u0964 \u0915\u0943\u092a\u092f\u093e \u0926\u094b\u092c\u093e\u0930\u093e \u0915\u094b\u0936\u093f\u0936 \u0915\u0930\u0947\u0902\u0964",
    assistantDown: "Assistant \u0905\u092d\u0940 available \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u0915\u0943\u092a\u092f\u093e \u092c\u093e\u0926 \u092e\u0947\u0902 \u0915\u094b\u0936\u093f\u0936 \u0915\u0930\u0947\u0902\u0964",
  },
};

const fallbackMessages = spokenLocalMessages["en-IN"];

const commandReply = {
  en: (label) => `Opening ${label}.`,
  hi: (label) => `${label} खोल रहा हूं।`,
  kn: (label) => `${label} ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`,
  ta: (label) => `${label} திறக்கிறேன்.`,
  te: (label) => `${label} తెరవుతున్నాను.`,
  mr: (label) => `${label} उघडत आहे.`,
  bn: (label) => `${label} খুলছি।`,
};

const spokenCommandReply = {
  ...commandReply,
  hi: (label) => `${label} \u0916\u094b\u0932 \u0930\u0939\u093e \u0939\u0942\u0902\u0964`,
  kn: (label) => `${label} \u0ca4\u0cc6\u0cb0\u0cc6\u0caf\u0cc1\u0ca4\u0ccd\u0ca4\u0cbf\u0ca6\u0ccd\u0ca6\u0cc7\u0ca8\u0cc6.`,
  ta: (label) => `${label} \u0ba4\u0bbf\u0bb1\u0b95\u0bcd\u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd.`,
  te: (label) => `${label} \u0c24\u0c46\u0c30\u0c35\u0c41\u0c24\u0c41\u0c28\u0c4d\u0c28\u0c3e\u0c28\u0c41.`,
  mr: (label) => `${label} \u0909\u0918\u0921\u0924 \u0906\u0939\u0947.`,
  bn: (label) => `${label} \u0996\u09c1\u09b2\u099b\u09bf\u0964`,
};

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLanguageBase(language) {
  return String(getApiLanguage(language) || "en-IN").split("-")[0];
}

function getLanguageOption(language) {
  return languages.find((item) => item.code === language) || languages[0];
}

function isSupportedLanguage(language) {
  return languages.some((item) => item.code === language);
}

function getApiLanguage(language) {
  return getLanguageOption(language).apiCode || language || "en-IN";
}

function getLocalMessage(language, key) {
  return spokenLocalMessages[language]?.[key] || fallbackMessages[key] || key;
}

function cleanUserName(value) {
  return String(value || "")
    .replace(/[^\p{L}\p{M}\s.'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");
}

function extractUserName(text) {
  const value = String(text || "").trim();
  const nativeHindiMatch = value.match(/(?:\u092e\u0947\u0930\u093e\s+\u0928\u093e\u092e|\u092e\u0941\u091d\u0947)\s+([\u0900-\u097F\s.'-]{2,60})/u);
  const match = value.match(
    /\b(?:my name is|i am|i'm|call me|mera naam|mera name|mujhe|मेरा नाम|मेरा नेम|मुझे)\s+([\p{L}\s.'-]{2,60})/iu,
  );
  const nameOnly = String(nativeHindiMatch?.[1] || match?.[1] || "").split(/\s*(?:[.,;:]|\bintroduce\b|\bexplain\b|\bguide\b|\btell\b|\bshow\b|\bopen\b|\u0939\u0948|\u0939\u0942\u0902|\u0939\u0941\u0902)/i)[0];
  return cleanUserName(nameOnly);
}

function splitSpeechText(text) {
  const cleanText = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleanText) return [];

  const chunks = [];
  let current = "";
  for (const part of cleanText.split(/(?<=[.!?।])\s+/u)) {
    if ((current + " " + part).trim().length > 180 && current) {
      chunks.push(current);
      current = part;
    } else {
      current = (current + " " + part).trim();
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(new Error("Could not read microphone audio."));
    reader.readAsDataURL(blob);
  });
}

function isNavigationIntent(text) {
  return (
    /^(open|go to|show|take me|navigate|start|launch)\b/i.test(text) ||
    /\b(khol|kholo|khol do|dikhao|chalao|le chalo)\b/i.test(text) ||
    /\u0916\u094b\u0932\u094b|\u0916\u094b\u0932\u0947\u0902|\u0916\u094b\u0932\s+\u0926\u094b|\u0926\u093f\u0916\u093e\u0913|\u0932\u0947\s+\u091a\u0932\u094b|\u091c\u093e\u0913|\u091a\u093e\u0932\u0942\s+\u0915\u0930\u094b/i.test(text) ||
    /\b(open|go to|show|take me to|navigate to|open the|show me)\b/i.test(text) ||
    /खोलो|खोलें|दिखाओ|ले चलो|जाओ|चालू करो/i.test(text)
  );
}

function roleHome(role) {
  if (role === "farmer") return "/farmer/marketplace";
  if (role === "customer") return "/customer/marketplace";
  if (role === "admin") return "/admin/marketplace";
  return "/auth";
}

function customerPath(user, path = "/customer/marketplace") {
  return user?.role === "customer" ? path : "/customer/marketplace";
}

function farmerPath(user, path = "/farmer/marketplace") {
  return user?.role === "farmer" ? path : "/farmer/marketplace";
}

function adminPath(user, path = "/admin/marketplace") {
  return user?.role === "admin" ? path : "/admin/marketplace";
}

function commandCatalog(user) {
  return [
    {
      label: "AI farming tools",
      path: "/farmer",
      words: ["tools", "tool", "ai tools", "farming tools", "prediction tools", "ml tools", "farmer tools", "tool page", "\u091f\u0942\u0932", "\u091f\u0942\u0932\u094d\u0938", "\u0915\u0943\u0937\u093f \u091f\u0942\u0932"],
    },
    {
      label: "customer marketplace",
      path: customerPath(user),
      words: ["customer", "customers", "customer page", "customer marketplace", "customer market", "cusromer", "coustomer", "costumer", "buyer", "buyers", "buying page", "\u0915\u0938\u094d\u091f\u092e\u0930", "\u0917\u094d\u0930\u093e\u0939\u0915", "\u0916\u0930\u0940\u0926"],
    },
    {
      label: "crop prediction",
      path: farmerPath(user, "/farmer/crop-prediction"),
      words: ["prediction", "prediction tool", "crop prediction", "crop predictor", "predict crop", "predict", "open prediction", "\u092b\u0938\u0932 \u092a\u0942\u0930\u094d\u0935\u093e\u0928\u0941\u092e\u093e\u0928"],
    },
    {
      label: "crop recommendation",
      path: farmerPath(user, "/farmer/crop-recommendation"),
      words: ["recommendation", "recommentation", "recomendation", "recommend", "crop recommendation", "crop recommend", "crop suggestion", "suggest crop", "suggestion tool", "\u092b\u0938\u0932 \u0938\u0941\u091d\u093e\u0935"],
    },
    {
      label: "fertilizer suggestion",
      path: farmerPath(user, "/farmer/fertilizer-recommendation"),
      words: ["fertilizer", "fertiliser", "fertilizer tool", "fertiliser tool", "urea", "npk", "manure", "\u0916\u093e\u0926", "\u092f\u0942\u0930\u093f\u092f\u093e", "\u0909\u0930\u094d\u0935\u0930\u0915"],
    },
    {
      label: "rainfall prediction",
      path: farmerPath(user, "/farmer/rainfall-prediction"),
      words: ["rain", "rainfall", "rain prediction", "rain tool", "rainfall tool", "\u092c\u093e\u0930\u093f\u0936"],
    },
    {
      label: "yield prediction",
      path: farmerPath(user, "/farmer/yield-prediction"),
      words: ["yield", "yield tool", "yield prediction", "production", "production tool", "\u0909\u092a\u091c"],
    },
    { label: "contact page", path: "/contact", words: ["contact page", "contacts page", "contact us", "open contact", "support page", "contact", "contacts", "support", "help page", "संपर्क", "कांटेक्ट", "कॉन्टैक्ट", "कंटेक्ट", "कान्टेक्ट"] },
    { label: "login and signup", path: "/auth", words: ["login", "signup", "register", "auth", "otp", "लॉगिन", "साइन", "रजिस्टर"] },
    { label: "home page", path: "/", words: ["home page", "main page", "landing page", "homepage"] },
    { label: "your workspace", path: roleHome(user?.role), words: ["dashboard", "workspace", "my panel", "डैशबोर्ड"] },
    { label: "marketplace", path: roleHome(user?.role), words: ["market", "marketplace", "मार्केट", "मार्केटप्लेस", "bazaar", "mandi", "बाजार", "मंडी"] },
    { label: "customer marketplace", path: customerPath(user), words: ["customer marketplace", "कस्टमर मार्केट", "कस्टमर मार्केटप्लेस", "ग्राहक मार्केट", "buy crop", "buy crops", "cart", "crop buying", "खरीद", "फसल खरीद"] },
    { label: "farmer products", path: farmerPath(user), words: ["farmer products", "फार्मर प्रोडक्ट", "किसान प्रोडक्ट", "sell crop", "add product", "add crop", "प्रोडक्ट जोड़", "stock", "listing", "बेच", "product जोड़", "फसल जोड़"] },
    { label: "orders", path: roleHome(user?.role), words: ["orders", "order", "order tracking", "track order", "delivery", "ऑर्डर", "ऑर्डर्स", "डिलीवरी"] },
    { label: "payment and cash flow", path: roleHome(user?.role), words: ["payment", "payments", "cash flow", "razorpay", "commission", "पेमेंट", "पेमेंट्स", "कमीशन"] },
    { label: "payouts and earnings", path: roleHome(user?.role), words: ["payout", "earning", "earnings", "release payout", "कमाई"] },
    {
      label: "profile",
      path: user?.role === "farmer" ? "/farmer/profile" : user?.role === "customer" ? "/customer/profile" : user?.role === "admin" ? "/admin/profile" : "/auth",
      words: ["profile", "account", "my details", "प्रोफाइल"],
    },
    { label: "weather", path: "/farmer/weather", words: ["weather", "वेदर", "mausam", "forecast", "मौसम"] },
    { label: "agriculture news", path: "/farmer/news", words: ["news", "न्यूज़", "न्यूज", "samachar", "agriculture news", "समाचार", "खबर"] },
    { label: "invoice", path: customerPath(user, "/customer/invoices"), words: ["invoice", "invoices", "इनवॉइस", "इनवाइस", "इनवॉइज", "bill", "download invoice", "चालान", "बिल"] },
    { label: "dispute and refund", path: roleHome(user?.role), words: ["dispute", "refund", "complaint", "विवाद", "रिफंड"] },
    { label: "order chat", path: roleHome(user?.role), words: ["chat", "message", "talk farmer", "talk customer", "चैट"] },
    { label: "crop prediction", path: farmerPath(user, "/farmer/crop-prediction"), words: ["crop prediction", "predict crop", "ai crop"] },
    { label: "crop recommendation", path: farmerPath(user, "/farmer/crop-recommendation"), words: ["crop recommendation", "which crop", "fasal kaun", "फसल कौन"] },
    { label: "fertilizer suggestion", path: farmerPath(user, "/farmer/fertilizer-recommendation"), words: ["fertilizer", "urea", "npk", "खाद", "उर्वरक", "यूरिया"] },
    { label: "rainfall prediction", path: farmerPath(user, "/farmer/rainfall-prediction"), words: ["rainfall", "rain prediction", "बारिश"] },
    { label: "yield prediction", path: farmerPath(user, "/farmer/yield-prediction"), words: ["yield", "production", "उपज"] },
    { label: "farmer chatbot", path: farmerPath(user, "/farmer/chatbot"), words: ["chatbot", "bot", "ai assistant"] },
    { label: "admin marketplace", path: adminPath(user), words: ["admin marketplace", "admin dashboard", "admin panel"] },
    { label: "farmer management", path: adminPath(user, "/admin/farmers"), words: ["admin farmers", "manage farmers", "verify farmers", "farmer management", "किसान manage"] },
    { label: "customer management", path: adminPath(user, "/admin/customers"), words: ["admin customers", "manage customers", "customer management", "ग्राहक manage"] },
    { label: "admin stock approval", path: adminPath(user, "/admin/stock"), words: ["approve product", "approve listing", "admin stock", "crop approval"] },
    { label: "contact messages", path: adminPath(user, "/admin/messages"), words: ["contact messages", "support messages", "admin messages"] },
  ];
}

function routeAliases(user) {
  return [
    { label: "AI farming tools", path: "/farmer", aliases: ["tools", "tool", "ai tools", "farming tools", "prediction tools", "ml tools", "farmer tools", "tool page"] },
    { label: "contact page", path: "/contact", aliases: ["contact", "contacts", "contact us", "support", "help"] },
    { label: "login and signup", path: "/auth", aliases: ["login", "signup", "register", "auth", "otp"] },
    { label: "home page", path: "/", aliases: ["home", "home page", "main", "main page"] },
    { label: "marketplace", path: roleHome(user?.role), aliases: ["market", "marketplace", "bazaar", "mandi", "workspace"] },
    { label: "customer marketplace", path: customerPath(user), aliases: ["buy", "buy crop", "buy crops", "customer", "customers", "customer page", "cusromer", "coustomer", "costumer", "buyer", "customer marketplace", "cart", "crop buying"] },
    { label: "farmer products", path: farmerPath(user), aliases: ["sell", "sell crop", "add product", "add crop", "farmer products", "stock", "listing"] },
    { label: "orders", path: roleHome(user?.role), aliases: ["order", "orders", "track", "tracking", "delivery"] },
    { label: "payment and cash flow", path: roleHome(user?.role), aliases: ["payment", "payments", "cash", "cash flow", "razorpay", "commission"] },
    { label: "payouts and earnings", path: roleHome(user?.role), aliases: ["payout", "payouts", "earning", "earnings"] },
    {
      label: "profile",
      path: user?.role === "farmer" ? "/farmer/profile" : user?.role === "customer" ? "/customer/profile" : user?.role === "admin" ? "/admin/profile" : "/auth",
      aliases: ["profile", "account", "my profile", "my account"],
    },
    { label: "weather", path: "/farmer/weather", aliases: ["weather", "forecast", "mausam"] },
    { label: "agriculture news", path: "/farmer/news", aliases: ["news", "agriculture news", "samachar"] },
    { label: "invoice", path: customerPath(user, "/customer/invoices"), aliases: ["invoice", "invoices", "bill", "bills"] },
    { label: "dispute and refund", path: roleHome(user?.role), aliases: ["dispute", "refund", "complaint"] },
    { label: "chat", path: roleHome(user?.role), aliases: ["chat", "message", "messages"] },
    { label: "crop prediction", path: farmerPath(user, "/farmer/crop-prediction"), aliases: ["prediction", "prediction tool", "crop prediction", "crop predictor", "predict crop", "predict"] },
    { label: "crop recommendation", path: farmerPath(user, "/farmer/crop-recommendation"), aliases: ["recommendation", "recommentation", "recomendation", "recommend", "crop recommendation", "which crop", "crop suggest", "crop suggestion", "suggestion tool"] },
    { label: "fertilizer suggestion", path: farmerPath(user, "/farmer/fertilizer-recommendation"), aliases: ["fertilizer", "fertiliser", "fertilizer tool", "fertiliser tool", "urea", "npk", "fertilizer suggestion"] },
    { label: "rainfall prediction", path: farmerPath(user, "/farmer/rainfall-prediction"), aliases: ["rainfall", "rain prediction", "rain", "rain tool", "rainfall tool"] },
    { label: "yield prediction", path: farmerPath(user, "/farmer/yield-prediction"), aliases: ["yield", "production", "yield prediction", "yield tool", "production tool"] },
    { label: "admin marketplace", path: adminPath(user), aliases: ["admin", "admin marketplace", "admin dashboard", "admin panel"] },
    { label: "farmer management", path: adminPath(user, "/admin/farmers"), aliases: ["farmers", "admin farmers", "farmer management", "verify farmers"] },
    { label: "customer management", path: adminPath(user, "/admin/customers"), aliases: ["customers", "admin customers", "customer management"] },
    { label: "admin stock approval", path: adminPath(user, "/admin/stock"), aliases: ["approve product", "approve listing", "admin stock", "stock approval"] },
    { label: "contact messages", path: adminPath(user, "/admin/messages"), aliases: ["contact messages", "support messages", "admin messages"] },
  ];
}

function extraVoiceCommandCatalog(user) {
  return [
    { label: "AI farming tools", path: "/farmer", words: ["tools", "tool", "ai tools", "farming tools", "prediction tools", "\u091f\u0942\u0932", "\u091f\u0942\u0932\u094d\u0938"] },
    { label: "contact page", path: "/contact", words: ["\u0938\u0902\u092a\u0930\u094d\u0915", "\u0938\u092a\u094b\u0930\u094d\u091f", "\u0915\u093e\u0902\u091f\u0947\u0915\u094d\u091f", "\u0915\u0949\u0928\u094d\u091f\u0948\u0915\u094d\u091f", "\u0915\u0902\u091f\u0947\u0915\u094d\u091f", "contact"] },
    { label: "login and signup", path: "/auth", words: ["\u0932\u0949\u0917\u093f\u0928", "\u0938\u093e\u0907\u0928", "\u0930\u091c\u093f\u0938\u094d\u091f\u0930", "login", "signup"] },
    { label: "home page", path: "/", words: ["\u0939\u094b\u092e", "home"] },
    { label: "marketplace", path: roleHome(user?.role), words: ["marketplace", "market", "\u092e\u093e\u0930\u094d\u0915\u0947\u091f", "\u092e\u093e\u0930\u094d\u0915\u0947\u091f\u092a\u094d\u0932\u0947\u0938", "\u092c\u093e\u091c\u093e\u0930", "\u092e\u0902\u0921\u0940"] },
    { label: "customer marketplace", path: customerPath(user), words: ["customer marketplace", "customer market", "\u0915\u0938\u094d\u091f\u092e\u0930 \u092e\u093e\u0930\u094d\u0915\u0947\u091f", "\u0915\u0938\u094d\u091f\u092e\u0930 \u092e\u093e\u0930\u094d\u0915\u0947\u091f\u092a\u094d\u0932\u0947\u0938", "\u0917\u094d\u0930\u093e\u0939\u0915 marketplace", "\u0917\u094d\u0930\u093e\u0939\u0915 \u092e\u093e\u0930\u094d\u0915\u0947\u091f", "\u0916\u0930\u0940\u0926"] },
    { label: "farmer products", path: farmerPath(user), words: ["farmer products", "farmer marketplace", "\u092b\u093e\u0930\u094d\u092e\u0930 \u092a\u094d\u0930\u094b\u0921\u0915\u094d\u091f", "\u0915\u093f\u0938\u093e\u0928 marketplace", "\u092c\u0947\u091a", "\u092b\u0938\u0932 \u091c\u094b\u0921\u093c"] },
    { label: "orders", path: roleHome(user?.role), words: ["orders", "order", "\u0911\u0930\u094d\u0921\u0930", "\u0911\u0930\u094d\u0921\u0930\u094d\u0938"] },
    { label: "invoice", path: customerPath(user, "/customer/invoices"), words: ["invoice", "invoices", "\u0907\u0928\u0935\u0949\u0907\u0938", "\u0907\u0928\u0935\u093e\u0907\u0938", "\u091a\u093e\u0932\u093e\u0928", "\u092c\u093f\u0932"] },
    { label: "weather", path: "/farmer/weather", words: ["weather", "\u0935\u0947\u0926\u0930", "mausam", "\u092e\u094c\u0938\u092e"] },
    { label: "agriculture news", path: "/farmer/news", words: ["news", "\u0928\u094d\u092f\u0942\u091c", "\u0928\u094d\u092f\u0942\u091c\u093c", "samachar", "\u0938\u092e\u093e\u091a\u093e\u0930", "\u0916\u092c\u0930"] },
    { label: "profile", path: user?.role === "farmer" ? "/farmer/profile" : user?.role === "customer" ? "/customer/profile" : user?.role === "admin" ? "/admin/profile" : "/auth", words: ["profile", "\u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932"] },
    { label: "crop prediction", path: farmerPath(user, "/farmer/crop-prediction"), words: ["prediction", "prediction tool", "crop prediction", "predict crop", "\u092b\u0938\u0932 \u092a\u0942\u0930\u094d\u0935\u093e\u0928\u0941\u092e\u093e\u0928"] },
    { label: "crop recommendation", path: farmerPath(user, "/farmer/crop-recommendation"), words: ["recommendation", "recommentation", "recomendation", "crop recommendation", "\u092b\u0938\u0932 \u0938\u0941\u091d\u093e\u0935"] },
    { label: "fertilizer suggestion", path: farmerPath(user, "/farmer/fertilizer-recommendation"), words: ["fertilizer", "urea", "\u0916\u093e\u0926", "\u092f\u0942\u0930\u093f\u092f\u093e"] },
  ];
}

function findCommandMatch(text, user) {
  const directMatch = [...commandCatalog(user), ...extraVoiceCommandCatalog(user)]
    .map((command) => {
      const score = command.words.reduce((total, word) => {
        const normalizedWord = normalizeText(word);
        return normalizedWord && text.includes(normalizedWord) ? total + normalizedWord.split(" ").length : total;
      }, 0);
      return { command, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.command;

  if (directMatch) return directMatch;

  const pageText = normalizeText(
    text
      .replace(/\b(open|go to|show|take me to|navigate to|launch|start|page|screen|section|tab|the|this|please|pls)\b/g, " ")
      .replace(/\b(khol|kholo|khol do|dikhao|chalao|le chalo)\b/g, " ")
      .replace(/\u0916\u094b\u0932\u094b|\u0916\u094b\u0932\u0947\u0902|\u0916\u094b\u0932\s+\u0926\u094b|\u0926\u093f\u0916\u093e\u0913|\u0932\u0947\s+\u091a\u0932\u094b|\u091c\u093e\u0913|\u091a\u093e\u0932\u0942\s+\u0915\u0930\u094b/g, " ")
      .replace(/खोलो|खोलें|दिखाओ|जाओ|चालू करो/g, " "),
  );

  return routeAliases(user)
    .map((route) => {
      const score = route.aliases.reduce((total, alias) => {
        const normalizedAlias = normalizeText(alias);
        return normalizedAlias && pageText.includes(normalizedAlias) ? total + normalizedAlias.split(" ").length : total;
      }, 0);
      return { command: { label: route.label, path: route.path }, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.command;
}

function buildPrompt({ text, language, user, location, userName }) {
  const selectedLanguage = getLanguageOption(language);
  const apiLanguage = getApiLanguage(language);
  return `You are ${BRAND.name} Sahayak, a friendly robot assistant inside ${BRAND.name} ${BRAND.subtitle}.

Selected reply language: ${selectedLanguage.name}.
Selected reply language code: ${language}.
Speech/STT language code: ${apiLanguage}.
User role: ${user?.role || "guest"}.
Current page: ${location.pathname}.
Known user name: ${userName || "not told yet"}.

Creator/admin facts:
- Made/administered by ${ADMIN_CONTACT.name}.
- Email: ${ADMIN_CONTACT.email}.
- Mobile: ${ADMIN_CONTACT.mobile}.
- Address: ${ADMIN_CONTACT.address}.
- GitHub: ${ADMIN_CONTACT.github}.
- LinkedIn: ${ADMIN_CONTACT.linkedin}.

App training:
- Farmers register/login, complete profile, request verification, add/edit/delete crop listings, manage stock, accept/reject orders, update delivery, chat, reviews, earnings and payouts.
- Customers browse/search/filter crops, add to cart, order, pay safely, track orders, download invoice, confirm delivery, review, chat and raise dispute/refund.
- Admin verifies farmers, approves listings, manages users, all orders, payments, commission, payouts, disputes, refunds, contacts, analytics and trust.
- Payment flow: customer pays platform, money is held, commission is deducted, farmer payout waits for delivery confirmation and admin release.
- The assistant can answer farming, weather, marketplace, login, payment, payout, invoice, support and page-navigation questions.

Robot behavior:
- Reply only in ${selectedLanguage.name}. Do not switch to Hindi or English unless the user asks.
- If ${selectedLanguage.name} is a dialect, use natural regional wording while keeping it understandable.
- If the user says their name, remember it and greet them by that name.
- If asked who made you, answer with ${ADMIN_CONTACT.name} and the admin contact details above.
- If asked to introduce the app, explain farmer, customer, admin and payment workflow clearly.
- Be quick, intelligent, practical and short. Use simple spoken steps.
User said: ${text}`;
}

export default function VoiceAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const recognitionRef = useRef(null);
  const keepListeningRef = useRef(false);
  const processingRef = useRef(false);
  const speakingRef = useRef(false);
  const restartTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const speechRunRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordTimerRef = useRef(null);
  const sarvamAudioRef = useRef(null);
  const sarvamTtsBlockedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem("krishi_voice_language") || "hi-IN");
  const [assistantMode, setAssistantMode] = useState(() => localStorage.getItem("krishi_assistant_mode") || "chat");
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [continuousListening, setContinuousListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voiceProvider, setVoiceProvider] = useState(() => localStorage.getItem("krishi_voice_provider") || "auto");
  const [sarvamStatus, setSarvamStatus] = useState({ configured: false, speakers: [], defaultSpeaker: "anand" });
  const [sarvamSpeaker, setSarvamSpeaker] = useState(() => localStorage.getItem("krishi_sarvam_speaker") || "anand");
  const [robotStatus, setRobotStatus] = useState("Ready for farming and marketplace help");
  const [messages, setMessages] = useState([{ role: "assistant", content: getLocalMessage(language, "welcome") }]);
  const [userName, setUserName] = useState(() => localStorage.getItem(ROBOT_MEMORY_KEY) || "");
  const [robotSessionId] = useState(() => {
    const existing = localStorage.getItem(ROBOT_SESSION_KEY);
    if (existing) return existing;
    const next = `robot-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(ROBOT_SESSION_KEY, next);
    return next;
  });

  const supportsVoice = useMemo(() => typeof window !== "undefined" && Boolean(getSpeechRecognition()), []);
  const sarvamEnabled = sarvamStatus.configured && (voiceProvider === "auto" || voiceProvider === "sarvam");

  useEffect(() => {
    localStorage.setItem("krishi_voice_language", language);
    sarvamTtsBlockedRef.current = false;
  }, [language]);

  useEffect(() => {
    if (userName) localStorage.setItem(ROBOT_MEMORY_KEY, userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem("krishi_voice_provider", voiceProvider);
    sarvamTtsBlockedRef.current = false;
  }, [voiceProvider]);

  useEffect(() => {
    localStorage.setItem("krishi_sarvam_speaker", sarvamSpeaker);
  }, [sarvamSpeaker]);

  useEffect(() => {
    let active = true;
    api("/ai/sarvam/status")
      .then((status) => {
        if (!active) return;
        setSarvamStatus(status);
        if (status.defaultSpeaker && !localStorage.getItem("krishi_sarvam_speaker")) {
          setSarvamSpeaker(status.defaultSpeaker);
        }
      })
      .catch(() => {
        if (active) setSarvamStatus({ configured: false, speakers: [], defaultSpeaker: "anand" });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("krishi_assistant_mode", assistantMode);
    if (assistantMode === "chat") {
      keepListeningRef.current = false;
      setContinuousListening(false);
      clearTimeout(restartTimerRef.current);
      clearTimeout(recordTimerRef.current);
      recognitionRef.current?.stop?.();
      stopSarvamRecorder();
      setListening(false);
      speechRunRef.current += 1;
      sarvamAudioRef.current?.pause?.();
      sarvamAudioRef.current = null;
      window.speechSynthesis?.cancel?.();
      setSpeaking(false);
    }
  }, [assistantMode]);

  useEffect(() => {
    if (!window.speechSynthesis) return undefined;
    const loadVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    function handleAssistantOpen(event) {
      const detail = event.detail || {};
      const nextMode = detail.mode === "voice" ? "voice" : "chat";
      setAssistantMode(nextMode);
      if (detail.language) setLanguage(detail.language);
      setOpen(true);
      setRobotStatus(nextMode === "voice" ? "Voice mode ready" : "Chat mode ready");
      if (detail.prompt) setInput(detail.prompt);
      if (detail.autoStart && nextMode === "voice") {
        window.setTimeout(() => startListening(), 120);
      }
    }

    window.addEventListener("krishinova-open-assistant", handleAssistantOpen);
    return () => window.removeEventListener("krishinova-open-assistant", handleAssistantOpen);
  }, [language, sarvamEnabled, assistantMode]);

  useEffect(() => {
    return () => {
      keepListeningRef.current = false;
      clearTimeout(restartTimerRef.current);
      clearTimeout(recordTimerRef.current);
      recognitionRef.current?.stop?.();
      stopSarvamRecorder();
      speechRunRef.current += 1;
      sarvamAudioRef.current?.pause?.();
      sarvamAudioRef.current = null;
      window.speechSynthesis?.cancel?.();
    };
  }, []);

  function addMessage(role, content) {
    setMessages((current) => [...current, { role, content }].slice(-8));
  }

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage);
    const selected = getLanguageOption(nextLanguage);
    setRobotStatus(`${selected.label} selected`);
    addMessage(
      "assistant",
      `Language selected: ${selected.label}. I will answer in ${selected.name}${selected.dialect ? " style with Hindi voice support" : ""}.`,
    );
  }

  function pickVoice() {
    if (!window.speechSynthesis) return null;
    const voices = availableVoices.length ? availableVoices : window.speechSynthesis.getVoices();
    const base = getLanguageBase(language);
    const label = languages.find((item) => item.code === language)?.label.toLowerCase();
    return (
      voices.find((voice) => voice.lang === language) ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith(`${base}-`)) ||
      voices.find((voice) => voice.name?.toLowerCase().includes(label)) ||
      null
    );
  }

  function hasNativeVoice() {
    const base = getLanguageBase(language);
    return availableVoices.some((voice) => voice.lang === language || voice.lang?.toLowerCase().startsWith(`${base}-`));
  }

  async function playSarvamSpeech(text) {
    const response = await api("/ai/sarvam/tts", {
      method: "POST",
        body: JSON.stringify({
          text,
        language: getApiLanguage(language),
        speaker: sarvamSpeaker,
        pace: 0.9,
        temperature: 0.45,
      }),
    });

    sarvamAudioRef.current?.pause?.();
    const audio = new Audio(`data:${response.audioMimeType || "audio/wav"};base64,${response.audioBase64}`);
    sarvamAudioRef.current = audio;
    await new Promise((resolve, reject) => {
      audio.onended = () => {
        if (sarvamAudioRef.current === audio) sarvamAudioRef.current = null;
        resolve();
      };
      audio.onerror = () => reject(new Error("Sarvam audio playback failed."));
      audio.play().catch(reject);
    });
  }

  async function speak(text, { forceSpeak = false } = {}) {
    if ((!forceSpeak && assistantMode !== "voice") || !speakReplies || !text) {
      return Promise.resolve();
    }

    const runId = speechRunRef.current + 1;
    speechRunRef.current = runId;
    window.speechSynthesis.cancel();

    const matchingVoice = pickVoice();
    const chunks = splitSpeechText(text);

    speakingRef.current = true;
    setSpeaking(true);
    setRobotStatus("Speaking answer...");
    for (const chunk of chunks) {
      if (speechRunRef.current !== runId) break;
      if (sarvamEnabled && !sarvamTtsBlockedRef.current) {
        try {
          await playSarvamSpeech(chunk);
          continue;
        } catch (error) {
          sarvamTtsBlockedRef.current = true;
          setRobotStatus("Sarvam voice fallback");
        }
      }

      if (!window.speechSynthesis) break;
      await new Promise((resolve) => {
        let finished = false;
        const utterance = new SpeechSynthesisUtterance(chunk);
        const fallbackTimer = window.setTimeout(() => finish(), Math.max(3500, chunk.length * 85));
        const finish = () => {
          if (finished) return;
          finished = true;
          window.clearTimeout(fallbackTimer);
          resolve();
        };

        utterance.lang = getApiLanguage(language);
        if (matchingVoice) utterance.voice = matchingVoice;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      });
    }

    if (speechRunRef.current === runId) {
      speakingRef.current = false;
      setSpeaking(false);
      setRobotStatus(continuousListening ? "Listening will restart..." : "Ready for farming and marketplace help");
    }
  }

  async function reply(content, options = {}) {
    addMessage("assistant", content);
    await speak(content, options);
  }

  async function navigateAndReply(path, label) {
    navigate(path);
    setOpen(false);
    setRobotStatus(`Opening ${label}`);
    const base = getLanguageBase(language);
    const format = spokenCommandReply[base] || spokenCommandReply.en;
    await reply(format(label));
    return true;
  }

  async function applyRobotAction(action, content) {
    if (!action?.action) return false;
    if (action.action === "navigate" && (action.path || action.parameters?.path)) {
      const path = action.path || action.parameters.path;
      const label = action.label || action.parameters?.label || "page";
      navigate(path);
      setOpen(false);
      setRobotStatus(`Robot action: opening ${label}`);
      await reply(content || `Opening ${label}.`);
      return true;
    }
    return false;
  }

  async function handleCommand(rawText) {
    const text = normalizeText(rawText);
    if (!text) return false;

    const directVoiceMatch = findCommandMatch(text, user);
    const shortPageCommand = (assistantMode === "voice" || keepListeningRef.current) && text.split(" ").length <= 5;
    if (directVoiceMatch && (isNavigationIntent(text) || shortPageCommand)) {
      return navigateAndReply(directVoiceMatch.path, directVoiceMatch.label);
    }

    if (
      text.includes("stop listening") ||
      text.includes("stop voice") ||
      text.includes("stop") ||
      text.includes("chup") ||
      text.includes("pause") ||
      text.includes("चुप") ||
      text.includes("रुको")
    ) {
      stopListening();
      window.speechSynthesis?.cancel?.();
      setSpeaking(false);
      setRobotStatus("Voice stopped");
      await reply(getLocalMessage(language, "stop"));
      return true;
    }

    if (text.includes("help") || text.includes("madad") || text.includes("sahayata") || text.includes("मदद") || text.includes("सहायता")) {
      await reply(getLocalMessage(language, "help"));
      return true;
    }

    if (!isNavigationIntent(text)) return false;

    const match = findCommandMatch(text, user);
    if (match) return navigateAndReply(match.path, match.label);

    if (/\b(this|that|page|screen|section|tab)\b/i.test(text)) {
      await reply(getLocalMessage(language, "needPageName"));
      return true;
    }

    return false;
  }

  async function handleSarvamAgent(rawText) {
    if (!sarvamEnabled) return false;
    try {
      setRobotStatus("Sarvam agent is planning...");
      const action = await api("/ai/sarvam/agent", {
        method: "POST",
        body: JSON.stringify({
          message: rawText,
          language: getApiLanguage(language),
          userRole: user?.role || "guest",
          currentPage: location.pathname,
        }),
      });

      if (action.action === "navigate" && action.path) {
        navigate(action.path);
        setOpen(false);
        await reply(action.content || `Opening ${action.label || "page"}.`);
        return true;
      }

      if (action.action === "product_draft") {
        localStorage.setItem("krishi_sarvam_product_draft", JSON.stringify(action.draft || {}));
        if (action.path) navigate(action.path);
        await reply(action.content || "I prepared a crop listing draft. Please review it before submitting.");
        return true;
      }

      if (action.action === "guide" || action.action === "language_tools") {
        await reply(action.content || getLocalMessage(language, "help"));
        return true;
      }

      return false;
    } catch {
      setRobotStatus("Sarvam agent fallback");
      return false;
    }
  }

  function scheduleListeningRestart() {
    clearTimeout(restartTimerRef.current);
    if (!keepListeningRef.current || assistantMode !== "voice") return;
    restartTimerRef.current = setTimeout(() => {
      if (keepListeningRef.current && !processingRef.current && !speakingRef.current) {
        startRecognition({ silent: true });
      } else if (keepListeningRef.current && (processingRef.current || speakingRef.current)) {
        scheduleListeningRestart();
      }
    }, 900);
  }

  function stopSarvamRecorder() {
    clearTimeout(recordTimerRef.current);
    try {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } catch {}
    mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  }

  async function startSarvamRecognition({ silent = false } = {}) {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      startBrowserRecognition({ silent });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      recorder.onstart = () => {
        setListening(true);
        setRobotStatus("Sarvam is listening...");
        if (!silent) addMessage("assistant", getLocalMessage(language, "listening"));
      };
      recorder.onerror = () => {
        setListening(false);
        stopSarvamRecorder();
        if (keepListeningRef.current && !processingRef.current && !speakingRef.current) startBrowserRecognition({ silent: true });
      };
      recorder.onstop = async () => {
        setListening(false);
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;

        if (!chunks.length) {
          scheduleListeningRestart();
          return;
        }

        try {
          setRobotStatus("Sarvam is understanding...");
          processingRef.current = true;
          const blob = new Blob(chunks, { type: mimeType });
          const audioBase64 = await blobToBase64(blob);
          const response = await api("/ai/sarvam/stt", {
            method: "POST",
            body: JSON.stringify({
              audioBase64,
              mimeType,
              language: getApiLanguage(language),
              mode: "transcribe",
            }),
          });
          const transcript = String(response.transcript || "").trim();
          processingRef.current = false;
          if (transcript) {
            setInput(transcript);
            askAssistant(transcript);
          } else {
            setRobotStatus("No speech heard");
            scheduleListeningRestart();
          }
        } catch (error) {
          processingRef.current = false;
          setRobotStatus("Sarvam STT fallback");
          if (keepListeningRef.current && !speakingRef.current) startBrowserRecognition({ silent: true });
        }
      };

      recorder.start();
      recordTimerRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, SARVAM_RECORDING_MS);
    } catch {
      setRobotStatus("Microphone fallback");
      startBrowserRecognition({ silent });
    }
  }

  async function askAssistant(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) {
      scheduleListeningRestart();
      return;
    }

    addMessage("user", trimmed);
    setInput("");
    processingRef.current = true;

    const detectedName = extractUserName(trimmed);
    const nextUserName = detectedName || userName;
    if (detectedName) setUserName(detectedName);

    if (await handleCommand(trimmed)) {
      processingRef.current = false;
      scheduleListeningRestart();
      return;
    }

    if (assistantMode === "voice" && (isNavigationIntent(normalizeText(trimmed)) || /\b(add|list|sell|open|show|go|navigate|khol|kholo)\b/i.test(trimmed))) {
      if (await handleSarvamAgent(trimmed)) {
        processingRef.current = false;
        scheduleListeningRestart();
        return;
      }
    }

    setLoading(true);
    setRobotStatus("Robot is thinking...");
    try {
      const response = await api("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: trimmed,
          language,
          speechLanguage: getApiLanguage(language),
          languageName: getLanguageOption(language).name,
          userName: nextUserName,
          sessionId: robotSessionId,
          userRole: user?.role || "guest",
          currentPage: location.pathname,
          forceLive: false,
          preferLive: true,
          providerMode: "gemini-local",
          prompt: buildPrompt({ text: trimmed, language, user, location, userName: nextUserName }),
        }),
      });
      if (response.status === 429) {
        setRobotStatus("Gemini quota fallback");
      } else if (response.provider === "gemini") {
        setRobotStatus("Gemini live answer");
      } else {
        setRobotStatus(response.intent === "unknown" ? "Local safety answer" : "KrishiNova local guide");
      }
      if (response.detectedLanguage && isSupportedLanguage(response.detectedLanguage) && response.detectedLanguage !== language) {
        setLanguage(response.detectedLanguage);
        setRobotStatus(`${getLanguageOption(response.detectedLanguage).label} detected`);
      }
      if (await applyRobotAction(response.action, response.content)) return;
      await reply(response.content || response.message || getLocalMessage(language, "noAnswer"));
    } catch (error) {
      setRobotStatus("Connection issue");
      await reply(error.message || getLocalMessage(language, "assistantDown"));
    } finally {
      setLoading(false);
      processingRef.current = false;
      scheduleListeningRestart();
    }
  }

  function startRecognition({ silent = false } = {}) {
    if (assistantMode !== "voice") setAssistantMode("voice");
    if (processingRef.current || speakingRef.current) {
      scheduleListeningRestart();
      return;
    }
    if (sarvamEnabled) {
      startSarvamRecognition({ silent });
      return;
    }
    startBrowserRecognition({ silent });
  }

  function startBrowserRecognition({ silent = false } = {}) {
    if (assistantMode !== "voice") setAssistantMode("voice");
    if (!supportsVoice) {
      keepListeningRef.current = false;
      setContinuousListening(false);
      reply(getLocalMessage(language, "unsupported"), { forceSpeak: true });
      return;
    }

    try {
      const SpeechRecognition = getSpeechRecognition();
      const recognition = new SpeechRecognition();
      recognition.lang = getApiLanguage(language);
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        setListening(true);
        setRobotStatus("Listening...");
        if (!silent) addMessage("assistant", getLocalMessage(language, "listening"));
      };
      recognition.onresult = (event) => {
        const resultIndex = event.resultIndex ?? 0;
        const transcript = event.results?.[resultIndex]?.[0]?.transcript || event.results?.[0]?.[0]?.transcript || "";
        setInput(transcript);
        askAssistant(transcript);
      };
      recognition.onerror = (event) => {
        setListening(false);
        if (event?.error === "no-speech" && keepListeningRef.current) {
          setRobotStatus("Listening again...");
          scheduleListeningRestart();
          return;
        }
        if (event?.error === "aborted" && !keepListeningRef.current) {
          return;
        }
        keepListeningRef.current = false;
        setContinuousListening(false);
        reply(getLocalMessage(language, "micError"), { forceSpeak: true });
      };
      recognition.onend = () => {
        setListening(false);
        if (keepListeningRef.current && !processingRef.current && !speakingRef.current) scheduleListeningRestart();
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setListening(false);
      keepListeningRef.current = false;
      setContinuousListening(false);
      reply(getLocalMessage(language, "micError"), { forceSpeak: true });
    }
  }

  async function startListening() {
    keepListeningRef.current = true;
    setContinuousListening(true);
    setRobotStatus("Continuous listening on");
    if (assistantMode !== "voice") setAssistantMode("voice");
    await reply(getLocalMessage(language, "continuousOn"), { forceSpeak: true });
    if (keepListeningRef.current && !processingRef.current && !speakingRef.current) {
      startRecognition({ silent: true });
    } else {
      scheduleListeningRestart();
    }
  }

  function stopListening() {
    keepListeningRef.current = false;
    setContinuousListening(false);
    setRobotStatus("Ready for farming and marketplace help");
    clearTimeout(restartTimerRef.current);
    clearTimeout(recordTimerRef.current);
    recognitionRef.current?.stop?.();
    stopSarvamRecorder();
    speechRunRef.current += 1;
    speakingRef.current = false;
    sarvamAudioRef.current?.pause?.();
    sarvamAudioRef.current = null;
    window.speechSynthesis?.cancel?.();
    setListening(false);
    setSpeaking(false);
  }

  return (
    <section className={open ? "voiceAssistant open" : "voiceAssistant"} aria-label="KrishiNova voice assistant">
      {open ? (
        <div className="voicePanel">
          <div className="voiceHeader">
            <div>
              <span>Voice AI</span>
              <strong>KrishiNova Sahayak</strong>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close voice assistant">
              x
            </button>
          </div>

          <div className={listening || speaking || loading ? "voiceRobot active" : "voiceRobot"}>
            <div className="voiceRobotAvatar" aria-hidden="true">
              <span className="robotSprout">+</span>
              <span className="robotEye left" />
              <span className="robotEye right" />
              <span className="robotMouth" />
            </div>
            <div>
              <strong>Agri Talk Robot</strong>
              <p>{robotStatus}</p>
            </div>
          </div>

          <div className="voiceMessages" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`voiceMessage ${message.role}`} key={`${message.role}-${index}`}>
                <span>{message.role === "user" ? "You" : "Assistant"}</span>
                <p>{message.content}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="voiceControls">
            <div className="voiceModeSwitch" aria-label="Assistant mode">
              <button className={assistantMode === "chat" ? "selected" : ""} type="button" onClick={() => setAssistantMode("chat")}>
                Chat mode
              </button>
              <button className={assistantMode === "voice" ? "selected" : ""} type="button" onClick={() => setAssistantMode("voice")}>
                Voice mode
              </button>
            </div>
            <label>
              Language
              <select value={language} onChange={(event) => handleLanguageChange(event.target.value)}>
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}{item.dialect ? " (Hindi voice)" : ""}
                  </option>
                ))}
              </select>
            </label>
            {assistantMode === "voice" ? (
              <label className="voiceToggle">
                <input
                  checked={speakReplies}
                  type="checkbox"
                  onChange={(event) => {
                    setSpeakReplies(event.target.checked);
                    if (!event.target.checked) window.speechSynthesis?.cancel?.();
                  }}
                />
                Speak replies
              </label>
            ) : null}
          </div>

          <div className="voiceProviderRow">
            <label>
              Voice engine
              <select value={voiceProvider} onChange={(event) => setVoiceProvider(event.target.value)}>
                <option value="auto">Auto Sarvam</option>
                <option value="sarvam">Sarvam AI</option>
                <option value="browser">Browser voice</option>
              </select>
            </label>
            <label>
              Sarvam speaker
              <select value={sarvamSpeaker} onChange={(event) => setSarvamSpeaker(event.target.value)} disabled={!sarvamStatus.configured}>
                {(sarvamStatus.speakers?.length ? sarvamStatus.speakers : ["anand", "simran", "shubh", "priya"]).map((speaker) => (
                  <option key={speaker} value={speaker}>
                    {speaker}
                  </option>
                ))}
              </select>
            </label>
            <span className={sarvamStatus.configured ? "voiceProviderBadge active" : "voiceProviderBadge"}>
              {sarvamStatus.configured ? "Sarvam ready" : "Sarvam key needed"}
            </span>
          </div>

          {assistantMode === "voice" ? (
            <p className="voiceModeNote">
              {sarvamEnabled
                ? `${getLanguageOption(language).label} voice help is active through Sarvam. Regional dialect presets use the closest supported voice and ask AI to answer naturally.`
                : supportsVoice
                  ? hasNativeVoice()
                    ? "Browser voice mode is ready for the selected language."
                    : "Browser may use its default voice if this language voice is not installed."
                  : "This browser does not support microphone voice input. Use chat mode."}
            </p>
          ) : (
            <p className="voiceModeNote">Chat mode is silent. Type your question and read the answer.</p>
          )}

          <div className="voiceQuickActions" aria-label="Quick chatbot prompts">
            {quickActions.map((question) => (
              <button key={question} type="button" onClick={() => askAssistant(question)} disabled={loading}>
                {question}
              </button>
            ))}
          </div>

          <form
            className="voiceForm"
            onSubmit={(event) => {
              event.preventDefault();
              askAssistant(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={assistantMode === "voice" ? "Say: open contact page, what is urea..." : "Type: open contact page, what is urea..."}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? "Thinking" : "Ask"}
            </button>
          </form>

          <div className="voiceActionRow">
            {assistantMode === "voice" ? (
              <button className={continuousListening ? "danger" : ""} type="button" onClick={continuousListening ? stopListening : startListening}>
                {continuousListening ? "Stop listening" : "Start listening"}
              </button>
            ) : (
              <button type="button" onClick={() => setAssistantMode("voice")}>
                Start voice mode
              </button>
            )}
            <button type="button" onClick={() => askAssistant("help")}>
              Help
            </button>
            <button type="button" onClick={() => navigate(roleHome(user?.role))}>
              Open workspace
            </button>
          </div>

          <p className="voicePrivacy">
            {assistantMode === "voice"
              ? "Start listening keeps the microphone active in short turns until you stop it. Known app questions answer locally first."
              : "Chat mode does not use the microphone. Known app questions answer locally first; unknown questions go to Gemini if configured."}
          </p>
        </div>
      ) : null}

      <button className={listening || speaking ? "voiceFab active" : "voiceFab"} type="button" onClick={() => setOpen(true)}>
        <span>AI</span>
        <strong>{listening ? "Listening" : continuousListening ? "Voice On" : assistantMode === "voice" ? "Voice Help" : "Chat Help"}</strong>
      </button>
    </section>
  );
}
