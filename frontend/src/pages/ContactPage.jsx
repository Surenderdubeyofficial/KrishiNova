import { useState } from "react";
import { api } from "../api";
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
    <section className="section section-shaped section-lg">
      <div className="shape shape-style-1 shape-primary">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="container">
        <div className="row">
          <div className="col-md-8 mx-auto text-center">
            <span className="badge badge-danger badge-pill mb-3">{t("Contact")}</span>
          </div>
        </div>
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card">
              <div className="card-body bg-gradient-success text-white">
                <div className="row">
                  <div className="col-md-6 mb-3 mb-md-0">
                    <h4>{t("Direct Contact")}</h4>
                    <p className="mb-1"><strong>{t("Name")}:</strong> Surender Dubey</p>
                    <p className="mb-1"><strong>{t("Mobile")}:</strong> 9582514339</p>
                    <p className="mb-1"><strong>{t("Email")}:</strong> surenderdubey9582@gmail.com</p>
                    <p className="mb-0"><strong>{t("Address")}:</strong> Karol Bagh, New Delhi 110005, India</p>
                  </div>
                  <div className="col-md-6">
                    <h4>{t("Profiles")}</h4>
                    <p className="mb-1">
                      <strong>GitHub:</strong>{" "}
                      <a href="https://github.com/Surenderdubeyofficial" target="_blank" rel="noreferrer" className="text-white">
                        github.com/Surenderdubeyofficial
                      </a>
                    </p>
                    <p className="mb-0">
                      <strong>LinkedIn:</strong>{" "}
                      <a href="https://www.linkedin.com/in/surenderdubey/" target="_blank" rel="noreferrer" className="text-white">
                        linkedin.com/in/surenderdubey
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card">
              <div className="card-body bg-gradient-white">
                <form onSubmit={submitContact}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label>{t("Full Name")}</label>
                      <input className="form-control" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label>{t("Mobile Number")}</label>
                      <input className="form-control" value={contact.mobile} onChange={(e) => setContact({ ...contact, mobile: e.target.value })} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label>{t("Email Id")}</label>
                      <input className="form-control" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label>{t("Address")}</label>
                      <input className="form-control" value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} />
                    </div>
                    <div className="col-md-12 mb-3">
                      <label>{t("Message")}</label>
                      <textarea className="form-control" rows="7" value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} />
                    </div>
                    <div className="col-md-12">
                      <button className="btn btn-success btn-block" type="submit">{t("Send Message")}</button>
                    </div>
                  </div>
                </form>
                {message ? <div className="alert alert-info mt-3">{message}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
