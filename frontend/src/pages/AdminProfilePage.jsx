import { useEffect, useState } from "react";
import { api } from "../api";
import { BRAND } from "../branding.js";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function AdminProfilePage() {
  const { t } = useUi();
  const [data, setData] = useState(null);
  useEffect(() => { api("/auth/me").then(setData).catch(console.error); }, []);
  return (
    <ProtectedRoute role="admin">
      <LegacySection badge="Profile">
        <div className="row row-content">
          <div className="col-md-4 mb-3">
            <div className="card">
              <div className="card-body bg-gradient-success">
                <div className="d-flex flex-column align-items-center text-center">
                  <img src="/img/admin.png" alt="admin" className="rounded-circle" width="158" />
                  <div className="mt-3">
                    <h4>{t("Welcome")} {data?.name}</h4>
                    <p className="text-white mb-1">{t("Admin")} ID: {data?.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-8">
            <div className="card mb-3">
              <div className="card-body bg-gradient-white">
                <ol className="text-justify list-group list-group-flush">
                  <li className="list-group-item">{t("Admin has access to all the data in")} {BRAND.name}.</li>
                  <li className="list-group-item">{t("Admin can modify and view all the customer details when necessary.")}</li>
                  <li className="list-group-item">{t("Admin can manage the farmer details who provide supplies to the store.")}</li>
                  <li className="list-group-item">{t("Admin also has access to the sales report and can sort them as required.")}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
