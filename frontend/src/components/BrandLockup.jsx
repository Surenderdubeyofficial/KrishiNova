import { BRAND } from "../branding.js";

export default function BrandLockup({ theme = "light", compact = false, subtitle = true }) {
  return (
    <span className={`brandLockup brandLockup-${theme} ${compact ? "brandLockupCompact" : ""}`}>
      <img className="brandLockupMark" src={BRAND.logo} alt={`${BRAND.name} logo`} />
      <span className="brandLockupText">
        <strong>{BRAND.name}</strong>
        {subtitle ? <small>{BRAND.subtitle}</small> : null}
      </span>
    </span>
  );
}
