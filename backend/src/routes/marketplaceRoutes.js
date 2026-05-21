import { Router } from "express";
import pool, { query } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createRazorpayOrder, isRazorpayTestMode, verifyRazorpayPayment } from "../services/razorpayService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const ORDER_STATUSES = ["pending", "accepted", "packed", "shipped", "delivered", "cancelled", "rejected"];

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function invoiceNumber(orderId) {
  return `KNV-${String(orderId).padStart(6, "0")}`;
}

async function getCommissionPercentage(connection = null) {
  const executor = connection || pool;
  const [rows] = await executor.execute(
    "SELECT setting_value FROM admin_settings WHERE setting_key = 'commission_percentage'",
  );
  const value = Number(rows[0]?.setting_value ?? 10);
  return Number.isFinite(value) && value >= 0 ? value : 10;
}

async function notify(connection, userRole, userId, title, message) {
  await connection.execute(
    "INSERT INTO notifications (user_role, user_id, title, message) VALUES (?, ?, ?, ?)",
    [userRole, userId, title, message],
  );
}

async function mirrorUser(role, legacyId) {
  if (role === "farmer") {
    const [rows] = await pool.execute(
      "SELECT farmer_name AS name, email, phone_no AS phone FROM farmerlogin WHERE farmer_id = ?",
      [legacyId],
    );
    const user = rows[0];
    if (user) {
      await pool.execute(
        `INSERT INTO users (legacy_id, role, name, email, phone)
         VALUES (?, 'farmer', ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), phone = VALUES(phone)`,
        [legacyId, user.name || "Farmer", user.email || null, user.phone || null],
      );
    }
  }

  if (role === "customer") {
    const [rows] = await pool.execute(
      "SELECT cust_name AS name, email, phone_no AS phone FROM custlogin WHERE cust_id = ?",
      [legacyId],
    );
    const user = rows[0];
    if (user) {
      await pool.execute(
        `INSERT INTO users (legacy_id, role, name, email, phone)
         VALUES (?, 'customer', ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), phone = VALUES(phone)`,
        [legacyId, user.name || "Customer", user.email || null, user.phone || null],
      );
    }
  }
}

function requireNotBlocked(req, res, next) {
  mirrorUser(req.user.role, req.user.userId)
    .then(() =>
      pool.execute("SELECT is_blocked FROM users WHERE legacy_id = ? AND role = ?", [
        req.user.userId,
        req.user.role,
      ]),
    )
    .then(([rows]) => {
      if (rows[0]?.is_blocked) {
        return res.status(403).json({ message: "Your account is blocked. Contact support." });
      }
      next();
    })
    .catch(next);
}

async function loadOrder(orderId) {
  const [orders] = await pool.execute("SELECT * FROM orders WHERE order_id = ?", [orderId]);
  return orders[0] || null;
}

async function attachItems(orders) {
  if (!orders.length) return [];
  const ids = orders.map((order) => order.order_id);
  const [items] = await pool.query(
    `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => "?").join(",")}) ORDER BY item_id ASC`,
    ids,
  );
  return orders.map((order) => ({
    ...order,
    items: items.filter((item) => item.order_id === order.order_id),
  }));
}

