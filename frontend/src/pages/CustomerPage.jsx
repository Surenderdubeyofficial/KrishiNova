import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function CustomerPage() {
  const { t } = useUi();
  const [dashboard, setDashboard] = useState(null);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState({ crop: "", quantity: 1 });
  const [feedback, setFeedback] = useState("");
  const [pageError, setPageError] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("stock");
  const [searchParams] = useSearchParams();

  async function load() {
    try {
      setPageError("");
      const [dashboardData, cropData] = await Promise.all([api("/dashboard/customer"), api("/market/crops")]);
      setDashboard(dashboardData);
      setCrops(cropData);
      if (!purchase.crop && cropData.length) {
        setPurchase((current) => ({ ...current, crop: cropData[0].crop }));
      }
    } catch (error) {
      console.error(error);
      setPageError(error.message || t("Unable to load customer dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const crop = searchParams.get("crop");
    const quantity = searchParams.get("quantity");

    if (payment !== "success" || !crop || !quantity) {
      return;
    }

    api("/market/purchase", {
      method: "POST",
      body: JSON.stringify({ crop, quantity: Number(quantity) }),
    })
      .then((result) => {
        setFeedback(result.message);
        window.history.replaceState({}, "", "/customer");
        load().catch(console.error);
      })
      .catch((error) => {
        setFeedback(error.message);
        window.history.replaceState({}, "", "/customer");
      });
  }, [searchParams]);

  async function buy(event) {
    event.preventDefault();
    try {
      const result = await api("/market/purchase", { method: "POST", body: JSON.stringify(purchase) });
      setFeedback(result.message);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function payWithStripe() {
    try {
      const selectedCrop = crops.find((item) => item.crop === purchase.crop);
      const result = await api("/integrations/checkout-session", {
        method: "POST",
        body: JSON.stringify({
          crop: purchase.crop,
          quantity: purchase.quantity,
          unitAmount: selectedCrop?.msp || selectedCrop?.marketPrice || 0,
        }),
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        setFeedback(result.message || "Stripe is not configured");
      }
    } catch (error) {
      setFeedback(error.message);
    }
  }

  const selectedPrice = useMemo(() => {
    const selectedCrop = crops.find((item) => item.crop === purchase.crop);
    return selectedCrop?.msp || selectedCrop?.marketPrice || 0;
  }, [crops, purchase.crop]);

  const visibleCrops = useMemo(() => {
    const next = crops
      .filter((item) => item.crop.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "price") {
          return (a.msp || a.marketPrice || 0) - (b.msp || b.marketPrice || 0);
        }
        if (sortBy === "name") {
          return a.crop.localeCompare(b.crop);
        }
        return Number(b.quantity) - Number(a.quantity);
      });

    return next;
  }, [crops, query, sortBy]);

  const estimatedTotal = useMemo(() => Number(selectedPrice) * Number(purchase.quantity || 0), [selectedPrice, purchase.quantity]);

  return (
    <ProtectedRoute role="customer">
      <LegacySection badge="Shopping">
        {loading ? <div className="alert alert-info">{t("Loading customer dashboard...")}</div> : null}
        {pageError ? <div className="alert alert-danger">{pageError}</div> : null}
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-warning mb-3">
              <div className="card-header">
                <span className="text-warning display-4"> {t("Customer Dashboard")} </span>
              </div>
              <div className="card-body text-dark">
                <div className="row text-center">
                  <div className="col-md-4 mb-3"><div className="card"><div className="card-body"><h6>{t("Active listings")}</h6><h3>{dashboard?.marketSummary?.activeListings || 0}</h3></div></div></div>
                  <div className="col-md-4 mb-3"><div className="card"><div className="card-body"><h6>{t("Total stock")}</h6><h3>{dashboard?.marketSummary?.totalStock || 0} kg</h3></div></div></div>
                  <div className="col-md-4 mb-3"><div className="card"><div className="card-body"><h6>{t("Featured deals")}</h6><h3>{dashboard?.featuredDeals?.length || 0}</h3></div></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-danger mb-3">
              <div className="card-header">
                <span className="text-danger display-4"> {t("Buy Crops")} </span>
              </div>
              <div className="card-body">
                <div className="toolbar mb-3">
                  <input className="form-control text-dark" placeholder={t("Search crop")} value={query} onChange={(e) => setQuery(e.target.value)} />
                  <select className="form-control text-dark" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="stock">{t("Sort by stock")}</option>
                    <option value="price">{t("Sort by price")}</option>
                    <option value="name">{t("Sort by name")}</option>
                  </select>
                </div>

                <form onSubmit={buy}>
                  <table className="table table-striped table-bordered table-responsive-md btn-table">
                    <thead className="text-white text-center">
                      <tr>
                        <th>{t("Crop Name")}</th>
                        <th>{t("Quantity (in KG)")}</th>
                        <th>{t("Price (in Rs)")}</th>
                        <th>{t("Add Item")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <select className="form-control text-dark" value={purchase.crop} onChange={(e) => setPurchase({ ...purchase, crop: e.target.value })}>
                            {visibleCrops.map((crop) => <option key={crop.crop} value={crop.crop}>{crop.crop}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="form-control text-dark" type="number" min="1" value={purchase.quantity} onChange={(e) => setPurchase({ ...purchase, quantity: Number(e.target.value) })} />
                        </td>
                        <td>
                          <input className="form-control text-dark" type="text" readOnly value={selectedPrice} />
                        </td>
                        <td>
                          <button className="btn btn-success form-control" type="submit">{t("Add To Cart")} / {t("Buy")}</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </form>

                <h3 className="text-white">{t("Order Details")}</h3>
                <div className="table-responsive">
                  <table className="table table-striped table-bordered table-responsive-md btn-table display">
                    <thead>
                      <tr>
                        <th width="40%">{t("Item Name")}</th>
                        <th width="10%">{t("Quantity (in KG)")}</th>
                        <th width="20%">{t("Price (in Rs.)")}</th>
                        <th width="5%">{t("Action")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white text-dark">
                        <td>{purchase.crop || "-"}</td>
                        <td>{purchase.quantity}</td>
                        <td>Rs. {estimatedTotal.toFixed(2)}</td>
                        <td>
                          <button className="btn btn-info form-control" type="button" onClick={payWithStripe}>Pay</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {feedback ? <p className="feedback mt-3">{feedback}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
