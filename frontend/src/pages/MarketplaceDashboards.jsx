import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext.jsx";
import { BRAND } from "../branding.js";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import LegacySection from "../components/LegacySection.jsx";

const orderStatuses = ["pending", "accepted", "packed", "shipped", "delivered", "cancelled", "rejected"];

function Money({ value }) {
  return <>{`Rs. ${Number(value || 0).toFixed(2)}`}</>;
}

function StatusBadge({ children }) {
  return <span className="marketBadge">{children}</span>;
}

function EmptyState({ children }) {
  return <div className="marketEmpty">{children}</div>;
}

function Toast({ message }) {
  if (!message) return null;
  return <div className="marketToast">{message}</div>;
}

function OrderTimeline({ order }) {
  const steps = [
    { id: "pending", label: "Placed" },
    { id: "accepted", label: "Accepted" },
    { id: "packed", label: "Packed" },
    { id: "shipped", label: "Shipped" },
    { id: "delivered", label: "Delivered" },
  ];
  const currentIndex = steps.findIndex((step) => step.id === order?.status);
  const stopped = ["cancelled", "rejected"].includes(order?.status);

  return (
    <div className="marketTimeline" aria-label={`Order ${order?.order_id || ""} tracking`}>
      {steps.map((step, index) => (
        <span
          className={!stopped && index <= currentIndex ? "done" : ""}
          key={step.id}
        >
          {step.label}
        </span>
      ))}
      {stopped ? <span className="danger">{order.status}</span> : null}
    </div>
  );
}

function CashFlowCards({ items }) {
  return (
    <div className="marketGrid marketCashGrid">
      {items.map((item) => (
        <article className="card" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.money ? <Money value={item.value} /> : item.value}</strong>
          {item.note ? <small>{item.note}</small> : null}
        </article>
      ))}
    </div>
  );
}