async function createInvoiceForOrder(connection, orderId) {
  const [[order]] = await connection.execute("SELECT * FROM orders WHERE order_id = ?", [orderId]);
  if (!order) return;

  const [[existingInvoice]] = await connection.execute("SELECT invoice_id FROM invoices WHERE order_id = ?", [orderId]);
  if (existingInvoice) return;

  const [[customer]] = await connection.execute(
    "SELECT cust_id, cust_name, email, phone_no, state, city, address, pincode FROM custlogin WHERE cust_id = ?",
    [order.customer_id],
  );
  const [[farmer]] = await connection.execute(
    "SELECT farmer_id, farmer_name, email, phone_no, F_State, F_District, F_Location FROM farmerlogin WHERE farmer_id = ?",
    [order.farmer_id],
  );
  const [items] = await connection.execute("SELECT product_name, quantity_kg, unit_price, line_total FROM order_items WHERE order_id = ?", [
    orderId,
  ]);

  await connection.execute(
    `INSERT INTO invoices
     (order_id, invoice_number, customer_snapshot, farmer_snapshot, items_snapshot, subtotal, platform_commission, total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      invoiceNumber(orderId),
      JSON.stringify(customer || {}),
      JSON.stringify(farmer || {}),
      JSON.stringify(items),
      order.total_amount,
      order.platform_commission,
      order.total_amount,
    ],
  );
}

async function holdPaidOrder(connection, { order, payment, providerPaymentId, rawResponse }) {
  await connection.execute(
    "UPDATE payments SET provider_payment_id = ?, status = 'HELD', raw_response = ? WHERE payment_id = ?",
    [providerPaymentId, JSON.stringify(rawResponse), payment.payment_id],
  );
  await connection.execute("UPDATE orders SET payment_status = 'HELD' WHERE order_id = ?", [order.order_id]);
  await connection.execute(
    `INSERT INTO payouts (order_id, farmer_id, amount, status)
     VALUES (?, ?, ?, 'PENDING')
     ON DUPLICATE KEY UPDATE amount = VALUES(amount), status = IF(status = 'RELEASED', 'RELEASED', 'PENDING')`,
    [order.order_id, order.farmer_id, order.farmer_payout],
  );
  await createInvoiceForOrder(connection, order.order_id);
  await notify(connection, "farmer", order.farmer_id, "Payment successful", `Payment for order #${order.order_id} is held by platform.`);
  await notify(connection, "customer", order.customer_id, "Payment successful", `Payment for order #${order.order_id} is secured.`);
}

router.get(
  "/public/products",
  asyncHandler(async (req, res) => {
    const search = `%${cleanText(req.query.search)}%`;
    const location = `%${cleanText(req.query.location)}%`;
    const category = `%${cleanText(req.query.category)}%`;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : 0;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : 999999999;

    const products = await query(
      `SELECT p.*, f.farmer_name, fp.verification_status, fp.rating,
              COALESCE(AVG(r.rating), fp.rating, 0) AS farmer_rating
       FROM products p
       JOIN farmerlogin f ON f.farmer_id = p.farmer_id
       LEFT JOIN farmer_profiles fp ON fp.farmer_id = p.farmer_id
       LEFT JOIN reviews r ON r.farmer_id = p.farmer_id
       WHERE p.status = 'APPROVED'
         AND p.stock_kg > 0
         AND p.name LIKE ?
         AND COALESCE(p.location, '') LIKE ?
         AND p.category LIKE ?
         AND p.price_per_kg BETWEEN ? AND ?
       GROUP BY p.product_id
       ORDER BY p.is_featured DESC, p.created_at DESC`,
      [search, location, category, minPrice, maxPrice],
    );

    res.json(products);
  }),
);

router.use(requireAuth, requireNotBlocked);

router.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT notification_id, title, message, is_read, created_at
       FROM notifications
       WHERE user_role = ? AND user_id = ?
       ORDER BY notification_id DESC
       LIMIT 50`,
      [req.user.role, req.user.userId],
    );
    res.json(rows);
  }),
);

router.get(
  "/farmer/overview",
  requireRole("farmer"),
  asyncHandler(async (req, res) => {
    const farmerId = req.user.userId;
    const [[profile]] = await pool.execute(
      `SELECT f.farmer_id, f.farmer_name, f.email, f.phone_no, f.F_State, f.F_District, f.F_Location,
              fp.farm_name, fp.bio, fp.location, fp.documents_note, fp.verification_status, fp.rating
       FROM farmerlogin f
       LEFT JOIN farmer_profiles fp ON fp.farmer_id = f.farmer_id
       WHERE f.farmer_id = ?`,
      [farmerId],
    );
    const [products] = await pool.execute("SELECT * FROM products WHERE farmer_id = ? ORDER BY product_id DESC", [farmerId]);
    const [orders] = await pool.execute(
      `SELECT o.*, c.cust_name AS customer_name, c.email AS customer_email, c.city AS customer_city
       FROM orders o
       LEFT JOIN custlogin c ON c.cust_id = o.customer_id
       WHERE o.farmer_id = ?
       ORDER BY o.order_id DESC LIMIT 50`,
      [farmerId],
    );
    const ordersWithItems = await attachItems(orders);
    const [[earnings]] = await pool.execute(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'RELEASED' THEN amount ELSE 0 END), 0) AS released_payout,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS pending_payout
       FROM payouts WHERE farmer_id = ?`,
      [farmerId],
    );
    const [reviews] = await pool.execute(
      "SELECT rating, comment, created_at FROM reviews WHERE farmer_id = ? ORDER BY review_id DESC LIMIT 20",
      [farmerId],
    );
    const [payouts] = await pool.execute("SELECT * FROM payouts WHERE farmer_id = ? ORDER BY payout_id DESC", [farmerId]);
    const [[cashFlow]] = await pool.execute(
      `SELECT
        COALESCE(SUM(CASE WHEN payment_status = 'PENDING' THEN total_amount ELSE 0 END), 0) AS pending_customer_payment,
        COALESCE(SUM(CASE WHEN payment_status = 'HELD' THEN total_amount ELSE 0 END), 0) AS held_by_platform,
        COALESCE(SUM(CASE WHEN payment_status = 'RELEASED' THEN farmer_payout ELSE 0 END), 0) AS released_to_farmer,
        COALESCE(SUM(CASE WHEN payment_status = 'REFUNDED' THEN total_amount ELSE 0 END), 0) AS refunded_to_customer,
        COALESCE(SUM(platform_commission), 0) AS platform_commission_total
       FROM orders WHERE farmer_id = ?`,
      [farmerId],
    );

    res.json({ profile, products, orders: ordersWithItems, earnings, reviews, payouts, cashFlow });
  }),
);

