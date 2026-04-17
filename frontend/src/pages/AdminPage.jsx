import { useEffect, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function AdminPage() {
  const { t } = useUi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    api("/dashboard/admin")
      .then(setData)
      .catch((error) => {
        console.error(error);
        setPageError(error.message || t("Unable to load admin dashboard"));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute role="admin">
      <LegacySection badge="Admin">
        {loading ? <div className="alert alert-info">{t("Loading admin dashboard...")}</div> : null}
        {pageError ? <div className="alert alert-danger">{pageError}</div> : null}
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-success mb-3">
              <div className="card-header">
                <span className="text-success display-4"> {t("Admin Dashboard")} </span>
              </div>
              <div className="card-body text-dark">
                <div className="row text-center">
                  {data?.totals
                    ? Object.entries(data.totals).map(([key, value]) => (
                        <div className="col-md-3 mb-3" key={key}>
                          <div className="card"><div className="card-body"><h6>{key}</h6><h3>{value}</h3></div></div>
                        </div>
                      ))
                    : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
