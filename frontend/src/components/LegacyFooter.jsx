import { BRAND } from "../branding.js";
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
              Karol Bagh, New Delhi 110005
              <br />
              India
              <br />
              <div className="btn-group text-center mt-2" role="group">
                <a className="btn btn-primary" href="tel:+919582514339">
                  <i className="fa fa-phone" /> {t("Call")}
                </a>
                <a className="btn btn-info" href="https://www.linkedin.com/in/surenderdubey/" target="_blank" rel="noreferrer">
                  <i className="fab fa-linkedin" /> LinkedIn
                </a>
                <a className="btn btn-success" href="mailto:surenderdubey9582@gmail.com">
                  <i className="fa fa-envelope-o" /> {t("Email")}
                </a>
              </div>
            </address>
          </div>

          <div className="col-12 col-md-3 align-self-center mt-4 mt-md-0">
            <div className="social-network text-center">
              <a target="_blank" href="mailto:surenderdubey9582@gmail.com" rel="noreferrer" className="btn btn-icon-only btn-linkedin rounded-circle">
                <i className="fas fa-envelope" />
              </a>
              <a target="_blank" href="https://www.linkedin.com/in/surenderdubey/" rel="noreferrer" className="btn btn-icon-only btn-twitter rounded-circle">
                <i className="fab fa-linkedin-in" />
              </a>
              <a target="_blank" href="https://github.com/Surenderdubeyofficial" rel="noreferrer" className="btn btn-icon-only btn-github rounded-circle">
                <i className="fab fa-github" />
              </a>
              <a target="_blank" href="tel:+919582514339" rel="noreferrer" className="btn btn-icon-only btn-facebook rounded-circle">
                <i className="fas fa-phone" />
              </a>
              <a target="_blank" href="https://maps.google.com/?q=Karol+Bagh+New+Delhi+110005+India" rel="noreferrer" className="btn btn-icon-only btn-instagram rounded-circle">
                <i className="fas fa-map-marker-alt" />
              </a>
            </div>
          </div>
        </div>

        <hr />

        <div className="row justify-content-center">
          <div className="col-auto">
            <p>&copy; 2026 {BRAND.name}, Built by Surender Dubey</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
