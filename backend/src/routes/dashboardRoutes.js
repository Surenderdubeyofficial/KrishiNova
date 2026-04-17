import { Router } from "express";
import { query } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/farmer",
  requireAuth,
  requireRole("farmer"),
  asyncHandler(async (req, res) => {
    const [profile] = await query(
      "SELECT farmer_id, farmer_name, email, phone_no, F_gender, F_birthday, F_State, F_District, F_Location FROM farmerlogin WHERE farmer_id = ?",
      [req.user.userId],
    );
    const listedCrops = await query(
      "SELECT trade_id, Trade_crop, Crop_quantity, costperkg, msp FROM farmer_crops_trade WHERE farmer_fkid = ? ORDER BY trade_id DESC",
      [req.user.userId],
    );
    const [historySummary] = await query(
      "SELECT COUNT(*) AS orders, COALESCE(SUM(farmer_price), 0) AS revenue FROM farmer_history WHERE farmer_id = ?",
      [req.user.userId],
    );
    const historyRows = await query(
      "SELECT History_id, farmer_crop, farmer_quantity, farmer_price, date FROM farmer_history WHERE farmer_id = ? ORDER BY History_id DESC",
      [req.user.userId],
    );
    const topSelling = await query(
      "SELECT farmer_crop, COUNT(*) AS orders, COALESCE(SUM(farmer_quantity), 0) AS quantity FROM farmer_history WHERE farmer_id = ? GROUP BY farmer_crop ORDER BY quantity DESC LIMIT 5",
      [req.user.userId],
    );
    const [listingSummary] = await query(
      "SELECT COALESCE(SUM(Crop_quantity), 0) AS totalQuantity, COALESCE(AVG(costperkg), 0) AS averagePrice FROM farmer_crops_trade WHERE farmer_fkid = ?",
      [req.user.userId],
    );

    res.json({ profile, listedCrops, historySummary, topSelling, listingSummary, historyRows });
  }),
);

router.get(
  "/customer",
  requireAuth,
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const [profile] = await query(
      "SELECT cust_id, cust_name, email, address, city, pincode, state, phone_no FROM custlogin WHERE cust_id = ?",
      [req.user.userId],
    );
    const [marketSummary] = await query(
      "SELECT COUNT(*) AS activeListings, COALESCE(SUM(quantity), 0) AS totalStock FROM production_approx WHERE quantity > 0",
    );
    const featuredDeals = await query(
      `SELECT p.crop, p.quantity, COALESCE(MAX(f.msp), 0) AS msp
       FROM production_approx p
       LEFT JOIN farmer_crops_trade f ON LOWER(f.Trade_crop) = LOWER(p.crop)
       WHERE p.quantity > 0
       GROUP BY p.crop, p.quantity
       ORDER BY msp ASC, p.quantity DESC
       LIMIT 6`,
    );

    res.json({ profile, marketSummary, featuredDeals });
  }),
);

router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const [farmers] = await query("SELECT COUNT(*) AS total FROM farmerlogin");
    const [customers] = await query("SELECT COUNT(*) AS total FROM custlogin");
    const [messages] = await query("SELECT COUNT(*) AS total FROM contactus");
    const [trades] = await query("SELECT COUNT(*) AS total FROM farmer_crops_trade");
    const recentMessages = await query(
      "SELECT c_id, c_name, c_email, c_message FROM contactus ORDER BY c_id DESC LIMIT 5",
    );
    const topCrops = await query(
      "SELECT Trade_crop, SUM(Crop_quantity) AS quantity, MAX(msp) AS msp FROM farmer_crops_trade GROUP BY Trade_crop ORDER BY quantity DESC LIMIT 6",
    );
    const marketTotals = await query(
      "SELECT crop, quantity FROM production_approx WHERE quantity > 0 ORDER BY quantity DESC LIMIT 6",
    );

    res.json({
      totals: {
        farmers: farmers.total,
        customers: customers.total,
        messages: messages.total,
        trades: trades.total,
      },
      recentMessages,
      topCrops,
      marketTotals,
    });
  }),
);

export default router;
