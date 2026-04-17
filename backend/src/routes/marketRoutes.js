import { Router } from "express";
import pool, { query } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

function normalizeCartItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      crop: String(item?.crop || "").toLowerCase().trim(),
      quantity: Number(item?.quantity),
    }))
    .filter((item) => item.crop && Number.isFinite(item.quantity) && item.quantity > 0);
}

function createInvoiceNumber(invoiceId) {
  return `INV-${String(invoiceId).padStart(6, "0")}`;
}

router.get(
  "/crops",
  asyncHandler(async (_req, res) => {
    const crops = await query(
      `SELECT 
        p.crop,
        p.quantity,
        COALESCE(MAX(f.msp), 0) AS msp,
        COALESCE(MAX(f.costperkg), 0) AS marketPrice
      FROM production_approx p
      LEFT JOIN farmer_crops_trade f ON LOWER(f.Trade_crop) = LOWER(p.crop)
      WHERE p.quantity > 0
      GROUP BY p.crop, p.quantity
      ORDER BY p.quantity DESC, p.crop ASC`,
    );

    res.json(crops);
  }),
);

router.get(
  "/buy-crops",
  asyncHandler(async (_req, res) => {
    const crops = await query(
      `SELECT
        LOWER(Trade_crop) AS crop,
        SUM(Crop_quantity) AS quantity,
        COALESCE(MAX(msp), 0) AS msp,
        COALESCE(CEIL(AVG(costperkg)), 0) AS marketPrice
      FROM farmer_crops_trade
      WHERE TRIM(COALESCE(Trade_crop, '')) <> '' AND Crop_quantity > 0
      GROUP BY LOWER(Trade_crop)
      ORDER BY quantity DESC, crop ASC`,
    );

    res.json(crops);
  }),
);

router.get(
  "/average-price/:crop",
  asyncHandler(async (req, res) => {
    const rows = await query(
      "SELECT COALESCE(CEIL(AVG(costperkg)), 0) AS averagePrice FROM farmer_crops_trade WHERE LOWER(Trade_crop) = LOWER(?)",
      [req.params.crop],
    );
    res.json({ crop: req.params.crop, averagePrice: rows[0]?.averagePrice || 0 });
  }),
);