router.put(
  "/farmer/profile",
  requireRole("farmer"),
  asyncHandler(async (req, res) => {
    const farmName = cleanText(req.body.farm_name);
    const location = cleanText(req.body.location);
    const bio = cleanText(req.body.bio);
    const documentsNote = cleanText(req.body.documents_note);

    await query(
      `INSERT INTO farmer_profiles (farmer_id, farm_name, bio, location, documents_note, verification_status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')
       ON DUPLICATE KEY UPDATE farm_name = VALUES(farm_name), bio = VALUES(bio), location = VALUES(location), documents_note = VALUES(documents_note),
       verification_status = IF(verification_status = 'VERIFIED', 'VERIFIED', 'PENDING')`,
      [req.user.userId, farmName, bio, location, documentsNote],
    );

    res.json({ message: "Farmer profile saved. Admin verification may be required." });
  }),
);

router.get(
  "/farmer/products",
  requireRole("farmer"),
  asyncHandler(async (req, res) => {
    const products = await query("SELECT * FROM products WHERE farmer_id = ? ORDER BY product_id DESC", [req.user.userId]);
    res.json(products);
  }),
);

router.post(
  "/farmer/products",
  requireRole("farmer"),
  asyncHandler(async (req, res) => {
    const name = cleanText(req.body.name);
    const category = cleanText(req.body.category, "Crop");
    const description = cleanText(req.body.description);
    const location = cleanText(req.body.location);
    const price = positiveNumber(req.body.price_per_kg);
    const stock = positiveNumber(req.body.stock_kg);

    if (!name || !price || !stock) {
      return res.status(400).json({ message: "Product name, price, and stock are required" });
    }

    const result = await query(
      `INSERT INTO products (farmer_id, name, category, description, location, price_per_kg, stock_kg)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.userId, name, category, description, location, price, Math.floor(stock)],
    );

    res.status(201).json({ message: "Product submitted for admin approval", product_id: result.insertId });
  }),
);

router.put(
  "/farmer/products/:id",
  requireRole("farmer"),
  asyncHandler(async (req, res) => {
    const name = cleanText(req.body.name);
    const category = cleanText(req.body.category, "Crop");
    const description = cleanText(req.body.description);
    const location = cleanText(req.body.location);
    const price = positiveNumber(req.body.price_per_kg);
    const stock = positiveNumber(req.body.stock_kg);

    if (!name || !price || !stock) {
      return res.status(400).json({ message: "Product name, price, and stock are required" });
    }

    const result = await query(
      `UPDATE products
       SET name = ?, category = ?, description = ?, location = ?, price_per_kg = ?, stock_kg = ?, status = IF(status = 'APPROVED', 'PENDING', status)
       WHERE product_id = ? AND farmer_id = ?`,
      [name, category, description, location, price, Math.floor(stock), req.params.id, req.user.userId],
    );

    if (!result.affectedRows) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product updated" });
  }),
);

router.delete(
  "/farmer/products/:id",
  requireRole("farmer"),
  asyncHandler(async (req, res) => {
    const result = await query("UPDATE products SET status = 'INACTIVE' WHERE product_id = ? AND farmer_id = ?", [
      req.params.id,
      req.user.userId,
    ]);
    if (!result.affectedRows) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product removed from marketplace" });
  }),
);

router.get(
  "/farmer/orders",
  requireRole("farmer"),
  asyncHandler(async (req, res) => {
    const orders = await query(
      `SELECT o.*, c.cust_name AS customer_name, c.email AS customer_email, c.city AS customer_city
       FROM orders o
       LEFT JOIN custlogin c ON c.cust_id = o.customer_id
       WHERE o.farmer_id = ?
       ORDER BY o.order_id DESC`,
      [req.user.userId],
    );
    res.json(await attachItems(orders));
  }),
);

router.patch(
  "/farmer/orders/:id/status",
  requireRole("farmer"),
  asyncHandler(async (req, res) => {
    const nextStatus = cleanText(req.body.status).toLowerCase();
    if (!ORDER_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await loadOrder(req.params.id);
    if (!order || order.farmer_id !== req.user.userId) {
      return res.status(404).json({ message: "Order not found" });
    }

    await query("UPDATE orders SET status = ? WHERE order_id = ? AND farmer_id = ?", [
      nextStatus,
      req.params.id,
      req.user.userId,
    ]);

    await query(
      "INSERT INTO notifications (user_role, user_id, title, message) VALUES ('customer', ?, 'Order updated', ?)",
      [order.customer_id, `Order #${order.order_id} is now ${nextStatus}.`],
    );

    res.json({ message: "Order status updated" });
  }),
);

