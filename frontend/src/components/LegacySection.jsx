import { useUi } from "../UiContext.jsx";

export default function LegacySection({ badge, children, containerClass = "container" }) {
  const { t } = useUi();
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
      <div className={containerClass}>
        <div className="row">
          <div className="col-md-8 mx-auto text-center">
            <span className="badge badge-danger badge-pill mb-3">{t(badge)}</span>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