router.post(
  "/crops",
  requireAuth,
  requireRole("farmer"),
  asyncHandler(async (req, res) => {
    const { crop, quantity, costPerKg } = req.body;
    if (!crop || !quantity || !costPerKg) {
      return res.status(400).json({ message: "Crop, quantity, and price are required" });
    }

    const normalizedCrop = crop.toLowerCase().trim();
    const normalizedQuantity = Number(quantity);
    const normalizedCost = Number(costPerKg);

    if (!normalizedCrop) {
      return res.status(400).json({ message: "Crop is required" });
    }

    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    if (!Number.isFinite(normalizedCost) || normalizedCost <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    await query(
      "INSERT INTO farmer_crops_trade (farmer_fkid, Trade_crop, Crop_quantity, costperkg, msp) VALUES (?, ?, ?, ?, 0)",
      [
        req.user.userId,
        normalizedCrop,
        normalizedQuantity,
        normalizedCost,
      ],
    );

    const [priceStats] = await query(
      "SELECT COALESCE(CEIL(AVG(costperkg)), 0) AS averagePrice FROM farmer_crops_trade WHERE LOWER(Trade_crop) = LOWER(?)",
      [normalizedCrop],
    );
    const averagePrice = Number(priceStats?.averagePrice || 0);
    const msp = averagePrice + Math.ceil(averagePrice * 0.5);

    await query("UPDATE farmer_crops_trade SET msp = ? WHERE LOWER(Trade_crop) = LOWER(?)", [
      msp,
      normalizedCrop,
    ]);

    const existing = await query("SELECT crop FROM production_approx WHERE crop = ?", [normalizedCrop]);
    if (existing.length) {
      await query("UPDATE production_approx SET quantity = quantity + ? WHERE crop = ?", [
        normalizedQuantity,
        normalizedCrop,
      ]);
    } else {
      await query("INSERT INTO production_approx (crop, quantity) VALUES (?, ?)", [
        normalizedCrop,
        normalizedQuantity,
      ],
    );
    }

    res.status(201).json({
      message: "Crop listed successfully",
      crop: normalizedCrop,
      averagePrice,
      msp,
    });
  }),
);

router.post(
  "/purchase",
  requireAuth,
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const { crop, quantity } = req.body;
    if (!crop || !quantity) {
      return res.status(400).json({ message: "Crop and quantity are required" });
    }

    const normalizedCrop = crop.toLowerCase().trim();
    const requestedQuantity = Number(quantity);

    if (!normalizedCrop) {
      return res.status(400).json({ message: "Crop is required" });
    }

    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    const [stock] = await query("SELECT quantity FROM production_approx WHERE crop = ?", [normalizedCrop]);
    if (!stock || Number(stock.quantity) < requestedQuantity) {
      return res.status(400).json({ message: "Requested quantity is not available" });
    }

    const listings = await query(
      `SELECT trade_id, farmer_fkid, msp, Crop_quantity
       FROM farmer_crops_trade
       WHERE LOWER(Trade_crop) = LOWER(?) AND Crop_quantity > 0
       ORDER BY trade_id ASC`,
      [normalizedCrop],
    );

    let remainingQuantity = requestedQuantity;

    for (const listing of listings) {
      if (remainingQuantity <= 0) {
        break;
      }

      const availableQuantity = Number(listing.Crop_quantity || 0);
      if (availableQuantity <= 0) {
        continue;
      }

      const fulfilledQuantity = Math.min(availableQuantity, remainingQuantity);

      await query(
        "INSERT INTO farmer_history (farmer_id, farmer_crop, farmer_quantity, farmer_price, date) VALUES (?, ?, ?, ?, ?)",
        [
          listing.farmer_fkid,
          normalizedCrop,
          fulfilledQuantity,
          fulfilledQuantity * Number(listing.msp || 0),
          new Date().toLocaleDateString("en-GB"),
        ],
      );

      await query(
        "UPDATE farmer_crops_trade SET Crop_quantity = GREATEST(Crop_quantity - ?, 0) WHERE trade_id = ?",
        [fulfilledQuantity, listing.trade_id],
      );

      remainingQuantity -= fulfilledQuantity;
    }

    if (remainingQuantity > 0) {
      return res.status(400).json({ message: "Requested quantity is not available in trade listings" });
    }

    await query("UPDATE production_approx SET quantity = quantity - ? WHERE crop = ?", [
      requestedQuantity,
      normalizedCrop,
    ]);

    res.json({ message: "Purchase completed successfully" });
  }),
);

