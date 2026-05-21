const ROLE_TOPICS = {
  farmer: [
    {
      id: "role_farmer",
      label: "farmer role overview",
      answer:
        "Farmer can manage profile, request verification, add/edit/delete crop listings, view own stock, accept/reject orders, update delivery status, chat after order, view reviews, earnings, pending payout and released payout.",
      keywords: [
        "what can farmer",
        "farmer do",
        "farmer features",
        "farmer dashboard",
        "farmer role",
        "farmer work",
        "kisan kya",
        "किसान क्या",
        "किसान काम",
      ],
    },
    {
      id: "farmer_profile",
      label: "farmer profile",
      answer:
        "Open Farmer Profile, add farm name, phone, address, district, state and documents note, then save. A complete profile helps admin verification and customer trust.",
      action: { action: "navigate", parameters: { path: "/farmer/profile", label: "farmer profile" } },
      keywords: ["profile", "farm detail", "farmer detail", "address", "document", "verify profile"],
    },
    {
      id: "farmer_verification",
      label: "farmer verification",
      answer:
        "Complete your farmer profile first. Admin checks farm details and marks you verified or rejected. Verified farmers get a trust badge on listings.",
      action: { action: "navigate", parameters: { path: "/farmer/profile", label: "farmer profile" } },
      keywords: ["verify", "verification", "badge", "trust", "approved farmer"],
    },
    {
      id: "farmer_add_product",
      label: "add crop listing",
      answer:
        "Open Farmer Marketplace, use Products or Stock, enter crop name, category, price per kg, quantity, location and description, then submit for listing.",
      action: { action: "navigate", parameters: { path: "/farmer/marketplace", label: "farmer marketplace" } },
      keywords: ["add crop", "add product", "sell crop", "list crop", "stock add", "listing"],
    },
    {
      id: "farmer_orders",
      label: "farmer orders",
      answer:
        "Open Farmer Marketplace and check Orders. You can accept, reject, pack, ship, deliver or cancel orders that belong to your crop listings.",
      action: { action: "navigate", parameters: { path: "/farmer/marketplace", label: "farmer marketplace" } },
      keywords: ["order", "accept order", "reject order", "packed", "shipped", "delivery"],
    },
    {
      id: "farmer_payout",
      label: "farmer payout",
      answer:
        "Farmer payout stays pending until customer delivery confirmation and admin release. Your dashboard shows earnings, pending payout and released payout.",
      action: { action: "navigate", parameters: { path: "/farmer/marketplace", label: "farmer marketplace" } },
      keywords: ["payout", "earning", "money", "release", "pending payout", "commission"],
    },
    {
      id: "farmer_weather",
      label: "weather",
      answer:
        "Open Weather, enter your city, and use forecast for irrigation, spraying and sowing decisions. Avoid spraying before rain or strong wind.",
      action: { action: "navigate", parameters: { path: "/farmer/weather", label: "weather" } },
      keywords: ["weather", "rain", "forecast", "spray", "irrigation", "mausam"],
    },
    {
      id: "farmer_crop_ai",
      label: "crop AI tools",
      answer:
        "Use Crop Recommendation, Fertilizer, Rainfall, Yield and Crop Prediction tools. Give crop, soil, season, state and water details for better results.",
      action: { action: "navigate", parameters: { path: "/farmer/crop-recommendation", label: "crop recommendation" } },
      keywords: ["crop ai", "recommend crop", "fertilizer", "yield", "rainfall", "prediction"],
    },
    {
      id: "farmer_chat_review",
      label: "chat and reviews",
      answer:
        "Chat starts after an order is created. Reviews come after purchase or delivery and help build your farmer rating and trust.",
      action: { action: "navigate", parameters: { path: "/farmer/marketplace", label: "farmer marketplace" } },
      keywords: ["chat", "message", "review", "rating", "feedback"],
    },
  ],
  customer: [
    {
      id: "role_customer",
      label: "customer role overview",
      answer:
        "Customer can manage profile, browse/search/filter crops, view verified farmer badge, add to cart, place order, pay with Razorpay, track own orders, download invoice, chat after order, confirm delivery, review and raise dispute/refund.",
      keywords: [
        "what can customer",
        "customer do",
        "customer features",
        "customer dashboard",
        "customer role",
        "customer work",
        "buyer do",
        "\u0917\u094d\u0930\u093e\u0939\u0915 \u0915\u093e",
        "ग्राहक क्या",
        "ग्राहक काम",
      ],
    },
    {
      id: "customer_browse",
      label: "browse crops",
      answer:
        "Open Customer Marketplace. Search crop name and filter by location, price, category and farmer. Check verified farmer badge before buying.",
      action: { action: "navigate", parameters: { path: "/customer/marketplace", label: "customer marketplace" } },
      keywords: ["browse", "search", "filter", "find crop", "marketplace", "buy crop"],
    },
    {
      id: "customer_cart_order",
      label: "cart and order",
      answer:
        "Choose a crop, add it to cart, check quantity and price, place the order, then complete payment. Track status from your Orders section.",
      action: { action: "navigate", parameters: { path: "/customer/marketplace", label: "customer marketplace" } },
      keywords: ["cart", "place order", "order crop", "quantity", "checkout"],
    },
    {
      id: "customer_payment",
      label: "payment",
      answer:
        "Customer pays the platform through Razorpay. Payment becomes held, commission is calculated, and farmer payout waits for delivery confirmation.",
      action: { action: "navigate", parameters: { path: "/customer/marketplace", label: "customer marketplace" } },
      keywords: ["payment", "razorpay", "paid", "failed", "held", "cash"],
    },
    {
      id: "customer_invoice",
      label: "invoice",
      answer:
        "Invoice is available after successful payment. Open Invoices to view or download order, farmer, product, total and payment details.",
      action: { action: "navigate", parameters: { path: "/customer/invoices", label: "invoices" } },
      keywords: ["invoice", "bill", "download invoice", "receipt"],
    },
    {
      id: "customer_tracking",
      label: "order tracking",
      answer:
        "Track your order status from Orders. Status can be pending, accepted, packed, shipped, delivered, cancelled or rejected.",
      action: { action: "navigate", parameters: { path: "/customer/marketplace", label: "customer marketplace" } },
      keywords: ["track", "tracking", "status", "delivery", "shipped", "delivered"],
    },
    {
      id: "customer_dispute",
      label: "dispute and refund",
      answer:
        "For dispute or refund, open the order/dispute area, explain the issue and attach proof. Admin checks proof and approves refund if valid.",
      action: { action: "navigate", parameters: { path: "/customer/marketplace", label: "customer marketplace" } },
      keywords: ["refund", "dispute", "complaint", "return", "bad product"],
    },
    {
      id: "customer_profile",
      label: "customer profile",
      answer:
        "Open Customer Profile, update address, city, state, pincode and contact details. This helps delivery and invoice accuracy.",
      action: { action: "navigate", parameters: { path: "/customer/profile", label: "customer profile" } },
      keywords: ["profile", "address", "city", "pincode", "customer detail"],
    },
    {
      id: "customer_review_chat",
      label: "chat and review",
      answer:
        "After an order is created, you can chat with the farmer. After delivery, confirm delivery and leave a review to improve platform trust.",
      action: { action: "navigate", parameters: { path: "/customer/marketplace", label: "customer marketplace" } },
      keywords: ["chat", "message", "review", "rating", "confirm delivery"],
    },
  ],
  admin: [
    {
      id: "admin",
      label: "admin role overview",
      answer:
        "Admin manages trust and money: farmers, customers, farmer verification, product approval, orders, payments, commission, payouts, disputes, refunds, user blocking, analytics and featured listings.",
      keywords: [
        "what can admin",
        "admin do",
        "admin features",
        "admin dashboard",
        "admin role",
        "admin work",
        "administrator do",
        "एडमिन क्या",
        "एडमिन काम",
      ],
    },
    {
      id: "admin_verify_farmers",
      label: "farmer verification",
      answer:
        "Open Admin Farmers, check profile details, documents note, farm identity and contact data, then verify or reject the farmer.",
      action: { action: "navigate", parameters: { path: "/admin/farmers", label: "admin farmers" } },
      keywords: ["verify farmer", "farmer approval", "farmer list", "badge", "documents"],
    },
    {
      id: "admin_approve_stock",
      label: "stock approval",
      answer:
        "Open Admin Stock or Admin Marketplace, check crop name, price, quantity, location and description, then approve or reject the listing.",
      action: { action: "navigate", parameters: { path: "/admin/stock", label: "admin stock" } },
      keywords: ["approve product", "approve crop", "reject listing", "stock approval", "listing"],
    },
    {
      id: "admin_orders",
      label: "all orders",
      answer:
        "Admin can see all orders, payment status, customer, farmer and product flow from Admin Marketplace. Use it to audit platform operations.",
      action: { action: "navigate", parameters: { path: "/admin/marketplace", label: "admin marketplace" } },
      keywords: ["all orders", "order management", "order audit", "delivery status"],
    },
    {
      id: "admin_payout",
      label: "payout release",
      answer:
        "Release payout only after delivery confirmation and payment audit. Platform commission stays with the platform and farmer payout is released.",
      action: { action: "navigate", parameters: { path: "/admin/marketplace", label: "admin marketplace" } },
      keywords: ["release payout", "payout", "commission", "farmer money", "held payment"],
    },
    {
      id: "admin_dispute",
      label: "dispute review",
      answer:
        "Open disputes, check customer proof, farmer/order details and delivery status. Mark valid, rejected, refunded or closed based on evidence.",
      action: { action: "navigate", parameters: { path: "/admin/marketplace", label: "admin marketplace" } },
      keywords: ["dispute", "refund", "proof", "complaint", "return"],
    },
    {
      id: "admin_users",
      label: "user management",
      answer:
        "Admin can manage farmers and customers, block or unblock users, and inspect trust signals from the admin pages.",
      action: { action: "navigate", parameters: { path: "/admin/customers", label: "admin customers" } },
      keywords: ["block", "unblock", "users", "customers", "manage users"],
    },
    {
      id: "admin_analytics",
      label: "analytics",
      answer:
        "Analytics shows revenue, total orders, commission, active farmers and active customers. Use it for platform performance monitoring.",
      action: { action: "navigate", parameters: { path: "/admin/marketplace", label: "admin marketplace" } },
      keywords: ["analytics", "revenue", "total orders", "active farmers", "active customers"],
    },
    {
      id: "admin_contacts",
      label: "contact messages",
      answer:
        "Open Admin Messages to read support/contact messages. Use them to resolve onboarding, payment, dispute and platform setup issues.",
      action: { action: "navigate", parameters: { path: "/admin/messages", label: "admin messages" } },
      keywords: ["contact messages", "support messages", "admin messages", "query"],
    },
  ],
};

