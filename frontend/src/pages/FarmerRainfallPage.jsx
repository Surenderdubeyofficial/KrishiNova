import { useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const subdivisions = [
  "ANDAMAN & NICOBAR ISLANDS",
  "ARUNACHAL PRADESH",
  "ASSAM & MEGHALAYA",
  "BIHAR",
  "CHHATTISGARH",
  "COASTAL ANDHRA PRADESH",
  "COASTAL KARNATAKA",
  "EAST MADHYA PRADESH",
  "EAST RAJASTHAN",
  "EAST UTTAR PRADESH",
  "GANGETIC WEST BENGAL",
  "GUJARAT REGION",
  "HARYANA DELHI & CHANDIGARH",
  "HIMACHAL PRADESH",
  "JAMMU & KASHMIR",
  "JHARKHAND",
  "KERALA",
  "KONKAN & GOA",
  "LAKSHADWEEP",
  "MADHYA MAHARASHTRA",
  "MATATHWADA",
  "NAGA MANI MIZO TRIPURA",
  "NORTH INTERIOR KARNATAKA",
  "ORISSA",
  "PUNJAB",
  "RAYALSEEMA",
  "SAURASHTRA & KUTCH",
  "SHWBsTELANGANA",
  "SOUTH INTERIOR KARNATAKA",
  "SUB HIMALAYAN WEST BENGAL & SIKKIM",
  "TAMIL NADU",
  "UTTARAKHAND",
  "VIDARBHA",
  "WEST MADHYA PRADESH",
  "WEST RAJASTHAN",
  "WEST UTTAR PRADESH",
];

export default function FarmerRainfallPage() {
  const { t } = useUi();
  const [form, setForm] = useState({ subdivision: "", month: "" });
  const [result, setResult] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    setResult("");

    try {
      const response = await api("/predictions/rainfall", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setResult(`Predicted Rainfall is : ${response.result}`);
    } catch (error) {
      setFeedback(error.message || t("Prediction failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedRoute role="farmer">
      <LegacySection badge="Prediction">
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-success mb-3">
              <form onSubmit={submit}>
                <div className="card-header">
                  <span className="text-info display-4"> {t("Rainfall Prediction")} </span>
                </div>
                <div className="card-body text-dark">
                  <p className="mb-3">
                    The rainfall model supports all available subdivisions from the bundled dataset. Select a region and month instead of typing them manually.
                  </p>
                  <div className="row">
                    <div className="col-md-5">
                      <select
                        className="form-control"
                        value={form.subdivision}
                        onChange={(e) => setForm({ ...form, subdivision: e.target.value })}
                        required
                      >
                        <option value="">{t("Select Region")}</option>
                        {subdivisions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <select
                        className="form-control"
                        value={form.month}
                        onChange={(e) => setForm({ ...form, month: e.target.value })}
                        required
                      >
                        <option value="">{t("Select Month")}</option>
                        {months.map((month) => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <button type="submit" className="btn btn-success btn-block" disabled={submitting}>
                        {submitting ? t("Predicting...") : t("Predict")}
                      </button>
                    </div>
                  </div>
                  {feedback ? <div className="alert alert-danger mt-3 mb-0">{feedback}</div> : null}
                </div>
              </form>
            </div>
            <div className="card text-white bg-gradient-success mb-3">
              <div className="card-header">
                <span className="text-success display-4"> {t("Result")} </span>
              </div>
              <h4 className="p-4 text-dark">{result || "Submit the values to see the rainfall prediction."}</h4>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
