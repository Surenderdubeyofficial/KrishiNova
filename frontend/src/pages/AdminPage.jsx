import { useEffect, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

function formatTotalLabel(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export default function AdminPage() {
  const { t } = useUi();
  const [data, setData] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });

  async function loadDashboard() {
    setPageError("");
    const [dashboardData, adminList] = await Promise.all([
      api("/dashboard/admin"),
      api("/admin/admins"),
    ]);
    setData(dashboardData);
    setAdmins(adminList);
  }

  useEffect(() => {
    loadDashboard()
      .catch((error) => {
        console.error(error);
        setPageError(error.message || t("Unable to load admin dashboard"));
      })
      .finally(() => setLoading(false));
  }, []);

  async function createAdmin(event) {
    event.preventDefault();
    setFeedback("");
    setCreating(true);

    try {
      const response = await api("/admin/admins", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setFeedback(response.message || "Admin added successfully");
      setForm({ username: "", password: "" });
      await loadDashboard();
    } catch (error) {
      setFeedback(error.message || "Unable to add admin");
    } finally {
      setCreating(false);
    }
  }

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
                          <div className="card h-100">
                            <div className="card-body">
                              <h6>{formatTotalLabel(key)}</h6>
                              <h3>{value}</h3>
                            </div>
                          </div>
                        </div>
                      ))
                    : null}
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-body bg-gradient-white">
                <h4 className="mb-3">Add Admin</h4>
                <form onSubmit={createAdmin}>
                  <div className="form-group mb-3">
                    <label className="font-weight-bold mb-2">Admin Username</label>
                    <input
                      className="form-control"
                      value={form.username}
                      onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                      placeholder="Enter admin username"
                      required
                    />
                  </div>
                  <div className="form-group mb-3">
                    <label className="font-weight-bold mb-2">Admin Password</label>
                    <input
                      className="form-control"
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Enter admin password"
                      minLength={6}
                      required
                    />
                  </div>
                  <button className="btn btn-success" type="submit" disabled={creating}>
                    {creating ? "Adding Admin..." : "Add Admin"}
                  </button>
                </form>
                {feedback ? <div className="alert alert-info mt-3 mb-0">{feedback}</div> : null}
              </div>
            </div>
          </div>

          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-body bg-gradient-white">
                <h4 className="mb-3">Admin Accounts</h4>
                {admins.length ? (
                  <div className="table-responsive">
                    <table className="table table-striped table-bordered mb-0">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Username</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admins.map((admin) => (
                          <tr key={admin.admin_id}>
                            <td>{admin.admin_id}</td>
                            <td>{admin.admin_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mb-0">No admin accounts found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
