import { useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

const quickQuestions = [
  "My tomato leaves are yellow. What should I do?",
  "Which crop should I grow this season?",
  "What fertilizer dose is safe for wheat?",
  "How can I sell crops in KrishiNova?",
  "How do farmer payouts work?",
];

function extractWeatherCity(text) {
  const normalized = String(text || "").trim();
  if (!/\b(weather|wheather|forecast|temperature|rain|raining|mausam)\b/i.test(normalized)) {
    return "";
  }

  const withoutQuestionWords = normalized
    .replace(/\b(what|what's|is|the|today|now|current|please|tell|me|about|ka|ki|hai|in|for|weather|wheather|forecast|temperature|mausam)\b/gi, " ")
    .replace(/[?.!,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return withoutQuestionWords || "Delhi";
}

function formatWeatherAnswer(data, requestedCity) {
  const forecast = Array.isArray(data?.forecast) ? data.forecast.slice(0, 3) : [];
  if (!data?.configured) {
    return data?.message || "Weather service is not configured right now.";
  }
  if (!forecast.length) {
    return `I could not find forecast data for ${requestedCity}. Try a nearby city name.`;
  }

  const city = data.city || requestedCity;
  const lines = forecast.map((entry) => {
    const when = entry.datetime ? new Date(entry.datetime.replace(" ", "T")).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Next update";
    const temp = [entry.tempMin, entry.tempMax]
      .filter((value) => value !== undefined && value !== null)
      .map((value) => `${Math.round(Number(value))}C`)
      .join("-");
    const humidity = entry.humidity !== undefined && entry.humidity !== null ? `, humidity ${entry.humidity}%` : "";
    const wind = entry.windSpeed !== undefined && entry.windSpeed !== null ? `, wind ${entry.windSpeed} m/s` : "";
    return `${when}: ${entry.description || entry.label || "forecast"}${temp ? `, ${temp}` : ""}${humidity}${wind}`;
  });

  return `Weather for ${city}:\n${lines.join("\n")}`;
}

export default function FarmerChatbotPage() {
  const { t } = useUi();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste. I am your Agri Talk Robot. Ask me about crops, fertilizer, disease, weather planning, marketplace orders, payouts, or how to use KrishiNova.",
    },
  ]);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [provider, setProvider] = useState("Ready");

  async function ask(question) {
    const input = String(question || "").trim();
    if (!input || submitting) return;

    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setPrompt("");
    setFeedback("");
    setSubmitting(true);

    const weatherCity = extractWeatherCity(input);
    if (weatherCity) {
      setProvider("Checking weather...");
      try {
        const weather = await api(`/integrations/weather?city=${encodeURIComponent(weatherCity)}`);
        setProvider("Weather live");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: formatWeatherAnswer(weather, weatherCity),
          },
        ]);
      } catch (error) {
        setProvider("Weather unavailable");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: error.message || `I could not fetch weather for ${weatherCity}.`,
          },
        ]);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setProvider("Asking Gemini...");

    try {
      const response = await api("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: input,
          language: "en-IN",
          userRole: "farmer",
          currentPage: "/farmer/chatbot",
          preferLive: true,
          prompt: `User language: English.
User role: farmer.
Current page: /farmer/chatbot.
Reply like a practical agriculture assistant. Use clear short steps.
User said: ${input}`,
        }),
      });

      if (response.provider === "gemini") setProvider("Gemini live");
      else if (response.provider === "openai") setProvider("Live AI");
      else if (response.status === 429) setProvider("Quota fallback");
      else setProvider("Local guide");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.content || response.message || t("No response received from the assistant."),
        },
      ]);
    } catch (error) {
      setProvider("Offline");
      setFeedback(error.message || t("Chatbot is unavailable right now"));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t("I could not answer right now. Please try again in a moment."),
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  function send(event) {
    event.preventDefault();
    ask(prompt);
  }

  return (
    <ProtectedRoute role="farmer">
      <LegacySection badge="AI Tools">
        <div className="agriChatPage">
          <aside className="agriChatGuide">
            <div className={submitting ? "agriRobotCard active" : "agriRobotCard"}>
              <div className="agriRobotFace" aria-hidden="true">
                <span className="robotSprout">+</span>
                <span className="robotEye left" />
                <span className="robotEye right" />
                <span className="robotMouth" />
              </div>
              <div>
                <span>KrishiNova AI</span>
                <h2>Agri Talk Robot</h2>
                <p>{provider}</p>
              </div>
            </div>

            <div className="agriChatTips">
              <h3>Ask Like This</h3>
              <div className="agriPromptChips">
                {quickQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => ask(question)} disabled={submitting}>
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="agriChatShell">
            <div className="agriChatHeader">
              <div>
                <span>Farmer Assistant</span>
                <h1>Crop, Fertilizer and Marketplace Help</h1>
              </div>
              <strong>{provider}</strong>
            </div>

            <div className="agriChatMessages" aria-live="polite">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`agriChatBubble ${message.role}`}>
                  <span>{message.role === "user" ? t("You") : "Agri Talk Robot"}</span>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>

            {feedback ? <div className="agriChatAlert">{feedback}</div> : null}

            <form className="agriChatComposer" onSubmit={send}>
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t("Ask about crop disease, fertilizer, weather, orders, payouts...")}
                disabled={submitting}
              />
              <button type="submit" disabled={submitting || !prompt.trim()}>
                {submitting ? t("Thinking") : t("Ask")}
              </button>
            </form>
          </section>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