router.get(
  "/customer/profile",
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const [[profile]] = await pool.execute(
      `SELECT c.cust_id, c.cust_name, c.email, c.phone_no, c.state, c.city, c.address, c.pincode
       FROM custlogin c WHERE c.cust_id = ?`,
      [req.user.userId],
    );
    res.json(profile || {});
  }),
);

router.put(
  "/customer/profile",
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    await query(
      `INSERT INTO customer_profiles (customer_id, address, city, state, pincode)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE address = VALUES(address), city = VALUES(city), state = VALUES(state), pincode = VALUES(pincode)`,
      [
        req.user.userId,
        cleanText(req.body.address),
        cleanText(req.body.city),
        cleanText(req.body.state),
        cleanText(req.body.pincode),
      ],
    );
    res.json({ message: "Customer marketplace profile saved" });
  }),
);

router.post(
  "/customer/orders",
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ message: "Add at least one product to cart" });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const productIds = items.map((item) => Number(item.product_id)).filter(Number.isFinite);
      if (!productIds.length || productIds.length !== items.length) {
        await connection.rollback();
        return res.status(400).json({ message: "Each cart item needs a valid product" });
      }

      const [products] = await connection.query(
        `SELECT * FROM products WHERE product_id IN (${productIds.map(() => "?").join(",")}) AND status = 'APPROVED' FOR UPDATE`,
        productIds,
      );

      if (products.length !== productIds.length) {
        await connection.rollback();
        return res.status(400).json({ message: "One or more products are unavailable" });
      }

      const farmerIds = new Set(products.map((product) => product.farmer_id));
      if (farmerIds.size !== 1) {
        await connection.rollback();
        return res.status(400).json({ message: "One order can include products from one farmer only" });
      }

      let total = 0;
      const orderItems = [];
      for (const item of items) {
        const product = products.find((row) => row.product_id === Number(item.product_id));
        const quantity = positiveNumber(item.quantity_kg);
        if (!quantity || Math.floor(quantity) > Number(product.stock_kg)) {
          await connection.rollback();
          return res.status(400).json({ message: `Invalid stock quantity for ${product.name}` });
        }

        const roundedQuantity = Math.floor(quantity);
        const lineTotal = roundedQuantity * Number(product.price_per_kg);
        total += lineTotal;
        orderItems.push({ product, quantity: roundedQuantity, lineTotal });
      }

      const commissionPercent = await getCommissionPercentage(connection);
      const commission = Number((total * (commissionPercent / 100)).toFixed(2));
      const payout = Number((total - commission).toFixed(2));
      const farmerId = [...farmerIds][0];

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (customer_id, farmer_id, total_amount, platform_commission, farmer_payout)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.userId, farmerId, total, commission, payout],
      );
      const orderId = orderResult.insertId;

      for (const item of orderItems) {
        await connection.execute(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity_kg, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.product.product_id, item.product.name, item.quantity, item.product.price_per_kg, item.lineTotal],
        );
        await connection.execute("UPDATE products SET stock_kg = stock_kg - ? WHERE product_id = ?", [
          item.quantity,
          item.product.product_id,
        ]);
      }

      await connection.execute("INSERT INTO payments (order_id, amount, status) VALUES (?, ?, 'PENDING')", [
        orderId,
        total,
      ]);
      await connection.execute(
        "INSERT INTO chats (order_id, customer_id, farmer_id) VALUES (?, ?, ?)",
        [orderId, req.user.userId, farmerId],
      );
      await notify(connection, "farmer", farmerId, "New order placed", `Order #${orderId} is waiting for your response.`);
      await notify(connection, "customer", req.user.userId, "Order created", `Order #${orderId} has been created. Complete payment to proceed.`);

      await connection.commit();
      res.status(201).json({ message: "Order created", order_id: orderId, total_amount: total, platform_commission: commission, farmer_payout: payout });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.get(
  "/customer/orders",
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const orders = await query(
      `SELECT o.*, f.farmer_name, f.email AS farmer_email, fp.verification_status AS farmer_verification_status
       FROM orders o
       LEFT JOIN farmerlogin f ON f.farmer_id = o.farmer_id
       LEFT JOIN farmer_profiles fp ON fp.farmer_id = o.farmer_id
       WHERE o.customer_id = ?
       ORDER BY o.order_id DESC`,
      [req.user.userId],
    );
    res.json(await attachItems(orders));
  }),
);

