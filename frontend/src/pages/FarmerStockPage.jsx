import { useEffect, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function FarmerStockPage() {
  const { t } = useUi();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    api("/market/crops")
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error(error);
        setPageError(error.message || t("Unable to load crop availability"));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute role="farmer">
      <LegacySection badge="Crops">
        {loading ? <div className="alert alert-info">{t("Loading crop availability...")}</div> : null}
        {pageError ? <div className="alert alert-danger">{pageError}</div> : null}
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-warning mb-3">
              <div className="card-header">
                <span className="text-warning display-4"> {t("Crop Availability")} </span>
              </div>
              <div className="card-body text-white">
                <div className="desktopTableWrap">
                  <table className="table table-striped table-hover table-bordered bg-gradient-white text-center display">
                    <thead>
                      <tr className="font-weight-bold text-default">
                        <th><center>{t("Crop Name")}</center></th>
                        <th><center>{t("Quantity (in KG)")}</center></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length ? (
                        rows.map((row) => (
                          <tr className="text-center" key={row.crop}>
                            <td data-label={t("Crop Name")}>{row.crop}</td>
                            <td data-label={t("Quantity (in KG)")}>{row.quantity}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="2" className="text-dark bg-white">{t("No crops currently available.")}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mobileStackList">
                  {rows.length ? (
                    rows.map((row) => (
                      <div className="mobileStackCard" key={row.crop}>
                        <div className="mobileStackRow">
                          <span className="mobileStackLabel">{t("Crop Name")}</span>
                          <strong>{row.crop}</strong>
                        </div>
                        <div className="mobileStackRow">
                          <span className="mobileStackLabel">{t("Quantity (in KG)")}</span>
                          <strong>{row.quantity}</strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="mobileStackCard text-dark">{t("No crops currently available.")}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
