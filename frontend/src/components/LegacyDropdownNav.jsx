import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUi } from "../UiContext.jsx";

export default function LegacyDropdownNav({ icon, label, items }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const location = useLocation();
  const { t } = useUi();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <li className="nav-item">
      <div className={`dropdown legacyDropdown ${open ? "show" : ""}`} ref={wrapperRef}>
        <button
          type="button"
          className="nav-link dropdown-toggle text-white legacyDropdownTrigger btn btn-link"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <span className="text-white nav-link-inner--text">
            <i className={`text-white ${icon}`} /> {t(label)}
          </span>
        </button>
        <div className={`dropdown-menu legacyDropdownMenu ${open ? "show" : ""}`} role="menu">
          {items.map((item) => (
            <Link key={item.to} className="dropdown-item" to={item.to} onClick={() => setOpen(false)}>
              {t(item.label)}
            </Link>
          ))}
        </div>
      </div>
    </li>
  );
}