router.post(
  "/customer/orders/:id/confirm-delivery",
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const order = await loadOrder(req.params.id);
    if (!order || order.customer_id !== req.user.userId) return res.status(404).json({ message: "Order not found" });
    if (!["shipped", "delivered"].includes(order.status)) {
      return res.status(400).json({ message: "Delivery can be confirmed after shipment" });
    }

    await query(
      "UPDATE orders SET status = 'delivered', delivery_confirmed_at = NOW(), payment_status = 'HELD' WHERE order_id = ? AND customer_id = ?",
      [req.params.id, req.user.userId],
    );
    await query("UPDATE payments SET status = 'HELD' WHERE order_id = ?", [req.params.id]);
    await query(
      `INSERT INTO payouts (order_id, farmer_id, amount, status)
       VALUES (?, ?, ?, 'PENDING')
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), status = IF(status = 'RELEASED', 'RELEASED', 'PENDING')`,
      [req.params.id, order.farmer_id, order.farmer_payout],
    );

    res.json({ message: "Delivery confirmed. Admin can now release farmer payout." });
  }),
);

router.post(
  "/payments/razorpay/create",
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const order = await loadOrder(req.body.order_id);
    if (!order || order.customer_id !== req.user.userId) return res.status(404).json({ message: "Order not found" });

    const data = await createRazorpayOrder({
      crop: `KrishiNova order #${order.order_id}`,
      quantity: 1,
      unitAmount: order.total_amount,
    });

    if (!data.configured) return res.status(400).json({ message: data.message || "Razorpay is unavailable" });

    await query("UPDATE payments SET provider_order_id = ?, status = 'PENDING' WHERE order_id = ?", [
      data.orderId,
      order.order_id,
    ]);

    res.json(data);
  }),
);

