import { useEffect, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function CustomerStockPage() {
  const { t } = useUi();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api("/market/crops").then(setRows).catch(console.error);
  }, []);

  return (
    <ProtectedRoute role="customer">
      <LegacySection badge="Crops">
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-warning mb-3">
              <div className="card-header">
                <span className="text-warning display-4"> {t("Crop Availability")} </span>
              </div>
              <div className="card-body text-white">
                <table className="table table-striped table-hover table-bordered bg-gradient-white text-center display">
                  <thead>
                    <tr className="font-weight-bold text-default">
                      <th><center>{t("Crop Name")}</center></th>
                      <th><center>{t("Quantity (in KG)")}</center></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr className="text-center" key={row.crop}>
                        <td>{row.crop}</td>
                        <td>{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
