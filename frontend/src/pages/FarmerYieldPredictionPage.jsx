import { useMemo, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

const states = ["Karnataka"];
const districts = [
  "BAGALKOT",
  "BANGALORE_RURAL",
  "BELGAUM",
  "BELLARY",
  "BENGALURU_URBAN",
  "BIDAR",
  "BIJAPUR",
  "CHAMARAJANAGAR",
  "CHIKBALLAPUR",
  "CHIKMAGALUR",
  "CHITRADURGA",
  "DAKSHIN_KANNAD",
  "DAVANGERE",
  "DHARWAD",
  "GADAG",
  "GULBARGA",
  "HASSAN",
  "HAVERI",
  "KODAGU",
  "KOLAR",
  "KOPPAL",
  "MANDYA",
  "MYSORE",
  "RAICHUR",
  "RAMANAGARA",
  "SHIMOGA",
  "TUMKUR",
  "UDUPI",
  "UTTAR_KANNAD",
  "YADGIR",
];
const seasons = ["Kharif", "Rabi", "Summer", "WholeYear"];
const crops = [
  "Arcanut (Processed)",
  "Arecanut",
  "Arhar/Tur",
  "Atcanut (Raw)",
  "Bajra",
  "Banana",
  "Beans & Mutter(Vegetable)",
  "Black pepper",
  "Brinjal",
  "Cardamom",
  "Cashewnut",
  "Cashewnut Processed",
  "Cashewnut Raw",
  "Castor seed",
  "Citrus Fruit",
  "Coconut ",
  "Coriander",
  "Cotton(lint)",
  "Cowpea(Lobia)",
  "Dry chillies",
  "Dry ginger",
  "Garlic",
  "Gram",
  "Grapes",
  "Groundnut",
  "Horse-gram",
  "Jowar",
  "Linseed",
  "Maize",
  "Mango",
  "Mesta",
  "Moong(Green Gram)",
  "Niger seed",
  "Onion",
  "Other  Rabi pulses",
  "Other Fresh Fruits",
  "Other Kharif pulses",
  "Paddy",
  "Papaya",
  "Peas & beans (Pulses)",
  "Pome Fruit",
  "Potato",
  "Ragi",
  "Rapeseed &Mustard",
  "Rice",
  "Safflower",
  "Sannhamp",
  "Sesamum",
  "Small millets",
  "Soyabean",
  "Sunflower",
  "Sweet potato",
  "Tapioca",
  "Tobacco",
  "Turmeric",
  "Wheat",
  "other fibres",
  "other misc. pulses",
  "other oilseeds",
];

export default function FarmerYieldPredictionPage() {
  const { t } = useUi();
  const [form, setForm] = useState({
    state: "Karnataka",
    district: "",
    season: "",
    crop: "",
    area: "",
  });
  const [result, setResult] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sortedCrops = useMemo(() => [...crops].sort((a, b) => a.localeCompare(b)), []);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    setResult("");

    try {
      const response = await api("/predictions/yield", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setResult(`Predicted crop yield (in Quintal) is: ${response.result}`);
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
                  <span className="text-info display-4"> {t("Yield Prediction")} </span>
                </div>
                <div className="card-body text-dark">
                  <p className="mb-3">
                    This bundled yield model is trained on the Karnataka dataset included with the project, so the supported state list is currently limited to Karnataka while all available districts, seasons, and crops are shown below.
                  </p>
                  <table className="table table-striped table-hover table-bordered bg-gradient-white text-center display">
                    <thead>
                      <tr className="font-weight-bold text-default">
                        <th><center>{t("State")}</center></th>
                        <th><center>{t("District")}</center></th>
                        <th><center>{t("Season")}</center></th>
                        <th><center>{t("Crop")}</center></th>
                        <th><center>{t("Area")}</center></th>
                        <th><center>{t("Prediction")}</center></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-center">
                        <td>
                          <select className="form-control" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                            {states.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-control"
                            required
                            value={form.district}
                            onChange={(e) => setForm({ ...form, district: e.target.value })}
                          >
                            <option value="">{t("Select a district")}</option>
                            {districts.map((item) => (
                              <option key={item} value={item}>
                                {item.replaceAll("_", " ")}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-control"
                            required
                            value={form.season}
                            onChange={(e) => setForm({ ...form, season: e.target.value })}
                          >
                            <option value="">{t("Select season")}</option>
                            {seasons.map((item) => (
                              <option key={item} value={item}>
                                {item === "WholeYear" ? "Whole Year" : item}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-control"
                            required
                            value={form.crop}
                            onChange={(e) => setForm({ ...form, crop: e.target.value })}
                          >
                            <option value="">{t("Select crop")}</option>
                            {sortedCrops.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="form-control"
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder={t("Area in Hectares")}
                            value={form.area}
                            onChange={(e) => setForm({ ...form, area: e.target.value })}
                          />
                        </td>
                        <td>
                          <button type="submit" className="btn btn-success btn-submit" disabled={submitting}>
                            {submitting ? t("Predicting...") : t("Predict")}
                          </button>
                        </td>
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
              <h4 className="p-4 text-dark">{result || "Submit the values to see the yield prediction."}</h4>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
