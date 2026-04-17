import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function CustomerInvoicesPage() {
  const { t } = useUi();
  const [invoices, setInvoices] = useState([]);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    api("/market/invoices")
      .then(setInvoices)
      .catch((error) => setFeedback(error.message));
  }, []);

  return (
    <ProtectedRoute role="customer">
      <LegacySection badge="Invoices">
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-warning mb-3">
              <div className="card-header">
                <span className="text-warning display-4"> {t("Invoice History")} </span>
              </div>
              <div className="card-body text-dark">
                {feedback ? <div className="alert alert-info">{feedback}</div> : null}
                <div className="table-responsive">
                  <table className="table table-striped table-bordered bg-white">
                    <thead>
                      <tr>
                        <th>{t("Invoice No.")}</th>
                        <th>{t("Date")}</th>
                        <th>{t("Payment Method")}</th>
                        <th>{t("Total")}</th>
                        <th>{t("Action")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length ? (
                        invoices.map((invoice) => (
                          <tr key={invoice.invoice_id}>
                            <td>{invoice.invoice_number}</td>
                            <td>{new Date(invoice.purchased_at).toLocaleString()}</td>
                            <td>{invoice.payment_method}</td>
                            <td>Rs. {Number(invoice.total).toFixed(2)}</td>
                            <td>
                              <Link className="btn btn-info btn-sm" to={`/customer/cinvoices/${invoice.invoice_id}`}>
                                {t("View Invoice")}
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center">{t("No invoices yet")}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
