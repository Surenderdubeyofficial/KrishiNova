import { useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function FarmerChatbotPage() {
  const { t } = useUi();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function send(event) {
    event.preventDefault();
    if (!prompt.trim()) return;

    const input = prompt;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setPrompt("");
    setFeedback("");
    setSubmitting(true);

    try {
      const response = await api("/ai/chat", { method: "POST", body: JSON.stringify({ prompt: input }) });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.content || response.message || t("No response received from the assistant."),
        },
      ]);
    } catch (error) {
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

  return (
    <ProtectedRoute role="farmer">
      <LegacySection badge="Tools">
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-success mb-3">
              <div className="card-header">
                <span className="text-info display-4"> {t("Chat Bot")} </span>
              </div>
              <div className="card-body text-dark">
                <div className="legacyChatBox mb-3">
                  {messages.length ? (
                    messages.map((message, index) => (
                      <div key={index} className={`chatRow ${message.role}`}>
                        <strong className="d-block mb-1">{message.role === "user" ? t("You") : "KrishiNova AI"}</strong>
                        <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted">{t("Ask anything about crops, soil, fertilizer, weather, or farm planning.")}</div>
                  )}
                </div>
                {feedback ? <div className="alert alert-warning">{feedback}</div> : null}
                <form onSubmit={send}>
                  <div className="input-group">
                    <input
                      className="form-control"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t("Ask something about agriculture...")}
                      disabled={submitting}
                    />
                    <div className="input-group-append">
                      <button className="btn btn-success" type="submit" disabled={submitting || !prompt.trim()}>
                        {submitting ? t("Sending...") : t("Send")}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
