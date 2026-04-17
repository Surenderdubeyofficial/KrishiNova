import { useEffect, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

const seasons = ["Kharif", "Whole Year", "Autumn", "Rabi", "Summer", "Winter"];

export default function FarmerCropPredictionPage() {
  const { t } = useUi();
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [form, setForm] = useState({ stateCode: "", district: "", season: "" });
  const [result, setResult] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api("/public/states").then(setStates).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.stateCode) return;
    api(`/public/districts/${form.stateCode}`).then(setDistricts).catch(console.error);
  }, [form.stateCode]);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    setResult("");
    try {
      const selectedState = states.find((item) => String(item.StCode) === String(form.stateCode))?.StateName || "";
      const response = await api("/predictions/crop-prediction", {
        method: "POST",
        body: JSON.stringify({ state: selectedState, district: form.district, season: form.season }),
      });
      setResult(`Crops grown in ${form.district} during the ${form.season} season are :- ${response.result}`);
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
              <div className="card-header">
                <span className="text-success display-4"> {t("Crop Prediction")} </span>
              </div>
              <div className="card-body text-dark">
                <p className="mb-3">Example: State `Karnataka`, District `Mysore`, Season `Kharif`.</p>
                <form onSubmit={submit}>
                  <table className="table table-striped table-hover table-bordered bg-gradient-white text-center display">
                    <thead>
                      <tr className="font-weight-bold text-default">
                        <th><center>{t("State")}</center></th>
                        <th><center>{t("District")}</center></th>
                        <th><center>{t("Season")}</center></th>
                        <th><center>{t("Prediction")}</center></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-center">
                        <td>
                          <select className="form-control" required value={form.stateCode} onChange={(e) => setForm({ ...form, stateCode: e.target.value, district: "" })}>
                            <option value="">{t("Select state")}</option>
                            {states.map((state) => <option key={state.StCode} value={state.StCode}>{state.StateName}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-control" required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                            <option value="">{t("Select district")}</option>
                            {districts.map((district) => <option key={district.DistCode} value={district.DistrictName}>{district.DistrictName}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-control" required value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })}>
                            <option value="">{t("Select Season ...")}</option>
                            {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
                          </select>
                        </td>
                        <td>
                          <button type="submit" className="btn btn-success btn-submit" disabled={submitting}>{submitting ? t("Predicting...") : t("Predict")}</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </form>
                {feedback ? <div className="alert alert-danger">{feedback}</div> : null}
              </div>
            </div>
            <div className="card text-white bg-gradient-success mb-3">
              <div className="card-header">
                <span className="text-success display-4"> {t("Result")} </span>
              </div>
              <h4 className="p-4 text-dark">{result}</h4>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
