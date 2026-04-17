import LegacyFooter from "./LegacyFooter.jsx";
import LegacyNavbar from "./LegacyNavbar.jsx";

export default function Layout({ children }) {
  return (
    <div className="shell legacyApp">
      <LegacyNavbar />
      {children}
      <LegacyFooter />
    </div>
  );
}
