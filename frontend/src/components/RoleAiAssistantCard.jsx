import { useMemo, useState } from "react";
import { api } from "../api";

const roleConfig = {
  farmer: {
    eyebrow: "Farmer AI Sahayak",
    title: "Ask farming, marketplace, and government-service questions",
    image: "/img/farmers.png",
    description:
      "Use this for crop disease, fertilizer, weather planning, product listing, payouts, KVK, Gram Panchayat, PM-Kisan, soil card, crop insurance, mandi/MSP, and agriculture office guidance.",
    assistantName: "Farmer AI Helpline",
    voiceHint: "Speak in your language about crop disease, schemes, stock, orders, or payout.",
    helplines: [
      { label: "Kisan Call Centre", value: "1800-180-1551", href: "tel:18001801551" },
      { label: "KrishiNova Support", value: "Contact admin from support page", href: "/contact" },
    ],
    prompts: [
      "My tomato leaves are yellow. What should I do?",
      "Which office helps with PM-Kisan and land record correction?",
      "How do I ask Gram Panchayat Sachiv for agriculture scheme help?",
      "Create a crop listing draft: tomato 50 kg price 30 in Udupi",
      "Explain farmer payout after delivery confirmation",
      "Which government services help with soil card, KCC, insurance and subsidy?",
    ],
    rolePrompt:
      "You are a farmer helpline assistant. Answer like a practical agriculture extension worker. Cover crop advice, KrishiNova marketplace steps, farmer payouts, verification, Gram Panchayat/Sachiv, Patwari/Lekhpal, Krishi Vigyan Kendra, agriculture department, PM-Kisan, Soil Health Card, Kisan Credit Card, crop insurance, mandi/MSP, FPO and CSC guidance. Do not promise eligibility; tell user to verify with official office.",
  },
  customer: {
    eyebrow: "Customer AI Help",
    title: "Ask buying, payment, delivery, invoice, and refund questions",
    image: "/img/customers.png",
    description: "Use this for crop search, verified farmer badges, cart, Razorpay payment, order tracking, delivery confirmation, invoice, review, chat, and dispute/refund help.",
    assistantName: "Customer Support AI",
    voiceHint: "Speak about crop search, payment, order tracking, invoice, refund, or delivery.",
    helplines: [{ label: "KrishiNova Support", value: "Contact admin from support page", href: "/contact" }],
    prompts: [
      "How do I find verified farmers?",
      "How do I track my order?",
      "Payment is successful but order is pending. What should I check?",
      "How do I download invoice?",
      "How do I raise refund or dispute?",
      "Explain safe buying from farmers",
    ],
    rolePrompt:
      "You are a customer support assistant for an agriculture marketplace. Help with browsing crops, verified farmers, cart, payment, order tracking, delivery confirmation, invoice, farmer chat, reviews, disputes and refunds. Keep steps short and clear.",
  },
  admin: {
    eyebrow: "Admin AI Control Room",
    title: "Ask trust, revenue, payout, dispute, and platform-control questions",
    image: "/img/admin.png",
    description: "Use this for farmer verification, listing approval, all orders/payments, commission, payout release, disputes, refunds, user blocking, analytics, featured crops, and contact messages.",
    assistantName: "Admin Operations AI",
    voiceHint: "Speak about verification, listing approval, dispute proof, payout release, and commission.",
    helplines: [{ label: "Platform Owner", value: "Admin profile and contact records", href: "/admin/profile" }],
    prompts: [
      "How should I verify a farmer?",
      "When should payout be released?",
      "Explain dispute refund decision flow",
      "How do I check commission earned?",
      "What should I monitor daily as admin?",
      "How do I manage featured listings and contact messages?",
    ],
    rolePrompt:
      "You are an admin operations assistant for KrishiNova. Help with verification, approvals, payments, commission, payouts, disputes, refunds, block/unblock, analytics, featured listings, contact messages and marketplace trust. Emphasize audit trail and role-based access.",
  },
};

function getConfig(role) {
  return roleConfig[role] || roleConfig.customer;
}

function openAssistant(mode, prompt = "") {
  window.dispatchEvent(
    new CustomEvent("krishinova-open-assistant", {
      detail: { mode, prompt, autoStart: mode === "voice" },
    }),
  );
}

export default function RoleAiAssistantCard({ role = "customer", currentPage = "" }) {
  const config = useMemo(() => getConfig(role), [role]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function ask(nextQuestion = question) {
    const text = String(nextQuestion || "").trim();
    if (!text) return;

    setQuestion(text);
    setLoading(true);
    setFeedback("");
    try {
      const response = await api("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          language: "en-IN",
          userRole: role,
          currentPage,
          preferLive: true,
          prompt: `${config.rolePrompt}

Current KrishiNova page: ${currentPage || "dashboard"}.
User role: ${role}.
User question: ${text}

Reply with:
1. Direct answer.
2. Where to go in KrishiNova.
3. Which official/local office or document may be needed, if relevant.`,
        }),
      });
      setAnswer(response.content || response.message || "No answer received.");
    } catch (error) {
      setFeedback(error.message || "AI help is not available right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`roleAiCard ${role}`}>
      <div className="roleAiHeader">
        <div className="roleAiIntro">
          <div className="roleAiAvatar">
            <img src={config.image} alt="" />
          </div>
          <div>
            <span>{config.eyebrow}</span>
            <h2>{config.title}</h2>
            <p>{config.description}</p>
          </div>
        </div>
        <div className="roleAiModeBox">
          <strong>{config.assistantName}</strong>
          <small>{config.voiceHint}</small>
        </div>
      </div>

      <div className="roleAiVoiceBar">
        <button type="button" onClick={() => openAssistant("voice", question || config.prompts[0])}>
          <i className="fas fa-microphone" />
          Talk by voice
        </button>
        <button type="button" onClick={() => openAssistant("chat", question || config.prompts[1])}>
          <i className="fas fa-comments" />
          Open full AI chat
        </button>
        <span>Uses Sarvam voice, local KrishiNova guide, then Gemini fallback when needed.</span>
      </div>

      <div className="roleAiPrompts">
        {config.prompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => ask(prompt)} disabled={loading}>
            {prompt}
          </button>
        ))}
      </div>

      <form
        className="roleAiForm"
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
      >
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={`Ask ${config.assistantName}...`} />
        <button type="submit" disabled={loading || !question.trim()}>
          {loading ? "Thinking" : "Ask AI"}
        </button>
      </form>

      {config.helplines.length ? (
        <div className="roleAiHelplines">
          {config.helplines.map((item) => (
            <a key={item.label} href={item.href}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </a>
          ))}
        </div>
      ) : null}

      {feedback ? <p className="roleAiFeedback">{feedback}</p> : null}
      {answer ? (
        <article className="roleAiAnswer">
          <span>AI Reply</span>
          <p>{answer}</p>
        </article>
      ) : null}
    </section>
  );
}
