import { useUi } from "../UiContext.jsx";

export default function LegacySection({ badge, children, containerClass = "container" }) {
  const { t } = useUi();
  return (
    <section className="modernPageFrame">
      <div className={containerClass === "container-fluid" ? "modernPageContainer fluid" : "modernPageContainer"}>
        <div className="modernPageBadge">{t(badge)}</div>
        {children}
      </div>
    </section>
  );
}
