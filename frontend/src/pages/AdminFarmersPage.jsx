import { useEffect, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function AdminFarmersPage() {
  const { t } = useUi();
  const [rows, setRows] = useState([]);
  const [feedback, setFeedback] = useState("");

  async function load() {
    const data = await api("/admin/farmers");
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function removeFarmer(id) {
    if (!window.confirm(t("Delete this farmer from the SQL database?"))) {
      return;
    }

    try {
      const result = await api(`/admin/farmers/${id}`, { method: "DELETE" });
      setFeedback(result.message);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  return (
    <ProtectedRoute role="admin">
      <LegacySection badge="Famers" containerClass="container-fluid">
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-success mb-3">
              <div className="card-header">
              <span className="text-success display-4"> {t("Farmers List")} </span>
              </div>
              <div className="card-body text-dark">
                {feedback ? <div className="alert alert-info">{feedback}</div> : null}
                <table className="table table-striped table-hover table-bordered bg-gradient-white text-center display">
                  <thead>
                    <tr className="font-weight-bold text-default">
                      <th><center>ID</center></th>
                      <th><center>{t("Farmer Name")}</center></th>
                      <th><center>{t("Gender")}</center></th>
                      <th><center>{t("Email Id")}</center></th>
                      <th><center>{t("Mobile No")}</center></th>
                      <th><center>{t("Date of Birth")}</center></th>
                      <th><center>{t("State")}</center></th>
                      <th><center>{t("District")}</center></th>
                      <th><center>{t("City")}</center></th>
                      <th><center>{t("Delete")}</center></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr className="text-center" key={row.farmer_id}>
                        <td>{row.farmer_id}</td>
                        <td>{row.farmer_name}</td>
                        <td>{row.F_gender}</td>
                        <td>{row.email}</td>
                        <td>{row.phone_no}</td>
                        <td>{row.F_birthday}</td>
                        <td>{row.F_State}</td>
                        <td>{row.F_District}</td>
                        <td>{row.F_Location}</td>
                        <td>
                          <button className="btn btn-sm btn-danger" type="button" onClick={() => removeFarmer(row.farmer_id)}>
                            {t("Delete")}
                          </button>
                        </td>
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