const QUESTION_FORMS = [
  "how do i {topic}",
  "how to {topic}",
  "open {topic}",
  "show {topic}",
  "guide me for {topic}",
  "explain {topic}",
  "what is {topic}",
  "where is {topic}",
  "help with {topic}",
  "tell me about {topic}",
  "i need {topic}",
  "can you handle {topic}",
  "robot operate {topic}",
  "start {topic}",
  "go to {topic}",
  "fix {topic}",
  "manage {topic}",
  "check {topic}",
  "status of {topic}",
  "process for {topic}",
  "steps for {topic}",
  "what should i do for {topic}",
  "i have a problem with {topic}",
  "why is {topic} needed",
  "when to use {topic}",
];

const EXTRA_TERMS = [
  "page",
  "dashboard",
  "section",
  "tab",
  "workflow",
  "process",
  "help",
  "operation",
  "robot command",
  "voice command",
  "quick guide",
  "full guide",
  "problem",
  "status",
  "details",
];

function normalizeDatasetText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectRequestedRoles(normalized) {
  const roles = [];
  if (/\u0915\u093f\u0938\u093e\u0928|\u092b\u093e\u0930\u094d\u092e\u0930/.test(normalized)) {
    roles.push("farmer");
  }
  if (/\u0917\u094d\u0930\u093e\u0939\u0915|\u0915\u0938\u094d\u091f\u092e\u0930|\u0916\u0930\u0940\u0926\u093e\u0930/.test(normalized)) {
    roles.push("customer");
  }
  if (/\u090f\u0921\u092e\u093f\u0928|\u092a\u094d\u0930\u0936\u093e\u0938\u0915|\u092e\u093e\u0932\u093f\u0915/.test(normalized)) {
    roles.push("admin");
  }
  if (/\b(farmer|farmers|seller|sellers|grower|growers|kisan)\b/.test(normalized) || /किसान|फार्मर/.test(normalized)) {
    roles.push("farmer");
  }
  if (/\b(customer|customers|buyer|buyers|consumer|consumers|client|clients)\b/.test(normalized) || /ग्राहक|कस्टमर|खरीदार/.test(normalized)) {
    roles.push("customer");
  }
  if (/\b(admin|admins|administrator|administrators|owner|authority)\b/.test(normalized) || /एडमिन|प्रशासक|मालिक/.test(normalized)) {
    roles.push("admin");
  }
  return [...new Set(roles)];
}