function DashboardShell({ title, subtitle, navItems, activeTab, setActiveTab, children, feedback }) {
  return (
    <LegacySection badge="Marketplace">
      <div className="marketWorkspace">
        <aside className="marketSidebar">
          <strong>{BRAND.name}</strong>
          <span>{subtitle}</span>
          <nav>
            {navItems.map((item) => (
              <button
                className={activeTab === item.id ? "active" : ""}
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <Link className="marketSmallLink" to="/">Homepage</Link>
        </aside>
        <main className="marketMain">
          <div className="marketHeader">
            <div>
              <p className="eyebrow">Market-ready workspace</p>
              <h1>{title}</h1>
            </div>
            <Toast message={feedback} />
          </div>
          {children}
        </main>
      </div>
    </LegacySection>
  );
}

function ProductForm({ initial, onSubmit, submitLabel }) {
  const [form, setForm] = useState(
    initial || {
      name: "",
      category: "Crop",
      description: "",
      location: "",
      price_per_kg: "",
      stock_kg: "",
    },
  );

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  return (
    <form className="card marketForm" onSubmit={(event) => {
      event.preventDefault();
      onSubmit(form);
      setForm({ name: "", category: "Crop", description: "", location: "", price_per_kg: "", stock_kg: "" });
    }}>
      <input placeholder="Crop/product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <div className="marketFormGrid">
        <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input placeholder="Location" value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>
      <textarea rows="3" placeholder="Short product description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="marketFormGrid">
        <input type="number" min="1" placeholder="Price per kg" value={form.price_per_kg} onChange={(e) => setForm({ ...form, price_per_kg: e.target.value })} />
        <input type="number" min="1" placeholder="Stock in kg" value={form.stock_kg} onChange={(e) => setForm({ ...form, stock_kg: e.target.value })} />
      </div>
      <button className="button" type="submit">{submitLabel}</button>
    </form>
  );
}

function ChatPanel({ orderId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState("");

  async function load() {
    if (!orderId) return;
    const data = await api(`/marketplace/chats/order/${orderId}`);
    setMessages(data.messages || []);
  }

  useEffect(() => {
    load().catch((error) => setFeedback(error.message));
  }, [orderId]);

  async function send(event) {
    event.preventDefault();
    if (!text.trim()) return;
    try {
      await api(`/marketplace/chats/order/${orderId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      setText("");
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  if (!orderId) return <EmptyState>Select an order to open its order-based chat.</EmptyState>;

  return (
    <div className="card marketChat">
      <h3>Order chat #{orderId}</h3>
      <div className="marketChatLog">
        {messages.length ? messages.map((message) => (
          <div className="marketMessage" key={message.message_id}>
            <strong>{message.sender_role}</strong>
            <p>{message.message}</p>
            <small>{new Date(message.created_at).toLocaleString()}</small>
          </div>
        )) : <EmptyState>No messages yet.</EmptyState>}
      </div>
      <form onSubmit={send}>
        <input placeholder="Type message" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="button" type="submit">Send</button>
      </form>
      {feedback ? <p className="feedback">{feedback}</p> : null}
    </div>
  );
}

export function FarmerMarketplacePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [profileForm, setProfileForm] = useState({ farm_name: "", location: "", bio: "", documents_note: "" });

  async function load() {
    const overview = await api("/marketplace/farmer/overview");
    setData(overview);
    setProfileForm({
      farm_name: overview.profile?.farm_name || "",
      location: overview.profile?.location || overview.profile?.F_Location || "",
      bio: overview.profile?.bio || "",
      documents_note: overview.profile?.documents_note || "",
    });
    if (!selectedOrderId && overview.orders?.length) setSelectedOrderId(overview.orders[0].order_id);
  }

  useEffect(() => {
    load().catch((error) => setFeedback(error.message));
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const result = await api("/marketplace/farmer/profile", { method: "PUT", body: JSON.stringify(profileForm) });
      setFeedback(result.message);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function addProduct(form) {
    try {
      const result = editingProduct
        ? await api(`/marketplace/farmer/products/${editingProduct.product_id}`, { method: "PUT", body: JSON.stringify(form) })
        : await api("/marketplace/farmer/products", { method: "POST", body: JSON.stringify(form) });
      setFeedback(result.message);
      setEditingProduct(null);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function removeProduct(productId) {
    try {
      const result = await api(`/marketplace/farmer/products/${productId}`, { method: "DELETE" });
      setFeedback(result.message);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function updateOrder(orderId, status) {
    try {
      const result = await api(`/marketplace/farmer/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setFeedback(result.message);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "profile", label: "Profile" },
    { id: "products", label: "Products" },
    { id: "orders", label: "Orders" },
    { id: "earnings", label: "Earnings" },
    { id: "chat", label: "Chat" },
    { id: "tools", label: "AI Tools" },
  ];

  const farmerCashItems = [
    { label: "Customer payment pending", value: data?.cashFlow?.pending_customer_payment, money: true, note: "Orders created but not paid yet" },
    { label: "Held by platform", value: data?.cashFlow?.held_by_platform, money: true, note: "Paid through Razorpay, not released" },
    { label: "Pending payout", value: data?.earnings?.pending_payout, money: true, note: "Ready for admin after delivery" },
    { label: "Released payout", value: data?.earnings?.released_payout, money: true, note: "Farmer amount released" },
  ];

  return (
    <ProtectedRoute role="farmer">
      <DashboardShell title="Farmer Marketplace Dashboard" subtitle="Sell crops, manage orders, track payouts" navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} feedback={feedback}>
        {activeTab === "overview" ? (
          <>
            <div className="marketGrid">
              <article className="card"><span>Verification</span><strong>{data?.profile?.verification_status || "PENDING"}</strong></article>
              <article className="card"><span>Active products</span><strong>{data?.products?.length || 0}</strong></article>
              <article className="card"><span>Orders</span><strong>{data?.orders?.length || 0}</strong></article>
              <article className="card"><span>Platform commission</span><strong><Money value={data?.cashFlow?.platform_commission_total} /></strong></article>
            </div>
            <CashFlowCards items={farmerCashItems} />
          </>
        ) : null}

        {activeTab === "profile" ? (
          <form className="card marketForm" onSubmit={saveProfile}>
            <h3>Farmer profile and verification</h3>
            <input placeholder="Farm name" value={profileForm.farm_name} onChange={(e) => setProfileForm({ ...profileForm, farm_name: e.target.value })} />
            <input placeholder="Farm location" value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} />
            <textarea rows="4" placeholder="About your farm" value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} />
            <input placeholder="Verification document note / ID reference" value={profileForm.documents_note} onChange={(e) => setProfileForm({ ...profileForm, documents_note: e.target.value })} />
            <button className="button" type="submit">Save profile</button>
          </form>
        ) : null}

        {activeTab === "products" ? (
          <div className="marketTwo">
            <ProductForm
              initial={editingProduct}
              onSubmit={addProduct}
              submitLabel={editingProduct ? "Save product changes" : "Submit for approval"}
            />
            <div className="card">
              <h3>My crop stock</h3>
              {data?.products?.length ? data.products.map((product) => (
                <div className="marketRow" key={product.product_id}>
                  <div>
                    <strong>{product.name}</strong>
                    <p>{product.stock_kg} kg at <Money value={product.price_per_kg} />/kg</p>
                  </div>
                  <StatusBadge>{product.status}</StatusBadge>
                  <button className="ghostAction" type="button" onClick={() => setEditingProduct(product)}>Edit</button>
                  <button className="ghostAction" type="button" onClick={() => removeProduct(product.product_id)}>Delete</button>
                </div>
              )) : <EmptyState>No products listed yet.</EmptyState>}
            </div>
          </div>
        ) : null}

        {activeTab === "orders" ? (
          <div className="card">
            <h3>Only my orders</h3>
            {data?.orders?.length ? data.orders.map((order) => (
              <div className="marketOrder" key={order.order_id}>
                <div>
                  <strong>Order #{order.order_id}</strong>
                  <p>{order.customer_name || `Customer #${order.customer_id}`} | Payment: {order.payment_status}</p>
                  <p>Total <Money value={order.total_amount} /> | Farmer payout <Money value={order.farmer_payout} /></p>
                  <small>{order.items.map((item) => `${item.product_name} (${item.quantity_kg} kg)`).join(", ")}</small>
                  <OrderTimeline order={order} />
                </div>
                <select value={order.status} onChange={(e) => updateOrder(order.order_id, e.target.value)}>
                  {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <button className="ghostAction" type="button" onClick={() => { setSelectedOrderId(order.order_id); setActiveTab("chat"); }}>Chat</button>
              </div>
            )) : <EmptyState>No customer orders yet.</EmptyState>}
          </div>
        ) : null}

        {activeTab === "earnings" ? (
          <div className="marketTwo">
            <div className="card">
              <h3>Earnings</h3>
              <p>Held by platform: <strong><Money value={data?.cashFlow?.held_by_platform} /></strong></p>
              <p>Pending payout: <strong><Money value={data?.earnings?.pending_payout} /></strong></p>
              <p>Released payout: <strong><Money value={data?.earnings?.released_payout} /></strong></p>
              <p>Refunded orders: <strong><Money value={data?.cashFlow?.refunded_to_customer} /></strong></p>
            </div>
            <div className="card">
              <h3>Customer reviews</h3>
              {data?.reviews?.length ? data.reviews.map((review) => (
                <div className="marketRow" key={`${review.created_at}-${review.rating}`}>
                  <strong>{review.rating}/5</strong>
                  <p>{review.comment || "No comment"}</p>
                </div>
              )) : <EmptyState>No reviews yet.</EmptyState>}
            </div>
          </div>
        ) : null}

        {activeTab === "chat" ? <ChatPanel orderId={selectedOrderId} /> : null}

        {activeTab === "tools" ? (
          <div className="marketGrid">
            <Link className="card marketTool" to="/farmer/crop-recommendation">AI crop recommendation</Link>
            <Link className="card marketTool" to="/farmer/fertilizer-recommendation">Fertilizer suggestion</Link>
            <Link className="card marketTool" to="/farmer/weather">Weather section</Link>
            <Link className="card marketTool" to="/farmer/news">News section</Link>
          </div>
        ) : null}
      </DashboardShell>
    </ProtectedRoute>
  );
}

export function CustomerMarketplacePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("browse");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [filters, setFilters] = useState({ search: "", location: "", category: "" });
  const [feedback, setFeedback] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [dispute, setDispute] = useState({ reason: "", details: "" });
  const [profile, setProfile] = useState({ address: "", city: "", state: "", pincode: "" });

  async function load() {
    const query = new URLSearchParams(filters).toString();
    const [productData, orderData, profileData] = await Promise.all([
      api(`/marketplace/public/products?${query}`),
      api("/marketplace/customer/orders"),
      api("/marketplace/customer/profile"),
    ]);
    setProducts(productData);
    setOrders(orderData);
    setProfile({
      address: profileData.address || "",
      city: profileData.city || "",
      state: profileData.state || "",
      pincode: profileData.pincode || "",
    });
    if (!selectedOrderId && orderData.length) setSelectedOrderId(orderData[0].order_id);
  }

  useEffect(() => {
    load().catch((error) => setFeedback(error.message));
  }, []);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantity_kg * Number(item.price_per_kg), 0), [cart]);

  function addToCart(product) {
    setCart((current) => {
      const exists = current.find((item) => item.product_id === product.product_id);
      if (exists) return current;
      return [...current, { ...product, quantity_kg: 1 }];
    });
  }

  async function placeOrder() {
    try {
      const result = await api("/marketplace/customer/orders", {
        method: "POST",
        body: JSON.stringify({ items: cart.map((item) => ({ product_id: item.product_id, quantity_kg: item.quantity_kg })) }),
      });
      setFeedback(`${result.message}. Order #${result.order_id} total Rs. ${result.total_amount}`);
      setCart([]);
      setSelectedOrderId(result.order_id);
      setActiveTab("orders");
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  function loadRazorpayScript() {
    if (window.Razorpay) return Promise.resolve(true);
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function payOrder(order) {
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setFeedback("Unable to load Razorpay checkout");
        return;
      }

      const payment = await api("/marketplace/payments/razorpay/create", {
        method: "POST",
        body: JSON.stringify({ order_id: order.order_id }),
      });

      if (payment.mode === "test") {
        setFeedback("Razorpay test checkout opened. Use Razorpay test card or UPI details.");
      }

      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        name: BRAND.name,
        description: `Order #${order.order_id}`,
        order_id: payment.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.mobile || "",
        },
        theme: { color: "#2f6b2f" },
        handler: async (result) => {
          const verify = await api("/marketplace/payments/razorpay/verify", {
            method: "POST",
            body: JSON.stringify(result),
          });
          setFeedback(verify.message);
          await load();
        },
      });
      checkout.open();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function markTestPaid(orderId) {
    try {
      const result = await api("/marketplace/payments/test/mark-paid", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId }),
      });
      setFeedback(result.message);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function confirmDelivery(orderId) {
    try {
      const result = await api(`/marketplace/customer/orders/${orderId}/confirm-delivery`, { method: "POST" });
      setFeedback(result.message);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function submitReview(orderId) {
    try {
      const result = await api(`/marketplace/orders/${orderId}/review`, { method: "POST", body: JSON.stringify(review) });
      setFeedback(result.message);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function raiseDispute(orderId) {
    try {
      const result = await api(`/marketplace/orders/${orderId}/dispute`, { method: "POST", body: JSON.stringify(dispute) });
      setFeedback(result.message);
      setDispute({ reason: "", details: "" });
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const result = await api("/marketplace/customer/profile", { method: "PUT", body: JSON.stringify(profile) });
      setFeedback(result.message);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  const navItems = [
    { id: "browse", label: "Browse" },
    { id: "profile", label: "Profile" },
    { id: "cart", label: "Cart" },
    { id: "orders", label: "Orders" },
    { id: "chat", label: "Chat" },
    { id: "support", label: "Review/Dispute" },
  ];

  const selectedOrder = orders.find((order) => order.order_id === selectedOrderId);
  const customerCashItems = [
    {
      label: "Pending payment",
      value: orders.filter((order) => order.payment_status === "PENDING").reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      money: true,
      note: "Needs Razorpay/test payment",
    },
    {
      label: "Held safely",
      value: orders.filter((order) => order.payment_status === "HELD").reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      money: true,
      note: "Platform holds funds until delivery",
    },
    {
      label: "Completed",
      value: orders.filter((order) => order.payment_status === "RELEASED").reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      money: true,
      note: "Payout released by admin",
    },
    {
      label: "Total orders",
      value: orders.length,
      note: "Only your orders",
    },
  ];

  return (
    <ProtectedRoute role="customer">
      <DashboardShell title="Customer Marketplace Dashboard" subtitle="Browse, pay, track, review" navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} feedback={feedback}>
        {activeTab === "browse" ? (
          <>
            <div className="card marketFilters">
              <input placeholder="Search crop name" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              <input placeholder="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
              <input placeholder="Category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
              <button className="button" type="button" onClick={load}>Apply filters</button>
            </div>
            <div className="marketProductGrid">
              {products.length ? products.map((product) => (
                <article className="card marketProduct" key={product.product_id}>
                  <div>
                    <StatusBadge>{product.verification_status === "VERIFIED" ? "Verified farmer" : "Verification pending"}</StatusBadge>
                    <h3>{product.name}</h3>
                    <p>{product.description || "Fresh crop listed by farmer."}</p>
                  </div>
                  <div>
                    <p>{product.farmer_name} | {Number(product.farmer_rating || 0).toFixed(1)}/5</p>
                    <p>{product.location || "Local farm"} | {product.stock_kg} kg</p>
                    <strong><Money value={product.price_per_kg} />/kg</strong>
                  </div>
                  <button className="button" type="button" onClick={() => addToCart(product)}>Add to cart</button>
                </article>
              )) : <EmptyState>No approved crops match your filters.</EmptyState>}
            </div>
          </>
        ) : null}

        {activeTab === "profile" ? (
          <form className="card marketForm" onSubmit={saveProfile}>
            <h3>Customer profile management</h3>
            <input placeholder="Address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            <div className="marketFormGrid">
              <input placeholder="City" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
              <input placeholder="State" value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} />
              <input placeholder="Pincode" value={profile.pincode} onChange={(e) => setProfile({ ...profile, pincode: e.target.value })} />
            </div>
            <button className="button" type="submit">Save profile</button>
          </form>
        ) : null}

        {activeTab === "cart" ? (
          <div className="card">
            <h3>Cart</h3>
            {cart.length ? cart.map((item) => (
              <div className="marketRow" key={item.product_id}>
                <div>
                  <strong>{item.name}</strong>
                  <p><Money value={item.price_per_kg} />/kg</p>
                </div>
                <input type="number" min="1" max={item.stock_kg} value={item.quantity_kg} onChange={(e) => setCart((current) => current.map((row) => row.product_id === item.product_id ? { ...row, quantity_kg: Number(e.target.value) } : row))} />
                <button className="ghostAction" type="button" onClick={() => setCart((current) => current.filter((row) => row.product_id !== item.product_id))}>Remove</button>
              </div>
            )) : <EmptyState>Your cart is empty.</EmptyState>}
            <div className="marketSummary">Cart total: <strong><Money value={cartTotal} /></strong></div>
            <button className="button" type="button" disabled={!cart.length} onClick={placeOrder}>Place order</button>
          </div>
        ) : null}

        {activeTab === "orders" ? (
          <>
            <CashFlowCards items={customerCashItems} />
            <div className="card">
              <h3>Only my orders</h3>
              {orders.length ? orders.map((order) => (
                <div className="marketOrder" key={order.order_id}>
                  <div>
                    <strong>Order #{order.order_id}</strong>
                    <p>{order.farmer_name || `Farmer #${order.farmer_id}`} | Status: {order.status} | Payment: {order.payment_status}</p>
                    <small>{order.items.map((item) => `${item.product_name} (${item.quantity_kg} kg)`).join(", ")}</small>
                    <OrderTimeline order={order} />
                  </div>
                  <strong><Money value={order.total_amount} /></strong>
                  <div className="marketActions">
                    {order.payment_status === "PENDING" ? <button className="button" type="button" onClick={() => payOrder(order)}>Pay Razorpay</button> : null}
                    {order.payment_status === "PENDING" ? <button className="ghostAction" type="button" onClick={() => markTestPaid(order.order_id)}>Mark paid test</button> : null}
                    <button className="ghostAction" type="button" onClick={() => { setSelectedOrderId(order.order_id); setActiveTab("chat"); }}>Chat</button>
                    <button className="ghostAction" type="button" disabled={!["shipped", "delivered"].includes(order.status)} onClick={() => confirmDelivery(order.order_id)}>Confirm delivery</button>
                  </div>
                </div>
              )) : <EmptyState>No orders yet. Browse approved crops, add to cart, and place an order to start tracking.</EmptyState>}
            </div>
          </>
        ) : null}

        {activeTab === "chat" ? <ChatPanel orderId={selectedOrderId} /> : null}

        {activeTab === "support" ? (
          <div className="marketTwo">
            <div className="card marketForm">
              <h3>Rating and review</h3>
              <select value={selectedOrderId || ""} onChange={(e) => setSelectedOrderId(Number(e.target.value))}>
                {orders.map((order) => <option key={order.order_id} value={order.order_id}>Order #{order.order_id}</option>)}
              </select>
              <input type="number" min="1" max="5" value={review.rating} onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })} />
              <textarea rows="3" placeholder="Review comment" value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} />
              <button className="button" type="button" disabled={!selectedOrder} onClick={() => submitReview(selectedOrderId)}>Submit review</button>
            </div>
            <div className="card marketForm">
              <h3>Raise dispute/refund request</h3>
              <input placeholder="Reason" value={dispute.reason} onChange={(e) => setDispute({ ...dispute, reason: e.target.value })} />
              <textarea rows="4" placeholder="Explain the issue" value={dispute.details} onChange={(e) => setDispute({ ...dispute, details: e.target.value })} />
              <button className="button" type="button" disabled={!selectedOrder} onClick={() => raiseDispute(selectedOrderId)}>Raise dispute</button>
            </div>
          </div>
        ) : null}
      </DashboardShell>
    </ProtectedRoute>
  );
}

export function AdminMarketplacePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [state, setState] = useState({ overview: null, farmers: [], customers: [], products: [], orders: [], payments: [], payouts: [], disputes: [], messages: [] });
  const [feedback, setFeedback] = useState("");
  const [commission, setCommission] = useState(10);

  async function load() {
    const [overview, farmers, customers, products, orders, payments, payouts, disputes, messages] = await Promise.all([
      api("/marketplace/admin/overview"),
      api("/marketplace/admin/farmers"),
      api("/marketplace/admin/customers"),
      api("/marketplace/admin/products"),
      api("/marketplace/admin/orders"),
      api("/marketplace/admin/payments"),
      api("/marketplace/admin/payouts"),
      api("/marketplace/admin/disputes"),
      api("/marketplace/admin/contact-messages"),
    ]);
    setState({ overview, farmers, customers, products, orders, payments, payouts, disputes, messages });
  }

  useEffect(() => {
    load().catch((error) => setFeedback(error.message));
  }, []);

  async function action(path, options = {}) {
    try {
      const result = await api(path, options);
      setFeedback(result.message);
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  const navItems = [
    { id: "overview", label: "Analytics" },
    { id: "farmers", label: "Farmers" },
    { id: "customers", label: "Customers" },
    { id: "products", label: "Listings" },
    { id: "orders", label: "Orders" },
    { id: "payments", label: "Payments" },
    { id: "payouts", label: "Payouts" },
    { id: "disputes", label: "Disputes" },
    { id: "messages", label: "Messages" },
  ];

  const adminCashItems = [
    {
      label: "Customer money pending",
      value: state.orders.filter((order) => order.payment_status === "PENDING").reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      money: true,
      note: "Created orders awaiting payment",
    },
    {
      label: "Held by platform",
      value: state.orders.filter((order) => order.payment_status === "HELD").reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      money: true,
      note: "Paid and waiting for delivery/payout",
    },
    {
      label: "Commission earned",
      value: state.overview?.totals?.total_commission,
      money: true,
      note: "Platform revenue on paid orders",
    },
    {
      label: "Payout pending",
      value: state.payouts.filter((payout) => payout.status === "PENDING").reduce((sum, payout) => sum + Number(payout.amount || 0), 0),
      money: true,
      note: "Release after customer confirmation",
    },
  ];

  return (
    <ProtectedRoute role="admin">
      <DashboardShell title="Admin Marketplace Dashboard" subtitle="Trust, orders, revenue, disputes" navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} feedback={feedback}>
        {activeTab === "overview" ? (
          <>
            <div className="marketGrid">
              {Object.entries(state.overview?.totals || {}).map(([key, value]) => (
                <article className="card" key={key}><span>{key.replaceAll("_", " ")}</span><strong>{String(value)}</strong></article>
              ))}
            </div>
            <CashFlowCards items={adminCashItems} />
            <div className="card marketForm">
              <h3>Commission model</h3>
              <p>If order total is Rs. 1000 and commission is 10%, platform keeps Rs. 100 and farmer payout is Rs. 900.</p>
              <div className="marketFormGrid">
                <input type="number" min="0" max="50" value={commission} onChange={(e) => setCommission(e.target.value)} />
                <button className="button" type="button" onClick={() => action("/marketplace/admin/settings/commission", { method: "PATCH", body: JSON.stringify({ commission_percentage: commission }) })}>Update commission</button>
              </div>
            </div>
          </>
        ) : null}

        {activeTab === "farmers" ? (
          <div className="card">
            <h3>Farmer verification and blocking</h3>
            {state.farmers.map((farmer) => (
              <div className="marketOrder" key={farmer.farmer_id}>
                <div>
                  <strong>{farmer.farmer_name}</strong>
                  <p>{farmer.email} | {farmer.F_District}</p>
                </div>
                <StatusBadge>{farmer.verification_status}</StatusBadge>
                <div className="marketActions">
                  <button className="button" type="button" onClick={() => action(`/marketplace/admin/farmers/${farmer.farmer_id}/verification`, { method: "PATCH", body: JSON.stringify({ status: "VERIFIED" }) })}>Verify</button>
                  <button className="ghostAction" type="button" onClick={() => action(`/marketplace/admin/farmers/${farmer.farmer_id}/verification`, { method: "PATCH", body: JSON.stringify({ status: "REJECTED" }) })}>Reject</button>
                  <button className="ghostAction" type="button" onClick={() => action(`/marketplace/admin/users/farmer/${farmer.farmer_id}/block`, { method: "PATCH", body: JSON.stringify({ blocked: !farmer.is_blocked }) })}>{farmer.is_blocked ? "Unblock" : "Block"}</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "customers" ? (
          <div className="card">
            <h3>Customer management</h3>
            {state.customers.map((customer) => (
              <div className="marketOrder" key={customer.cust_id}>
                <div>
                  <strong>{customer.cust_name}</strong>
                  <p>{customer.email} | {customer.city}</p>
                </div>
                <StatusBadge>{customer.is_blocked ? "Blocked" : "Active"}</StatusBadge>
                <button className="ghostAction" type="button" onClick={() => action(`/marketplace/admin/users/customer/${customer.cust_id}/block`, { method: "PATCH", body: JSON.stringify({ blocked: !customer.is_blocked }) })}>{customer.is_blocked ? "Unblock" : "Block"}</button>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "products" ? (
          <div className="card">
            <h3>Approve/reject crop listings</h3>
            {state.products.map((product) => (
              <div className="marketOrder" key={product.product_id}>
                <div>
                  <strong>{product.name}</strong>
                  <p>{product.farmer_name} | <Money value={product.price_per_kg} />/kg | {product.stock_kg} kg</p>
                </div>
                <StatusBadge>{product.status}</StatusBadge>
                <div className="marketActions">
                  <button className="button" type="button" onClick={() => action(`/marketplace/admin/products/${product.product_id}/status`, { method: "PATCH", body: JSON.stringify({ status: "APPROVED" }) })}>Approve</button>
                  <button className="ghostAction" type="button" onClick={() => action(`/marketplace/admin/products/${product.product_id}/status`, { method: "PATCH", body: JSON.stringify({ status: "REJECTED" }) })}>Reject</button>
                  <button className="ghostAction" type="button" onClick={() => action(`/marketplace/admin/products/${product.product_id}/featured`, { method: "PATCH", body: JSON.stringify({ is_featured: !product.is_featured, title: product.name }) })}>{product.is_featured ? "Unfeature" : "Feature"}</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "orders" ? (
          <div className="card">
            <h3>All orders</h3>
            {state.orders.map((order) => (
              <div className="marketOrder" key={order.order_id}>
                <div>
                  <strong>Order #{order.order_id}</strong>
                  <p>{order.customer_name || `Customer #${order.customer_id}`} to {order.farmer_name || `Farmer #${order.farmer_id}`}</p>
                  <p>Payment: {order.payment_status} | Commission <Money value={order.platform_commission} /> | Payout <Money value={order.farmer_payout} /></p>
                  <small>{order.items.map((item) => item.product_name).join(", ")}</small>
                  <OrderTimeline order={order} />
                </div>
                <StatusBadge>{order.status}</StatusBadge>
                <strong><Money value={order.total_amount} /></strong>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "payments" ? (
          <div className="card">
            <h3>All payments and commission</h3>
            {state.payments.map((payment) => (
              <div className="marketRow" key={payment.payment_id}>
                <strong>Order #{payment.order_id}</strong>
                <span>{payment.provider}</span>
                <StatusBadge>{payment.status}</StatusBadge>
                <strong><Money value={payment.amount} /></strong>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "payouts" ? (
          <div className="card">
            <h3>Farmer payouts</h3>
            {state.payouts.map((payout) => (
              <div className="marketOrder" key={payout.payout_id}>
                <div>
                  <strong>Payout #{payout.payout_id}</strong>
                  <p>Order #{payout.order_id} | Farmer #{payout.farmer_id}</p>
                </div>
                <StatusBadge>{payout.status}</StatusBadge>
                <strong><Money value={payout.amount} /></strong>
                <button className="button" type="button" onClick={() => action(`/marketplace/admin/payouts/${payout.payout_id}/release`, { method: "POST" })}>Release payout</button>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "disputes" ? (
          <div className="card">
            <h3>Disputes and refunds</h3>
            {state.disputes.map((disputeRow) => (
              <div className="marketOrder" key={disputeRow.dispute_id}>
                <div>
                  <strong>Dispute #{disputeRow.dispute_id}</strong>
                  <p>{disputeRow.reason}</p>
                  <small>{disputeRow.details}</small>
                </div>
                <StatusBadge>{disputeRow.status}</StatusBadge>
                <div className="marketActions">
                  <button className="button" type="button" onClick={() => action(`/marketplace/admin/disputes/${disputeRow.dispute_id}`, { method: "PATCH", body: JSON.stringify({ status: "VALID", admin_note: "Valid issue" }) })}>Mark valid</button>
                  <button className="ghostAction" type="button" onClick={() => action(`/marketplace/admin/disputes/${disputeRow.dispute_id}`, { method: "PATCH", body: JSON.stringify({ status: "REFUNDED", admin_note: "Refund approved" }) })}>Refund</button>
                  <button className="ghostAction" type="button" onClick={() => action(`/marketplace/admin/disputes/${disputeRow.dispute_id}`, { method: "PATCH", body: JSON.stringify({ status: "REJECTED", admin_note: "Rejected by admin" }) })}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "messages" ? (
          <div className="card">
            <h3>Contact messages</h3>
            {state.messages.map((message) => (
              <div className="marketOrder" key={message.c_id}>
                <div>
                  <strong>{message.c_name}</strong>
                  <p>{message.c_email} | {message.c_mobile}</p>
                  <small>{message.c_message}</small>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </DashboardShell>
    </ProtectedRoute>
  );
}
