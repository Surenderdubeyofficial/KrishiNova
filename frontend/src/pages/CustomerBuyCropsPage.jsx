import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext.jsx";
import { BRAND } from "../branding.js";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";
import { useUi } from "../UiContext.jsx";

export default function CustomerBuyCropsPage() {
  const { user } = useAuth();
  const { t } = useUi();
  const navigate = useNavigate();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState({ crop: "", quantity: "" });
  const [cartItems, setCartItems] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [pageError, setPageError] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("stock");

  function normalizeQuantity(value, availableQuantity) {
    if (value === "") {
      return "";
    }

    const numericValue = Number(value);
    const stockLimit = Number(availableQuantity || 0);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return "";
    }

    if (numericValue === 0) {
      return "0";
    }

    if (!Number.isFinite(stockLimit) || stockLimit <= 0) {
      return "";
    }

    return String(Math.min(Math.floor(numericValue), stockLimit));
  }

  function buildInitialPurchase() {
    return {
      crop: "",
      quantity: "",
    };
  }

  async function load() {
    try {
      setPageError("");
      const cropData = await api("/market/buy-crops");
      setCrops(cropData);
      setPurchase((current) => {
        if (!current.crop) {
          return current;
        }

        if (current.crop) {
          const currentCrop = cropData.find((item) => item.crop === current.crop);
          if (currentCrop) {
            return {
              ...current,
              quantity: normalizeQuantity(current.quantity, currentCrop.quantity),
            };
          }
        }

        return buildInitialPurchase();
      });
      setCartItems((current) =>
        current
          .map((cartRow) => {
            const nextCrop = cropData.find((item) => item.crop === cartRow.crop);
            if (!nextCrop) {
              return null;
            }

            const nextQuantity = Math.min(Number(cartRow.quantity), Number(nextCrop.quantity));
            if (nextQuantity <= 0) {
              return null;
            }

            const unitPrice = Number(nextCrop.msp || nextCrop.marketPrice || 0);
            return {
              ...cartRow,
              quantity: nextQuantity,
              unitPrice,
              totalPrice: nextQuantity * unitPrice,
            };
          })
          .filter(Boolean),
      );
    } catch (error) {
      console.error(error);
      setPageError(error.message || t("Unable to load crop listings"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  function addToCart() {
    setFeedback("");

    if (!selectedCrop || !isQuantityValid) {
      setFeedback(t("Select a crop and enter a valid quantity first"));
      return;
    }

    const nextItem = {
      crop: selectedCrop.crop,
      quantity: Number(purchase.quantity),
      unitPrice: selectedPrice,
      totalPrice: estimatedTotal,
    };
    setCartItems((current) => {
      const existingIndex = current.findIndex((item) => item.crop === nextItem.crop);
      if (existingIndex === -1) {
        return [...current, nextItem];
      }

      const updated = [...current];
      updated[existingIndex] = nextItem;
      return updated;
    });
    setFeedback(t("Item added to order details"));
    setPurchase({
      crop: selectedCrop.crop,
      quantity: "",
    });
  }

  async function completePurchase(item, paymentMethod = "Cash", paymentReference = null) {
    try {
      const result = await api("/market/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              crop: item.crop,
              quantity: item.quantity,
            },
          ],
          paymentMethod,
          paymentReference,
        }),
      });
      setFeedback(result.message);
      const cropData = await api("/market/buy-crops");
      setCrops(cropData);
      setPurchase(buildInitialPurchase());
      setCartItems((current) => current.filter((cartRow) => cartRow.crop !== item.crop));
      navigate(`/customer/cinvoices/${result.invoiceId}`);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function completeAllPurchases() {
    if (!cartItems.length) {
      setFeedback(t("Add at least one item to order details first"));
      return;
    }

    setFeedback("");

    try {
      const result = await api("/market/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: cartItems.map((cartItem) => ({
            crop: cartItem.crop,
            quantity: cartItem.quantity,
          })),
          paymentMethod: "Cash",
        }),
      });
      const cropData = await api("/market/buy-crops");
      setCrops(cropData);
      setPurchase(buildInitialPurchase());
      setCartItems([]);
      setFeedback(result.message || "Purchase completed successfully");
      navigate(`/customer/cinvoices/${result.invoiceId}`);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  function loadRazorpayScript() {
    if (window.Razorpay) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const existingScript = document.querySelector('script[data-razorpay-checkout="true"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true), { once: true });
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.dataset.razorpayCheckout = "true";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function payWithRazorpay() {
    setFeedback("");

    try {
      if (!cartItems.length) {
        setFeedback("Add an item to order details first");
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setFeedback("Unable to load Razorpay checkout");
        return;
      }

      const result = await api("/integrations/razorpay/order", {
        method: "POST",
        body: JSON.stringify({
          crop: cartItems.map((item) => item.crop).join(", "),
          quantity: 1,
          unitAmount: cartTotal,
        }),
      });

      const razorpay = new window.Razorpay({
        key: result.keyId,
        amount: result.amount,
        currency: result.currency,
        name: BRAND.name,
        description: "Crop cart checkout",
        order_id: result.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.mobile || "",
        },
        notes: {
          crop: cartItems.map((item) => item.crop).join(", "),
          quantity: String(cartItems.length),
        },
        config: {
          display: {
            blocks: {
              preferred_upi: {
                name: "Pay via UPI",
                instruments: [
                  {
                    method: "upi",
                  },
                ],
              },
            },
            sequence: ["block.preferred_upi"],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        theme: {
          color: "#5b8f2f",
        },
        handler: async (paymentResult) => {
          try {
            await api("/integrations/razorpay/verify", {
              method: "POST",
              body: JSON.stringify(paymentResult),
            });

            const result = await api("/market/checkout", {
              method: "POST",
              body: JSON.stringify({
                items: cartItems.map((cartItem) => ({
                  crop: cartItem.crop,
                  quantity: cartItem.quantity,
                })),
                paymentMethod: "Razorpay",
                paymentReference: paymentResult.razorpay_payment_id,
              }),
            });

            const cropData = await api("/market/buy-crops");
            setCrops(cropData);
            setPurchase(buildInitialPurchase());
            setCartItems([]);
            setFeedback(result.message || "Payment and purchase completed successfully");
            navigate(`/customer/cinvoices/${result.invoiceId}`);
          } catch (error) {
            setFeedback(error.message);
          }
        },
        modal: {
          ondismiss: () => {
            setFeedback("Razorpay payment was cancelled");
          },
        },
      });

      razorpay.open();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  const visibleCrops = useMemo(() => {
    return [...crops]
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
  }, [crops, query, sortBy]);

  const selectedCrop = useMemo(
    () => crops.find((item) => item.crop === purchase.crop) || null,
    [crops, purchase.crop],
  );
  const selectedPrice = selectedCrop?.msp || selectedCrop?.marketPrice || 0;
  const numericQuantity = Number(purchase.quantity || 0);
  const estimatedTotal = Number(selectedPrice) * numericQuantity;
  const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const isQuantityValid =
    Boolean(selectedCrop) &&
    purchase.quantity !== "" &&
    Number.isFinite(numericQuantity) &&
    numericQuantity > 0 &&
    numericQuantity <= Number(selectedCrop?.quantity || 0);
  const canAddToCart = Boolean(purchase.crop) && isQuantityValid;
  const hasCartItems = cartItems.length > 0;

  return (
    <ProtectedRoute role="customer">
      <LegacySection badge="Shopping">
        {loading ? <div className="alert alert-info">{t("Loading crop marketplace...")}</div> : null}
        {pageError ? <div className="alert alert-danger">{pageError}</div> : null}
        <div className="row row-content">
          <div className="col-md-12 mb-3">
            <div className="card text-white bg-gradient-danger mb-3">
              <div className="card-header">
                <span className="text-danger display-4"> {t("Buy Crops")} </span>
              </div>
              <div className="card-body">
                <div className="toolbar mb-3">
                  <input
                    className="form-control text-dark"
                    placeholder={t("Search crop")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select className="form-control text-dark" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="stock">{t("Sort by stock")}</option>
                    <option value="price">{t("Sort by price")}</option>
                    <option value="name">{t("Sort by name")}</option>
                  </select>
                </div>

                {!loading && !pageError && !crops.length ? (
                  <div className="alert alert-warning">{t("No crop listings are available for purchase right now.")}</div>
                ) : null}

                <div>
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
                          <select
                            className="form-control text-dark"
                            value={purchase.crop}
                            onChange={(e) => {
                              const nextCrop = crops.find((item) => item.crop === e.target.value);
                              setPurchase({
                                crop: e.target.value,
                                quantity: "",
                              });
                              setFeedback("");
                            }}
                          >
                            <option value="">{t("Select Crop")}</option>
                            {visibleCrops.map((crop) => (
                              <option key={crop.crop} value={crop.crop}>
                                {crop.crop}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="form-control text-dark"
                            type="number"
                            min="0"
                            max={selectedCrop?.quantity || undefined}
                            value={purchase.quantity}
                            placeholder={t("Enter kg")}
                            onChange={(e) =>
                              setPurchase({
                                ...purchase,
                                quantity: normalizeQuantity(e.target.value, selectedCrop?.quantity),
                              })
                            }
                          />
                        </td>
                        <td>
                          <input className="form-control text-dark" type="text" readOnly value={estimatedTotal.toFixed(2)} />
                        </td>
                        <td>
                          <button className="btn btn-success form-control" type="button" onClick={addToCart} disabled={!canAddToCart}>
                            {t("Add To Cart")}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-white">{t("Order Details")}</h3>
                <div className="card bg-white text-dark mt-2">
                  <div className="card-body">
                    {hasCartItems ? (
                      <>
                        <div className="table-responsive">
                          <table className="table table-striped table-bordered mb-0">
                            <thead>
                              <tr>
                                <th>{t("Item Name")}</th>
                                <th>{t("Quantity (KG)")}</th>
                                <th>{t("Rate (Rs.)")}</th>
                                <th>{t("Total (Rs.)")}</th>
                                <th>{t("Action")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cartItems.map((item) => (
                                <tr key={item.crop}>
                                  <td>{item.crop}</td>
                                  <td>{item.quantity}</td>
                                  <td>{item.unitPrice.toFixed(2)}</td>
                                  <td>{item.totalPrice.toFixed(2)}</td>
                                  <td>
                                    <button
                                      className="btn btn-warning btn-sm"
                                      type="button"
                                      onClick={() => setCartItems((current) => current.filter((cartRow) => cartRow.crop !== item.crop))}
                                    >
                                      {t("Remove")}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mt-4" style={{ gap: "1rem" }}>
                          <div>
                            <h5 className="mb-1">{t("Cart Total")}</h5>
                            <strong>Rs. {cartTotal.toFixed(2)}</strong>
                          </div>
                          <div className="d-flex flex-column flex-md-row" style={{ gap: "0.75rem" }}>
                            <button className="btn btn-success" type="button" onClick={completeAllPurchases}>
                              {t("Buy All Now")}
                            </button>
                            <button className="btn btn-info" type="button" onClick={payWithRazorpay}>
                              {t("Pay Cart with Razorpay")}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="mb-0 text-center">{t("No item added yet")}</p>
                    )}
                  </div>
                </div>

                <div className="card bg-white text-dark mt-3">
                  <div className="card-body">
                    <h5 className="mb-2">{t("Payment Options")}</h5>
                    <p className="mb-2">
                      Razorpay checkout supports cards, UPI, netbanking, wallets, and other methods enabled on your Razorpay test account.
                    </p>
                    <p className="mb-0">
                      {t("Add items to the cart first, then use Pay Cart with Razorpay for a single checkout.").replace("Pay Cart with Razorpay", "")}
                      <strong>{t("Pay Cart with Razorpay")}</strong>
                      .
                    </p>
                  </div>
                </div>

                {selectedCrop ? (
                  <p className="mt-3 text-white">
                    {t("Available stock for")} <strong>{selectedCrop.crop}</strong>: {selectedCrop.quantity} kg. {t("Rate")}: Rs. {selectedPrice} {t("per kg")}
                  </p>
                ) : null}

                {selectedCrop && !isQuantityValid ? (
                  <p className="mt-2 text-warning">
                    {t("Enter a quantity between 1 and")} {selectedCrop.quantity} kg.
                  </p>
                ) : null}

                {feedback ? <p className="feedback mt-3">{feedback}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </LegacySection>
    </ProtectedRoute>
  );
}