function buildDataset() {
  const rows = [];
  for (const [role, topics] of Object.entries(ROLE_TOPICS)) {
    for (const topic of topics) {
      const terms = [topic.label, ...topic.keywords];
      for (const term of terms) {
        for (const form of QUESTION_FORMS) {
          rows.push({
            role,
            intent: topic.id,
            question: form.replace("{topic}", term),
            answer: topic.answer,
            action: topic.action,
            keywords: topic.keywords,
          });
        }
        for (const extra of EXTRA_TERMS) {
          rows.push({
            role,
            intent: topic.id,
            question: `${term} ${extra}`,
            answer: topic.answer,
            action: topic.action,
            keywords: topic.keywords,
          });
        }
      }
    }
  }
  return rows.map((row) => ({
    ...row,
    normalizedQuestion: normalizeDatasetText(row.question),
    normalizedKeywords: row.keywords.map(normalizeDatasetText),
  }));
}

export const ROBOT_DATASET = buildDataset();

export function getRobotDatasetStats() {
  const byRole = ROBOT_DATASET.reduce((acc, row) => {
    acc[row.role] = (acc[row.role] || 0) + 1;
    return acc;
  }, {});
  return { total: ROBOT_DATASET.length, byRole };
}

export function matchRobotDataset(text, role = "guest") {
  const normalized = normalizeDatasetText(text);
  if (!normalized) return null;
  const requestedRoles = detectRequestedRoles(normalized);
  const rolePriority = requestedRoles.length
    ? requestedRoles
    : role && ROLE_TOPICS[role]
      ? [role, "farmer", "customer", "admin"]
      : ["farmer", "customer", "admin"];
  const allowedRoles = new Set(rolePriority);

  let best = null;
  for (const row of ROBOT_DATASET) {
    if (!allowedRoles.has(row.role)) continue;
    let score = 0;
    if (normalized.includes(row.normalizedQuestion)) score += 8;
    if (row.normalizedQuestion.includes(normalized) && normalized.length > 8) score += 5;
    for (const keyword of row.normalizedKeywords) {
      if (keyword && normalized.includes(keyword)) score += Math.max(2, keyword.split(" ").length);
    }
    if (requestedRoles.includes(row.role)) score += 5;
    else if (!requestedRoles.length && row.role === role) score += 1.5;
    if (!best || score > best.score) best = { ...row, score };
  }

  if (!best || best.score < 2) return null;
  return {
    found: true,
    confidence: Math.min(1, best.score / 10),
    role: best.role,
    intent: best.intent,
    content: best.answer,
    action: best.action,
    datasetSize: getRobotDatasetStats(),
  };
}