router.post(
  "/payments/razorpay/verify",
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: "Razorpay payment details are required" });
    }

    if (!verifyRazorpayPayment({ orderId, paymentId, signature })) {
      await query("UPDATE payments SET status = 'FAILED' WHERE provider_order_id = ?", [orderId]);
      return res.status(400).json({ message: "Razorpay payment verification failed" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[payment]] = await connection.execute("SELECT * FROM payments WHERE provider_order_id = ? FOR UPDATE", [orderId]);
      if (!payment) {
        await connection.rollback();
        return res.status(404).json({ message: "Payment record not found" });
      }

      const [[order]] = await connection.execute("SELECT * FROM orders WHERE order_id = ? FOR UPDATE", [payment.order_id]);
      if (!order || order.customer_id !== req.user.userId) {
        await connection.rollback();
        return res.status(403).json({ message: "Payment does not belong to this customer" });
      }

      await holdPaidOrder(connection, { order, payment, providerPaymentId: paymentId, rawResponse: req.body });

      await connection.commit();
      res.json({ verified: true, message: "Payment verified and held by platform", order_id: order.order_id });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.post(
  "/payments/test/mark-paid",
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    if (!isRazorpayTestMode()) {
      return res.status(403).json({ message: "Test payment completion is available only with Razorpay test keys" });
    }

    const orderId = Number(req.body.order_id);
    if (!Number.isInteger(orderId)) {
      return res.status(400).json({ message: "Valid order_id is required" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[order]] = await connection.execute("SELECT * FROM orders WHERE order_id = ? FOR UPDATE", [orderId]);
      if (!order || order.customer_id !== req.user.userId) {
        await connection.rollback();
        return res.status(404).json({ message: "Order not found" });
      }
      if (["HELD", "RELEASED"].includes(order.payment_status)) {
        await connection.rollback();
        return res.json({ message: "Payment is already secured for this order", order_id: order.order_id });
      }
      if (["REFUNDED", "FAILED"].includes(order.payment_status)) {
        await connection.rollback();
        return res.status(400).json({ message: `Order payment is ${order.payment_status}` });
      }

      const [[payment]] = await connection.execute("SELECT * FROM payments WHERE order_id = ? FOR UPDATE", [order.order_id]);
      if (!payment) {
        await connection.rollback();
        return res.status(404).json({ message: "Payment record not found" });
      }

      const providerOrderId = payment.provider_order_id || `order_test_${order.order_id}_${Date.now()}`;
      const providerPaymentId = `pay_test_${order.order_id}_${Date.now()}`;
      await connection.execute("UPDATE payments SET provider_order_id = ? WHERE payment_id = ?", [
        providerOrderId,
        payment.payment_id,
      ]);
      await holdPaidOrder(connection, {
        order,
        payment,
        providerPaymentId,
        rawResponse: { mode: "test", provider_order_id: providerOrderId, provider_payment_id: providerPaymentId },
      });

      await connection.commit();
      res.json({ message: "Test payment secured. Amount is now held by platform.", order_id: order.order_id });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.get(
  "/orders/:id/invoice",
  asyncHandler(async (req, res) => {
    const order = await loadOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const allowed =
      req.user.role === "admin" ||
      (req.user.role === "customer" && order.customer_id === req.user.userId) ||
      (req.user.role === "farmer" && order.farmer_id === req.user.userId);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const [rows] = await pool.execute("SELECT * FROM invoices WHERE order_id = ?", [req.params.id]);
    res.json(rows[0] || null);
  }),
);

router.post(
  "/orders/:id/review",
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const order = await loadOrder(req.params.id);
    if (!order || order.customer_id !== req.user.userId) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "delivered") return res.status(400).json({ message: "Review is allowed after delivery" });

    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    await query(
      `INSERT INTO reviews (order_id, product_id, farmer_id, customer_id, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
      [order.order_id, req.body.product_id || null, order.farmer_id, req.user.userId, rating, cleanText(req.body.comment)],
    );
    await query(
      `UPDATE farmer_profiles fp
       SET rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE farmer_id = ?)
       WHERE fp.farmer_id = ?`,
      [order.farmer_id, order.farmer_id],
    );

    res.json({ message: "Review submitted" });
  }),
);

router.post(
  "/orders/:id/dispute",
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const order = await loadOrder(req.params.id);
    if (!order || order.customer_id !== req.user.userId) return res.status(404).json({ message: "Order not found" });
    const reason = cleanText(req.body.reason);
    if (!reason) return res.status(400).json({ message: "Dispute reason is required" });

    await query(
      "INSERT INTO disputes (order_id, customer_id, farmer_id, reason, details) VALUES (?, ?, ?, ?, ?)",
      [order.order_id, req.user.userId, order.farmer_id, reason, cleanText(req.body.details)],
    );
    res.status(201).json({ message: "Dispute raised. Admin will review it." });
  }),
);

router.get(
  "/chats/order/:orderId",
  asyncHandler(async (req, res) => {
    const order = await loadOrder(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const allowed =
      req.user.role === "admin" ||
      (req.user.role === "customer" && order.customer_id === req.user.userId) ||
      (req.user.role === "farmer" && order.farmer_id === req.user.userId);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const [[chat]] = await pool.execute("SELECT * FROM chats WHERE order_id = ?", [req.params.orderId]);
    if (!chat) return res.json({ chat: null, messages: [] });

    const [messages] = await pool.execute("SELECT * FROM messages WHERE chat_id = ? ORDER BY message_id ASC", [
      chat.chat_id,
    ]);
    res.json({ chat, messages });
  }),
);

router.post(
  "/chats/order/:orderId/messages",
  asyncHandler(async (req, res) => {
    const order = await loadOrder(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const allowed =
      req.user.role === "admin" ||
      (req.user.role === "customer" && order.customer_id === req.user.userId) ||
      (req.user.role === "farmer" && order.farmer_id === req.user.userId);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const message = cleanText(req.body.message);
    if (!message) return res.status(400).json({ message: "Message cannot be empty" });

    const [[chat]] = await pool.execute("SELECT * FROM chats WHERE order_id = ?", [req.params.orderId]);
    if (!chat) return res.status(404).json({ message: "Chat is created after order placement" });

    await query("INSERT INTO messages (chat_id, sender_role, sender_id, message) VALUES (?, ?, ?, ?)", [
      chat.chat_id,
      req.user.role,
      req.user.userId,
      message,
    ]);
    res.status(201).json({ message: "Message sent" });
  }),
);

router.get(
  "/admin/overview",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const [[totals]] = await pool.execute(
      `SELECT
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders) AS total_revenue,
        (SELECT COALESCE(SUM(platform_commission), 0) FROM orders WHERE payment_status IN ('HELD','RELEASED')) AS total_commission,
        (SELECT COUNT(*) FROM farmerlogin) AS active_farmers,
        (SELECT COUNT(*) FROM custlogin) AS active_customers,
        (SELECT COUNT(*) FROM disputes WHERE status = 'OPEN') AS open_disputes`,
    );
    const [recentOrders] = await pool.execute(
      `SELECT o.*, c.cust_name AS customer_name, f.farmer_name
       FROM orders o
       LEFT JOIN custlogin c ON c.cust_id = o.customer_id
       LEFT JOIN farmerlogin f ON f.farmer_id = o.farmer_id
       ORDER BY o.order_id DESC LIMIT 10`,
    );
    res.json({ totals, recentOrders: await attachItems(recentOrders) });
  }),
);

router.get(
  "/admin/farmers",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT f.farmer_id, f.farmer_name, f.email, f.phone_no, f.F_State, f.F_District, f.F_Location,
              COALESCE(fp.verification_status, 'PENDING') AS verification_status, fp.farm_name, fp.rating,
              COALESCE(u.is_blocked, 0) AS is_blocked
       FROM farmerlogin f
       LEFT JOIN farmer_profiles fp ON fp.farmer_id = f.farmer_id
       LEFT JOIN users u ON u.legacy_id = f.farmer_id AND u.role = 'farmer'
       ORDER BY f.farmer_id DESC`,
    );
    res.json(rows);
  }),
);

