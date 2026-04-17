import { useEffect, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function FarmerSellingHistoryPage() {
  const { t } = useUi();
  const [data, setData] = useState(null);
  useEffect(() => { api("/dashboard/farmer").then(setData).catch(console.error); }, []);
  return (
    <ProtectedRoute role="farmer">
      <LegacySection badge="Trade">
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-warning mb-3">
              <div className="card-header">
                <span className="text-warning display-4"> {t("Selling History")} </span>
              </div>
              <div className="card-body text-dark">
                <table className="table table-striped table-hover table-bordered bg-gradient-white text-center display">
                  <thead>
                    <tr className="font-weight-bold text-default">
                      <th><center>{t("Crop")}</center></th>
                      <th><center>{t("Quantity (in KG)")}</center></th>
                      <th><center>{t("Total Amount received (in Rs)")}</center></th>
                      <th><center>{t("Date of Transaction")}</center></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.historyRows?.map((row) => (
                      <tr key={row.History_id}>
                        <td data-label={t("Crop")}><center>{row.farmer_crop}</center></td>
                        <td data-label={t("Quantity (in KG)")}><center>{row.farmer_quantity}</center></td>
                        <td data-label={t("Total Amount received (in Rs)")}><center>{row.farmer_price}</center></td>
                        <td data-label={t("Date of Transaction")}><center>{row.date}</center></td>
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
