import { useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

const cropOptions = ["arhar", "bajra", "barley", "cotton", "gram", "jowar", "jute", "lentil", "maize", "moong", "ragi", "rice", "soyabean", "urad", "wheat"];

function formatCropName(crop) {
  if (!crop) return "";
  return crop.charAt(0).toUpperCase() + crop.slice(1);
}

export default function FarmerTradeCropsPage() {
  const { t } = useUi();
  const [form, setForm] = useState({ crop: "", quantity: "", costPerKg: "" });
  const [marketInfo, setMarketInfo] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onCropChange(crop) {
    setForm((current) => ({ ...current, crop }));
    setStatus("");

    if (!crop) {
      setMarketInfo("");
      return;
    }

    try {
      const response = await api(`/market/average-price/${crop}`);
      setMarketInfo(`${t("Current Market Avg Price for")} ${formatCropName(crop)} ${t("is")}: Rs. ${response.averagePrice}`);
    } catch (error) {
      setMarketInfo(error.message || t("Unable to load current market average price."));
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");

    try {
      const response = await api("/market/crops", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setStatus(
        `${t("Crop details added successfully. Current market average for")} ${formatCropName(response.crop)} ${t("is") || "is"} Rs. ${response.averagePrice} ${t("and MSP is Rs.")} ${response.msp}.`,
      );
      setForm((current) => ({ ...current, quantity: "", costPerKg: "" }));
      if (response.crop) {
        setMarketInfo(`${t("Current Market Avg Price for")} ${formatCropName(response.crop)} ${t("is")}: Rs. ${response.averagePrice}`);
      }
    } catch (error) {
      setStatus(error.message || t("Unable to add crop details."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedRoute role="farmer">
      <LegacySection badge="Trade">
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-success mb-3">
              <div className="card-header">
                <span className="text-success display-4"> {t("Update Crop Stock")} </span>
              </div>
              <div className="card-body text-dark">
                {marketInfo ? <div className="alert alert-info text-center">{marketInfo}</div> : null}
                {status ? <div className="alert alert-info text-center">{status}</div> : null}
                <form onSubmit={submit}>
                  <table className="table table-striped table-hover table-bordered bg-gradient-white text-center display">
                    <thead>
                      <tr className="font-weight-bold text-default">
                        <th><center>{t("Crop Name")}</center></th>
                        <th><center>{t("Quantity (in KG)")}</center></th>
                        <th><center>{t("Cost borne by farmer per KG (in Rs)")}</center></th>
                        <th><center>{t("Upload CROP Details")}</center></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-center">
                        <td>
                          <select className="form-control" value={form.crop} onChange={(e) => onCropChange(e.target.value)} required>
                            <option value="">{t("Select Crop")}</option>
                            {cropOptions.map((crop) => (
                              <option key={crop} value={crop}>
                                {formatCropName(crop)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="form-control"
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={form.quantity}
                            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="form-control"
                            type="number"
                            min="1"
                            step="0.01"
                            required
                            value={form.costPerKg}
                            onChange={(e) => setForm({ ...form, costPerKg: e.target.value })}
                          />
                        </td>
                        <td>
                          <button type="submit" className="btn btn-success" disabled={submitting}>
                            {submitting ? t("Submitting...") : t("Submit")}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </form>
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
