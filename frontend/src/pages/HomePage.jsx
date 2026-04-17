import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { BRAND } from "../branding.js";
import BrandLockup from "../components/BrandLockup.jsx";
import { useUi } from "../UiContext.jsx";

const quotes = [
  {
    text: "Farming looks mighty easy when your plow is a pencil, and you're a thousand miles from the corn field.",
    author: "DWIGHT D. EISENHOWER",
  },
  {
    text: "To forget how to dig the earth and to tend the soil is to forget ourselves.",
    author: "MAHATMA GANDHI",
  },
  {
    text: "The ultimate goal of farming is not the growing of crops, but the cultivation and perfection of human beings.",
    author: "MASANOBU FUKUOKA",
  },
];

export default function HomePage() {
  const { t, language } = useUi();
  const [overview, setOverview] = useState(null);
  const [news, setNews] = useState({ articles: [] });
  const [weather, setWeather] = useState({ forecast: [], city: "Udupi" });
  const [contact, setContact] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    message: "",
  });
  const [message, setMessage] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    api("/public/overview").then(setOverview).catch(console.error);
    api("/integrations/news?q=agriculture").then(setNews).catch(console.error);
    api("/integrations/weather?city=Udupi").then(setWeather).catch(console.error);
  }, []);

  async function submitContact(event) {
    event.preventDefault();
    try {
      const response = await api("/public/contact", {
        method: "POST",
        body: JSON.stringify(contact),
      });
      setMessage(
        response.emailDelivered
          ? (language === "hi" ? "संदेश सहेजा गया और ईमेल भेज दिया गया।" : "Message saved and email delivered.")
          : response.emailNote
            ? `Message saved. ${response.emailNote}.`
            : response.message,
      );
      setContact({ name: "", mobile: "", email: "", address: "", message: "" });
    } catch (error) {
      setMessage(error.message);
    }
  }

  const currentQuote = quotes[quoteIndex];
  const techStack = [
    {
      title: "Frontend Engineering",
      lead: "React + Vite",
      details: "JavaScript, HTML5, CSS3, responsive UI, reusable components",
    },
    {
      title: "Backend Engineering",
      lead: "Node.js + Express.js",
      details: "REST APIs, role-based access, protected routes, server-side validations",
    },
    {
      title: "Database Layer",
      lead: "MySQL",
      details: "SQL schema design, crop marketplace data, invoices, customer and farmer records",
    },
    {
      title: "Authentication System",
      lead: "JWT + OTP + Google Sign-In",
      details: "Email OTP, mobile OTP, Google login, profile completion flow",
    },
    {
      title: "AI and Smart Tools",
      lead: "Gemini + OpenAI fallback",
      details: "Chatbot assistance, crop prediction, yield prediction, rainfall and fertilizer tools",
    },
    {
      title: "Payments and Integrations",
      lead: "Razorpay + Twilio + SMTP APIs",
      details: "Payment integration, SMS verification, email delivery, weather and news services",
    },
  ];

  return (
    <main className="phpHomeModern">
      <section className="phpHeroExact">
        <div className="phpHeroText">
          <div className="heroBrandIntro">
            <BrandLockup theme="light" />
          </div>
          <h1>{BRAND.name}</h1>
          <p>{BRAND.subtitle}</p>
          <div className="phpQuoteExact">
            <h6>{currentQuote.text}</h6>
            <div className="phpQuoteExactFooter">
              <span>{currentQuote.author}</span>
              <button className="phpQuoteRefresh" type="button" onClick={() => setQuoteIndex((current) => (current + 1) % quotes.length)}>
                {t("Refresh")}
              </button>
            </div>
          </div>
          <div className="ctaRow">
            <Link className="button" to="/auth">{t("Login / Register")}</Link>
            <Link className="ghostButton darkGhost" to="/customer/cstock_crop">{t("Marketplace")}</Link>
          </div>
        </div>
        <div className="phpHeroPlant">
          <img src="/img/agri.png" alt="Agriculture landscape" />
          <div className="phpHeroMiniStats">
            <div>
              <strong>{overview?.stats?.farmers ?? 0}</strong>
              <span>{t("Farmers")}</span>
            </div>
            <div>
              <strong>{overview?.stats?.customers ?? 0}</strong>
              <span>{t("Customers")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel phpSectionExact">
        <div className="phpSectionHeading">
          <span className="eyebrow">{t("Insight")}</span>
          <h2>{t("Features")}</h2>
        </div>
        <div className="phpFeatureRow">
          <div className="phpFeatureCopy">
            <h3>{t("Farmers")}</h3>
            <p>
              {language === "hi"
                ? "किसान फसल और उर्वरक की सिफारिशें प्राप्त कर सकते हैं, मौसम का अनुमान लगा सकते हैं, कृषि समाचार पढ़ सकते हैं और सीधे ग्राहकों को फसल बेच सकते हैं।"
                : "Farmers can get recommendations for crop and fertilizer, predict the weather, read agriculture news, and directly sell crops to customers."}
            </p>
          </div>
          <div className="phpFeatureImage">
            <img src="/img/agri.png" alt="Farmers" />
          </div>
        </div>
        <div className="phpFeatureRow phpFeatureRowReverse">
          <div className="phpFeatureImage">
            <img src="/img/customers.png" alt="Customers" />
          </div>
          <div className="phpFeatureCopy">
            <h3>{t("Customers")}</h3>
            <p>
              {language === "hi"
                ? "ग्राहक बिचौलियों के बिना सीधे किसानों से फसल खरीद सकते हैं और एक ही जगह उपलब्ध स्टॉक की तुलना कर सकते हैं।"
                : "Customers can buy crops directly from farmers without the involvement of middlemen and compare available market stock in one place."}
            </p>
          </div>
        </div>
      </section>

      <section className="panel phpSectionExact phpCapabilityExact">
        <div className="phpCapabilityCopy">
          <span className="eyebrow">{t("Features")}</span>
          <h2>{t("The next step in farming")}</h2>
          <p className="sectionText">
            {t("We bring the future of farming along with strong tools for assisting farmers through prediction, trade, and live information.")}
          </p>
          <ul className="phpFeatureList">
            <li>{t("Highly reliable and accurate.")}</li>
            <li>{t("Faster and responsive website.")}</li>
            <li>{t("Real time weather forecast.")}</li>
            <li>{t("Integrated news feature.")}</li>
          </ul>
        </div>
        <div className="phpCapabilityImage">
          <img src="/img/features.png" alt="Features" />
        </div>
      </section>

      <section className="panel phpSectionExact">
        <div className="phpSectionHeading">
          <span className="eyebrow">{t("Stack")}</span>
          <h2>{t("Technologies Used")}</h2>
          <p className="sectionText">{language === "hi" ? `${BRAND.name} और इसके उन्नत कृषि वर्कफ़्लो को चलाने वाला टेक स्टैक।` : `The stack powering ${BRAND.name} and its upgraded agriculture workflows.`}</p>
        </div>
        <div className="phpTechGrid phpTechGridDetailed">
          {techStack.map((item) => (
            <article className="phpTechCard phpTechCardDetailed" key={item.title}>
              <span className="phpTechLabel">{item.title}</span>
              <strong>{item.lead}</strong>
              <p>{item.details}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel phpSectionExact">
        <div className="phpSectionHeading">
          <span className="eyebrow">{language === "hi" ? "लाइव अपडेट" : "Live Insights"}</span>
          <h2>{t("News, Weather & Contact")}</h2>
        </div>
        <div className="grid two">
          <article className="card">
            <strong>{t("Agriculture News")}</strong>
            {(news.articles || []).slice(0, 4).map((article) => (
              <div className="contentRow" key={article.url}>
                <div>
                  <h3>{article.title}</h3>
                  <p>{article.source?.name || (language === "hi" ? "कृषि स्रोत" : "Agriculture source")}</p>
                </div>
                <a className="textLink" href={article.url} target="_blank" rel="noreferrer">
                  {t("Visit")}
                </a>
              </div>
            ))}
          </article>
          <article className="card">
            <strong>{t("Forecast Preview")} {weather.city ? (language === "hi" ? `${weather.city} के लिए` : `for ${weather.city}`) : ""}</strong>
            {(weather.forecast || []).slice(0, 4).map((item) => (
              <div className="contentRow" key={item.datetime}>
                <div>
                  <h3>{item.datetime}</h3>
                  <p>{item.label}, {item.description}</p>
                </div>
                <span>{item.tempMax} C / {item.tempMin} C</span>
              </div>
            ))}
          </article>
        </div>
        <div className="grid two phpBottomGrid">
          <article className="card">
            <strong>{t("Featured Market Crops")}</strong>
            {(overview?.featuredCrops || []).map((item) => (
              <div className="contentRow" key={item.crop}>
                <div>
                  <h3>{item.crop}</h3>
                  <p>{item.quantity} kg</p>
                </div>
                <span>Rs. {item.msp}</span>
              </div>
            ))}
          </article>
          <form className="card" onSubmit={submitContact}>
            <strong>{t("Contact Us")}</strong>
            <p className="sectionText">
              {language === "hi" ? "सुरेन्द्र दुबे से सीधे surenderdubey9582@gmail.com या 9582514339 पर संपर्क करें।" : "Reach Surender Dubey directly at surenderdubey9582@gmail.com or 9582514339."}
            </p>
            <input placeholder={t("Name")} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            <input placeholder={t("Mobile")} value={contact.mobile} onChange={(e) => setContact({ ...contact, mobile: e.target.value })} />
            <input placeholder={t("Email")} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <input placeholder={t("Address")} value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} />
            <textarea rows="4" placeholder={t("Message")} value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} />
            <button className="button" type="submit">{t("Send Message")}</button>
            {message ? <p className="feedback">{message}</p> : null}
          </form>
        </div>
      </section>
    </main>
  );
}