router.post(
  "/checkout",
  requireAuth,
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const items = normalizeCartItems(req.body.items);
    const paymentMethod = String(req.body.paymentMethod || "Cash").trim();
    const paymentReference = String(req.body.paymentReference || "").trim() || null;

    if (!items.length) {
      return res.status(400).json({ message: "At least one cart item is required" });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [customerRows] = await connection.execute(
        "SELECT cust_id, cust_name, email, phone_no, state, city, address, pincode FROM custlogin WHERE cust_id = ? FOR UPDATE",
        [req.user.userId],
      );
      const customer = customerRows[0];

      if (!customer) {
        await connection.rollback();
        return res.status(404).json({ message: "Customer not found" });
      }

      const invoiceItems = [];
      let subtotal = 0;

      for (const item of items) {
        const [stockRows] = await connection.execute(
          "SELECT quantity FROM production_approx WHERE LOWER(crop) = LOWER(?) FOR UPDATE",
          [item.crop],
        );
        const stock = stockRows[0];

        if (!stock || Number(stock.quantity) < item.quantity) {
          await connection.rollback();
          return res.status(400).json({ message: `Requested quantity is not available for ${item.crop}` });
        }

        const [listingRows] = await connection.execute(
          `SELECT trade_id, farmer_fkid, msp, Crop_quantity
           FROM farmer_crops_trade
           WHERE LOWER(Trade_crop) = LOWER(?) AND Crop_quantity > 0
           ORDER BY trade_id ASC
           FOR UPDATE`,
          [item.crop],
        );

        let remainingQuantity = item.quantity;
        let lineTotal = 0;
        let weightedUnitPrice = 0;

        for (const listing of listingRows) {
          if (remainingQuantity <= 0) {
            break;
          }

          const availableQuantity = Number(listing.Crop_quantity || 0);
          if (availableQuantity <= 0) {
            continue;
          }

          const fulfilledQuantity = Math.min(availableQuantity, remainingQuantity);
          const unitPrice = Number(listing.msp || 0);
          lineTotal += fulfilledQuantity * unitPrice;
          weightedUnitPrice = unitPrice;

          await connection.execute(
            "INSERT INTO farmer_history (farmer_id, farmer_crop, farmer_quantity, farmer_price, date) VALUES (?, ?, ?, ?, ?)",
            [
              listing.farmer_fkid,
              item.crop,
              fulfilledQuantity,
              fulfilledQuantity * unitPrice,
              new Date().toLocaleDateString("en-GB"),
            ],
          );

          await connection.execute(
            "UPDATE farmer_crops_trade SET Crop_quantity = GREATEST(Crop_quantity - ?, 0) WHERE trade_id = ?",
            [fulfilledQuantity, listing.trade_id],
          );

          remainingQuantity -= fulfilledQuantity;
        }

        if (remainingQuantity > 0) {
          await connection.rollback();
          return res.status(400).json({ message: `Trade listings are not available for ${item.crop}` });
        }

        await connection.execute(
          "UPDATE production_approx SET quantity = quantity - ? WHERE LOWER(crop) = LOWER(?)",
          [item.quantity, item.crop],
        );

        invoiceItems.push({
          crop: item.crop,
          quantity: item.quantity,
          unitPrice: lineTotal / item.quantity || weightedUnitPrice,
          lineTotal,
        });
        subtotal += lineTotal;
      }

      const [invoiceResult] = await connection.execute(
        `INSERT INTO customer_invoices
         (invoice_number, customer_id, customer_name, customer_email, customer_phone, customer_state, customer_city, customer_address, customer_pincode, payment_method, payment_reference, subtotal, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `PENDING-${Date.now()}`,
          customer.cust_id,
          customer.cust_name,
          customer.email,
          customer.phone_no,
          customer.state,
          customer.city,
          customer.address,
          customer.pincode,
          paymentMethod,
          paymentReference,
          subtotal,
          subtotal,
        ],
      );

      const invoiceId = invoiceResult.insertId;
      const invoiceNumber = createInvoiceNumber(invoiceId);

      await connection.execute(
        "UPDATE customer_invoices SET invoice_number = ? WHERE invoice_id = ?",
        [invoiceNumber, invoiceId],
      );

      for (const item of invoiceItems) {
        await connection.execute(
          `INSERT INTO customer_invoice_items
           (invoice_id, crop_name, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?)`,
          [invoiceId, item.crop, item.quantity, item.unitPrice, item.lineTotal],
        );
      }

      await connection.commit();

      res.json({
        message: "Checkout completed successfully",
        invoiceId,
        invoiceNumber,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

router.get(
  "/invoices",
  requireAuth,
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const invoices = await query(
      `SELECT invoice_id, invoice_number, payment_method, payment_reference, subtotal, total, purchased_at
       FROM customer_invoices
       WHERE customer_id = ?
       ORDER BY invoice_id DESC`,
      [req.user.userId],
    );

    res.json(invoices);
  }),
);

router.get(
  "/invoices/:id",
  requireAuth,
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const [invoice] = await query(
      `SELECT invoice_id, invoice_number, customer_id, customer_name, customer_email, customer_phone,
              customer_state, customer_city, customer_address, customer_pincode, payment_method,
              payment_reference, subtotal, total, purchased_at
       FROM customer_invoices
       WHERE invoice_id = ? AND customer_id = ?`,
      [req.params.id, req.user.userId],
    );

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const items = await query(
      `SELECT item_id, crop_name, quantity, unit_price, line_total
       FROM customer_invoice_items
       WHERE invoice_id = ?
       ORDER BY item_id ASC`,
      [req.params.id],
    );

    res.json({ invoice, items });
  }),
);

export default router;