router.get(
  "/admin/customers",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT c.cust_id, c.cust_name, c.email, c.phone_no, c.state, c.city, c.address, c.pincode,
              COALESCE(u.is_blocked, 0) AS is_blocked
       FROM custlogin c
       LEFT JOIN users u ON u.legacy_id = c.cust_id AND u.role = 'customer'
       ORDER BY c.cust_id DESC`,
    );
    res.json(rows);
  }),
);

router.get(
  "/admin/contact-messages",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const rows = await query(
      "SELECT c_id, c_name, c_mobile, c_email, c_address, c_message FROM contactus ORDER BY c_id DESC",
    );
    res.json(rows);
  }),
);

router.patch(
  "/admin/farmers/:id/verification",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const status = cleanText(req.body.status).toUpperCase();
    if (!["VERIFIED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ message: "Invalid verification status" });
    }
    await query(
      `INSERT INTO farmer_profiles (farmer_id, verification_status)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE verification_status = VALUES(verification_status)`,
      [req.params.id, status],
    );
    res.json({ message: `Farmer marked ${status}` });
  }),
);

router.get(
  "/admin/products",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT p.*, COALESCE(f.farmer_name, CONCAT('Missing farmer #', p.farmer_id)) AS farmer_name,
              COALESCE(fp.verification_status, 'PENDING') AS verification_status
       FROM products p
       LEFT JOIN farmerlogin f ON f.farmer_id = p.farmer_id
       LEFT JOIN farmer_profiles fp ON fp.farmer_id = p.farmer_id
       ORDER BY p.product_id DESC`,
    );
    res.json(rows);
  }),
);

router.patch(
  "/admin/products/:id/status",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const status = cleanText(req.body.status).toUpperCase();
    if (!["APPROVED", "REJECTED", "PENDING", "INACTIVE"].includes(status)) {
      return res.status(400).json({ message: "Invalid product status" });
    }
    const result = await query("UPDATE products SET status = ? WHERE product_id = ?", [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Product not found" });
    res.json({ message: `Product marked ${status}` });
  }),
);

router.patch(
  "/admin/products/:id/featured",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const featured = Boolean(req.body.is_featured);
    await query("UPDATE products SET is_featured = ? WHERE product_id = ?", [featured ? 1 : 0, req.params.id]);
    if (featured) {
      await query(
        `INSERT INTO featured_listings (product_id, title, active)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE active = 1, title = VALUES(title)`,
        [req.params.id, cleanText(req.body.title)],
      );
    } else {
      await query("UPDATE featured_listings SET active = 0 WHERE product_id = ?", [req.params.id]);
    }
    res.json({ message: featured ? "Listing featured" : "Listing removed from featured" });
  }),
);

