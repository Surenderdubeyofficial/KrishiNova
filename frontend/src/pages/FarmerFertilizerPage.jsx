import { useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

const soilTypes = ["Sandy", "Loamy", "Black", "Red", "Clayey"];
const cropTypes = [
  "Maize",
  "Sugarcane",
  "Cotton",
  "Tobacco",
  "Paddy",
  "Barley",
  "Wheat",
  "Millets",
  "Oil seeds",
  "Pulses",
  "Ground Nuts",
];

export default function FarmerFertilizerPage() {
  const { t } = useUi();
  const [form, setForm] = useState({
    n: "",
    p: "",
    k: "",
    temperature: "",
    humidity: "",
    soilMoisture: "",
    soilType: "",
    cropType: "",
  });
  const [result, setResult] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    setResult("");

    try {
      const response = await api("/predictions/fertilizer-recommendation", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setResult(`Recommended Fertilizer is : ${response.result}`);
    } catch (error) {
      setFeedback(error.message || t("Recommendation failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedRoute role="farmer">
      <LegacySection badge="Recommendation">
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-success mb-3">
              <form onSubmit={submit}>
                <div className="card-header">
                  <span className="text-info display-4"> {t("Fertilizer Recommendation")} </span>
                </div>
                <div className="card-body text-dark">
                  <p className="mb-3">
                    Use the supported soil and crop values from the bundled fertilizer dataset. Example: Nitrogen 90, Phosphorous 42, Potassium 43, Temperature 20.8, Humidity 82, Soil Moisture 25, Soil Type Sandy, Crop Type Maize.
                  </p>
                  <div className="row">
                    <div className="col-md-3 mb-3">
                      <label className="mb-1">{t("Nitrogen")}</label>
                      <input className="form-control" placeholder="Ex: 90" value={form.n} onChange={(e) => setForm({ ...form, n: e.target.value })} required />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="mb-1">{t("Phosphorous")}</label>
                      <input className="form-control" placeholder="Ex: 42" value={form.p} onChange={(e) => setForm({ ...form, p: e.target.value })} required />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="mb-1">{t("Potassium")}</label>
                      <input className="form-control" placeholder="Ex: 43" value={form.k} onChange={(e) => setForm({ ...form, k: e.target.value })} required />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="mb-1">{t("Temperature")}</label>
                      <input className="form-control" placeholder="Ex: 20.8" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} required />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="mb-1">{t("Humidity")}</label>
                      <input className="form-control" placeholder="Ex: 82" value={form.humidity} onChange={(e) => setForm({ ...form, humidity: e.target.value })} required />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="mb-1">{t("Soil moisture")}</label>
                      <input className="form-control" placeholder="Ex: 25" value={form.soilMoisture} onChange={(e) => setForm({ ...form, soilMoisture: e.target.value })} required />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="mb-1">{t("Soil type")}</label>
                      <select className="form-control" value={form.soilType} onChange={(e) => setForm({ ...form, soilType: e.target.value })} required>
                        <option value="">{t("Select Soil Type")}</option>
                        {soilTypes.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="mb-1">{t("Crop type")}</label>
                      <select className="form-control" value={form.cropType} onChange={(e) => setForm({ ...form, cropType: e.target.value })} required>
                        <option value="">{t("Select Crop")}</option>
                        {cropTypes.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {feedback ? <div className="alert alert-danger">{feedback}</div> : null}
                  <button type="submit" className="btn btn-success" disabled={submitting}>
                    {submitting ? t("Recommending...") : t("Recommend")}
                  </button>
                </div>
              </form>
            </div>
            <div className="card text-white bg-gradient-success mb-3">
              <div className="card-header">
                <span className="text-success display-4"> {t("Result")} </span>
              </div>
              <h4 className="p-4 text-dark">{result || "Submit the values to see the recommended fertilizer."}</h4>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
