import { useState } from "react";
import { api } from "../api";
import { ADMIN_CONTACT, BRAND } from "../branding.js";
import BrandLockup from "../components/BrandLockup.jsx";
import { useUi } from "../UiContext.jsx";

export default function ContactPage() {
  const { t } = useUi();
  const [contact, setContact] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    message: "",
  });
  const [message, setMessage] = useState("");

  async function submitContact(event) {
    event.preventDefault();
    try {
      const response = await api("/public/contact", {
        method: "POST",
        body: JSON.stringify(contact),
      });
      setMessage(response.message);
      setContact({ name: "", mobile: "", email: "", address: "", message: "" });
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="simpleContactPage">
      <section className="simpleContactHero">
        <div>
          <BrandLockup theme="dark" />
          <h1>{t("Contact")}</h1>
          <p>
            Need help with KrishiNova, crop selling, buying, payments, payouts, or account setup?
            Send a message or contact the admin directly.
          </p>
        </div>
        <img src="/img/farmers.png" alt="KrishiNova support for farmers" />
      </section>

      <section className="simpleContactGrid">
        <aside className="simpleContactCard">
          <span className="eyebrow">{t("Direct Contact")}</span>
          <h2>{ADMIN_CONTACT.name}</h2>
          <div className="simpleContactList">
            <a href={ADMIN_CONTACT.phoneHref}>
              <i className="fas fa-phone-alt" />
              <span>{ADMIN_CONTACT.mobile}</span>
            </a>
            <a href={`mailto:${ADMIN_CONTACT.email}`}>
              <i className="fas fa-envelope" />
              <span>{ADMIN_CONTACT.email}</span>
            </a>
            <a href={ADMIN_CONTACT.mapUrl} target="_blank" rel="noreferrer">
              <i className="fas fa-map-marker-alt" />
              <span>{ADMIN_CONTACT.address}</span>
            </a>
            <a href={ADMIN_CONTACT.github} target="_blank" rel="noreferrer">
              <i className="fab fa-github" />
              <span>GitHub</span>
            </a>
            <a href={ADMIN_CONTACT.linkedin} target="_blank" rel="noreferrer">
              <i className="fab fa-linkedin" />
              <span>LinkedIn</span>
            </a>
          </div>
        </aside>

        <form className="simpleContactCard simpleContactForm" onSubmit={submitContact}>
          <span className="eyebrow">{BRAND.name} Support</span>
          <h2>{t("Send Message")}</h2>
          <div className="simpleContactFields">
            <label>
              {t("Full Name")}
              <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            </label>
            <label>
              {t("Mobile Number")}
              <input value={contact.mobile} onChange={(e) => setContact({ ...contact, mobile: e.target.value })} />
            </label>
            <label>
              {t("Email Id")}
              <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            </label>
            <label>
              {t("Address")}
              <input value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} />
            </label>
            <label className="simpleContactMessage">
              {t("Message")}
              <textarea rows="6" value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} />
            </label>
          </div>
          <button className="button" type="submit">{t("Send Message")}</button>
          {message ? <p className="feedback">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}