router.get(
  "/admin/orders",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const orders = await query(
      `SELECT o.*, c.cust_name AS customer_name, f.farmer_name
       FROM orders o
       LEFT JOIN custlogin c ON c.cust_id = o.customer_id
       LEFT JOIN farmerlogin f ON f.farmer_id = o.farmer_id
       ORDER BY o.order_id DESC`,
    );
    res.json(await attachItems(orders));
  }),
);

router.get(
  "/admin/payments",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const rows = await query("SELECT * FROM payments ORDER BY payment_id DESC");
    res.json(rows);
  }),
);

router.get(
  "/admin/payouts",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const rows = await query("SELECT * FROM payouts ORDER BY payout_id DESC");
    res.json(rows);
  }),
);

router.post(
  "/admin/payouts/:id/release",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[payout]] = await connection.execute("SELECT * FROM payouts WHERE payout_id = ? FOR UPDATE", [req.params.id]);
      if (!payout) {
        await connection.rollback();
        return res.status(404).json({ message: "Payout not found" });
      }
      const [[order]] = await connection.execute("SELECT * FROM orders WHERE order_id = ? FOR UPDATE", [payout.order_id]);
      if (!order || order.status !== "delivered") {
        await connection.rollback();
        return res.status(400).json({ message: "Payout can be released after delivery confirmation" });
      }

      await connection.execute("UPDATE payouts SET status = 'RELEASED', released_at = NOW() WHERE payout_id = ?", [
        payout.payout_id,
      ]);
      await connection.execute("UPDATE payments SET status = 'RELEASED' WHERE order_id = ?", [payout.order_id]);
      await connection.execute("UPDATE orders SET payment_status = 'RELEASED' WHERE order_id = ?", [payout.order_id]);
      await notify(connection, "farmer", payout.farmer_id, "Payout released", `Payout for order #${payout.order_id} has been released.`);

      await connection.commit();
      res.json({ message: "Farmer payout released" });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.get(
  "/admin/disputes",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const rows = await query("SELECT * FROM disputes ORDER BY dispute_id DESC");
    res.json(rows);
  }),
);

router.patch(
  "/admin/disputes/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const status = cleanText(req.body.status).toUpperCase();
    if (!["OPEN", "VALID", "REJECTED", "REFUNDED", "CLOSED"].includes(status)) {
      return res.status(400).json({ message: "Invalid dispute status" });
    }
    await query("UPDATE disputes SET status = ?, admin_note = ? WHERE dispute_id = ?", [
      status,
      cleanText(req.body.admin_note),
      req.params.id,
    ]);

    if (status === "REFUNDED") {
      const [rows] = await pool.execute("SELECT * FROM disputes WHERE dispute_id = ?", [req.params.id]);
      const dispute = rows[0];
      if (dispute) {
        await query("UPDATE payments SET status = 'REFUNDED' WHERE order_id = ?", [dispute.order_id]);
        await query("UPDATE orders SET payment_status = 'REFUNDED', status = 'cancelled' WHERE order_id = ?", [dispute.order_id]);
        await query("UPDATE payouts SET status = 'REFUNDED' WHERE order_id = ?", [dispute.order_id]);
      }
    }

    res.json({ message: "Dispute updated" });
  }),
);

router.patch(
  "/admin/settings/commission",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const commission = Number(req.body.commission_percentage);
    if (!Number.isFinite(commission) || commission < 0 || commission > 50) {
      return res.status(400).json({ message: "Commission must be between 0 and 50 percent" });
    }
    await query(
      `INSERT INTO admin_settings (setting_key, setting_value)
       VALUES ('commission_percentage', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [String(commission)],
    );
    res.json({ message: "Commission percentage updated" });
  }),
);

router.patch(
  "/admin/users/:role/:id/block",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const role = cleanText(req.params.role);
    if (!["farmer", "customer"].includes(role)) return res.status(400).json({ message: "Invalid role" });
    await mirrorUser(role, req.params.id);
    await query("UPDATE users SET is_blocked = ? WHERE legacy_id = ? AND role = ?", [
      req.body.blocked ? 1 : 0,
      req.params.id,
      role,
    ]);
    res.json({ message: req.body.blocked ? "User blocked" : "User unblocked" });
  }),
);

export default router;
