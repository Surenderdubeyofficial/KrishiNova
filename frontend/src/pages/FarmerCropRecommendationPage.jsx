import { useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function FarmerCropRecommendationPage() {
  const { t } = useUi();
  const [form, setForm] = useState({ n: "", p: "", k: "", temperature: "", humidity: "", ph: "", rainfall: "" });
  const [result, setResult] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    setResult("");
    try {
      const response = await api("/predictions/crop-recommendation", { method: "POST", body: JSON.stringify(form) });
      setResult(`Recommended Crop is : ${response.result}`);
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
                <div className="card-header d-flex justify-content-between align-items-center flex-wrap" style={{ gap: "0.75rem" }}>
                  <span className="text-info display-4"> {t("Crop Recommendation")} </span>
                  <button type="submit" className="btn btn-warning btn-submit" disabled={submitting}>
                    {submitting ? t("Submitting...").toUpperCase() : t("Submit").toUpperCase()}
                  </button>
                </div>
                <div className="card-body text-dark">
                  <p className="mb-3">Example values: 90, 42, 43, 20.8, 82, 6.5, 202.9</p>
                  <table className="table table-striped table-hover table-bordered bg-gradient-white text-center display">
                    <thead>
                      <tr className="font-weight-bold text-default">
                        <th>{t("Nitrogen")}</th>
                        <th>{t("Phosphorous")}</th>
                        <th>{t("Potassium")}</th>
                        <th>{t("Temperature")}</th>
                        <th>{t("Humidity")}</th>
                        <th>{t("pH")}</th>
                        <th>{t("Rainfall")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-center">
                        {[
                          ["n", "Ex: 90", t("Nitrogen")],
                          ["p", "Ex: 42", t("Phosphorous")],
                          ["k", "Ex: 43", t("Potassium")],
                          ["temperature", "Ex: 20.8", t("Temperature")],
                          ["humidity", "Ex: 82", t("Humidity")],
                          ["ph", "Ex: 6.5", t("pH")],
                          ["rainfall", "Ex: 202.9", t("Rainfall")],
                        ].map(([field, placeholder, label]) => (
                          <td key={field} data-label={label}>
                            <input
                              className="form-control"
                              type="number"
                              step="0.01"
                              placeholder={placeholder}
                              value={form[field]}
                              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                              required
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                  {feedback ? <div className="alert alert-danger mt-3 mb-0">{feedback}</div> : null}
                </div>
              </form>
            </div>
            <div className="card text-white bg-gradient-success mb-3">
              <div className="card-header">
                <span className="text-success display-4"> {t("Result")} </span>
              </div>
              <h4 className="p-4 text-dark" style={{ overflowWrap: "anywhere" }}>
                {result || "Submit the values to see the recommended crop."}
              </h4>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
