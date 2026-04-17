import { useEffect, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function AdminMessagesPage() {
  const { t } = useUi();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function load() {
    setLoading(true);
    setPageError("");

    api("/admin/messages")
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error(error);
        setPageError(error.message || t("Unable to load contact queries"));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function removeMessage(id) {
    if (!window.confirm(t("Delete this contact query?"))) {
      return;
    }

    try {
      const result = await api(`/admin/messages/${id}`, { method: "DELETE" });
      setFeedback(result.message);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  return (
    <ProtectedRoute role="admin">
      <LegacySection badge="Contact">
        {loading ? <div className="alert alert-info">{t("Loading contact queries...")}</div> : null}
        {pageError ? <div className="alert alert-danger">{pageError}</div> : null}
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-info mb-3">
              <div className="card-header">
                <span className="text-primary display-4"> {t("Contact Queries")} </span>
              </div>
              <div className="card-body text-white">
                {feedback ? <div className="alert alert-info">{feedback}</div> : null}
                <table className="table table-striped table-hover table-bordered bg-gradient-white text-center display">
                  <thead>
                    <tr className="font-weight-bold text-default text-center">
                      <th className="text-center">ID</th>
                      <th className="text-center">{t("Name")}</th>
                      <th className="text-center">{t("Mobile No")}</th>
                      <th className="text-center">{t("Email")}</th>
                      <th className="text-center">{t("Address")}</th>
                      <th className="text-center">{t("Message")}</th>
                      <th className="text-center">{t("Delete")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      rows.map((row) => (
                        <tr className="text-center" key={row.c_id}>
                          <td>{row.c_id}</td>
                          <td>{row.c_name}</td>
                          <td>{row.c_mobile}</td>
                          <td>{row.c_email}</td>
                          <td>{row.c_address}</td>
                          <td>{row.c_message}</td>
                          <td>
                            <button className="btn btn-sm btn-danger" type="button" onClick={() => removeMessage(row.c_id)}>
                              {t("Delete")}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-dark bg-white">{t("No contact queries found.")}</td>
                      </tr>
                    )}
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
