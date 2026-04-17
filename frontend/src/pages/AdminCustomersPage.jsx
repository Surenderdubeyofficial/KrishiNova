import { useEffect, useState } from "react";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function AdminCustomersPage() {
  const { t } = useUi();
  const [rows, setRows] = useState([]);
  const [feedback, setFeedback] = useState("");

  async function load() {
    const data = await api("/admin/customers");
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function removeCustomer(id) {
    if (!window.confirm(t("Delete this customer from the SQL database?"))) {
      return;
    }

    try {
      const result = await api(`/admin/customers/${id}`, { method: "DELETE" });
      setFeedback(result.message);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  return (
    <ProtectedRoute role="admin">
      <LegacySection badge="CUSTOMER" containerClass="container-fluid">
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-secondary mb-3">
              <div className="card-header">
              <span className="text-default display-4"> {t("Customers List")} </span>
              </div>
              <div className="card-body text-dark">
                {feedback ? <div className="alert alert-info">{feedback}</div> : null}
                <table className="table table-striped table-hover table-bordered bg-gradient-white text-center display">
                  <thead>
                    <tr className="font-weight-bold text-default">
                      <th><center>ID</center></th>
                      <th><center>{t("Customer Name")}</center></th>
                      <th><center>{t("Email Id")}</center></th>
                      <th><center>{t("Mobile No")}</center></th>
                      <th><center>{t("State")}</center></th>
                      <th><center>{t("City")}</center></th>
                      <th><center>{t("Address")}</center></th>
                      <th><center>{t("Pincode")}</center></th>
                      <th><center>{t("Delete")}</center></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr className="text-center" key={row.cust_id}>
                        <td data-label="ID">{row.cust_id}</td>
                        <td data-label={t("Customer Name")}>{row.cust_name}</td>
                        <td data-label={t("Email Id")}>{row.email}</td>
                        <td data-label={t("Mobile No")}>{row.phone_no}</td>
                        <td data-label={t("State")}>{row.state}</td>
                        <td data-label={t("City")}>{row.city}</td>
                        <td data-label={t("Address")}>{row.address}</td>
                        <td data-label={t("Pincode")}>{row.pincode}</td>
                        <td data-label={t("Delete")}>
                          <button className="btn btn-sm btn-danger" type="button" onClick={() => removeCustomer(row.cust_id)}>
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
