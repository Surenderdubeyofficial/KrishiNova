import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function CustomerInvoicePage() {
  const { t } = useUi();
  const { invoiceId } = useParams();
  const [data, setData] = useState(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    api(`/market/invoices/${invoiceId}`)
      .then(setData)
      .catch((error) => setFeedback(error.message));
  }, [invoiceId]);

  const invoice = data?.invoice;
  const items = data?.items || [];

  return (
    <ProtectedRoute role="customer">
      <LegacySection badge="Invoice">
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-success mb-3">
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap" style={{ gap: "0.75rem" }}>
                <span className="text-white display-4"> {t("Invoice Details")} </span>
                <div className="d-flex" style={{ gap: "0.75rem" }}>
                  <button className="btn btn-warning" type="button" onClick={() => window.print()}>
                    {t("Download / Print")}
                  </button>
                  <Link className="btn btn-info" to="/customer/cinvoices">
                    {t("Back to Invoices")}
                  </Link>
                </div>
              </div>
              <div className="card-body bg-white text-dark">
                {feedback ? <div className="alert alert-info">{feedback}</div> : null}
                {invoice ? (
                  <>
                    <div className="row mb-4">
                      <div className="col-md-6">
                        <h5>{invoice.invoice_number}</h5>
                        <p className="mb-1">{t("Date")}: {new Date(invoice.purchased_at).toLocaleString()}</p>
                        <p className="mb-1">{t("Payment")}: {invoice.payment_method}</p>
                        <p className="mb-0">{t("Reference")}: {invoice.payment_reference || "N/A"}</p>
                      </div>
                      <div className="col-md-6">
                        <h5>{t("Billing Details")}</h5>
                        <p className="mb-1">{invoice.customer_name}</p>
                        <p className="mb-1">{invoice.customer_email}</p>
                        <p className="mb-1">{invoice.customer_phone}</p>
                        <p className="mb-0">
                          {invoice.customer_address}, {invoice.customer_city}, {invoice.customer_state} - {invoice.customer_pincode}
                        </p>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-striped table-bordered">
                        <thead>
                          <tr>
                            <th>{t("Crop")}</th>
                            <th>{t("Quantity (KG)")}</th>
                            <th>{t("Rate (Rs.)")}</th>
                            <th>{t("Total (Rs.)")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.item_id}>
                              <td>{item.crop_name}</td>
                              <td>{item.quantity}</td>
                              <td>{Number(item.unit_price).toFixed(2)}</td>
                              <td>{Number(item.line_total).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="d-flex justify-content-end mt-3">
                      <div className="text-right">
                        <p className="mb-1">{t("Subtotal")}: Rs. {Number(invoice.subtotal).toFixed(2)}</p>
                        <h4>{t("Total")}: Rs. {Number(invoice.total).toFixed(2)}</h4>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
