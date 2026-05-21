import { ADMIN_CONTACT, BRAND } from "../branding.js";
import { useUi } from "../UiContext.jsx";
import BrandLockup from "./BrandLockup.jsx";

export default function LegacyFooter() {
  const { t } = useUi();
  return (
    <footer className="footer legacyFooter">
      <div className="container">
        <div className="row">
          <div className="col-12 col-md-3 align-self-center mb-4 mb-md-0">
            <BrandLockup theme="light" />
            <p className="legacyFooterTagline mt-3 mb-0">
              {t("Smart agricultural trade, prediction, and grower support with a stronger modern identity.")}
            </p>
          </div>

          <div className="offset-sm-1 col-12 col-md-4 mt-4 mt-md-0">
            <h5>{t("Our Address")}</h5>
            <address>
              {ADMIN_CONTACT.address}
              <br />
              India
              <br />
              <div className="btn-group text-center mt-2" role="group">
                <a className="btn btn-primary" href={ADMIN_CONTACT.phoneHref}>
                  <i className="fa fa-phone" /> {t("Call")}
                </a>
                <a className="btn btn-info" href={ADMIN_CONTACT.linkedin} target="_blank" rel="noreferrer">
                  <i className="fab fa-linkedin" /> LinkedIn
                </a>
                <a className="btn btn-success" href={`mailto:${ADMIN_CONTACT.email}`}>
                  <i className="fa fa-envelope-o" /> {t("Email")}
                </a>
              </div>
            </address>
          </div>

          <div className="col-12 col-md-3 align-self-center mt-4 mt-md-0">
            <div className="footerSocialGrid">
              <a
                target="_blank"
                href={`mailto:${ADMIN_CONTACT.email}`}
                rel="noreferrer"
                className="footerSocialBtn footerSocialEmail"
                aria-label="Email"
              >
                <i className="fas fa-envelope" />
              </a>
              <a
                target="_blank"
                href={ADMIN_CONTACT.linkedin}
                rel="noreferrer"
                className="footerSocialBtn footerSocialLinkedIn"
                aria-label="LinkedIn"
              >
                <i className="fab fa-linkedin-in" />
              </a>
              <a
                target="_blank"
                href={ADMIN_CONTACT.github}
                rel="noreferrer"
                className="footerSocialBtn footerSocialGithub"
                aria-label="GitHub"
              >
                <i className="fab fa-github" />
              </a>
              <a
                target="_blank"
                href={ADMIN_CONTACT.phoneHref}
                rel="noreferrer"
                className="footerSocialBtn footerSocialPhone"
                aria-label="Phone"
              >
                <i className="fas fa-phone" />
              </a>
              <a
                target="_blank"
                href={ADMIN_CONTACT.mapUrl}
                rel="noreferrer"
                className="footerSocialBtn footerSocialMap"
                aria-label="Map"
              >
                <i className="fas fa-map-marker-alt" />
              </a>
            </div>
          </div>
        </div>

        <hr />

        <div className="row justify-content-center">
          <div className="col-auto">
            <p>&copy; 2026 {BRAND.name}, Built by {ADMIN_CONTACT.name}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
