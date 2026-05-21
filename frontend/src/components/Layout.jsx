import LegacyFooter from "./LegacyFooter.jsx";
import LegacyNavbar from "./LegacyNavbar.jsx";
import VoiceAssistant from "./VoiceAssistant.jsx";

export default function Layout({ children }) {
  return (
    <div className="shell legacyApp">
      <LegacyNavbar />
      {children}
      <VoiceAssistant />
      <LegacyFooter />
    </div>
  );
}
