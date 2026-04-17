import { Router } from "express";
import { query } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendContactEmail } from "../services/mailService.js";

const router = Router();

router.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [farmers] = await query("SELECT COUNT(*) AS total FROM farmerlogin");
    const [customers] = await query("SELECT COUNT(*) AS total FROM custlogin");
    const [crops] = await query(
      "SELECT COUNT(*) AS total, COALESCE(SUM(quantity), 0) AS stock FROM production_approx",
    );
    const featuredCrops = await query(
      `SELECT Trade_crop AS crop, SUM(Crop_quantity) AS quantity, MAX(msp) AS msp
       FROM farmer_crops_trade
       WHERE TRIM(COALESCE(Trade_crop, '')) <> '' AND Crop_quantity > 0
       GROUP BY Trade_crop
       ORDER BY quantity DESC
       LIMIT 6`,
    );

    res.json({
      stats: {
        farmers: farmers.total,
        customers: customers.total,
        listedCrops: crops.total,
        marketStock: crops.stock,
      },
      featuredCrops,
    });
  }),
);

router.get(
  "/states",
  asyncHandler(async (_req, res) => {
    const states = await query("SELECT StCode, StateName FROM state ORDER BY StateName");
    res.json(states);
  }),
);

router.get(
  "/districts/:stateCode",
  asyncHandler(async (req, res) => {
    const districts = await query(
      "SELECT DistCode, DistrictName FROM district WHERE StCode = ? ORDER BY DistrictName",
      [req.params.stateCode],
    );
    res.json(districts);
  }),
);

router.post(
  "/contact",
  asyncHandler(async (req, res) => {
    const { name, mobile, email, address, message } = req.body;

    if (!name || !mobile || !email || !address || !message) {
      return res.status(400).json({ message: "All contact fields are required" });
    }

    await query(
      "INSERT INTO contactus (c_name, c_mobile, c_email, c_address, c_message) VALUES (?, ?, ?, ?, ?)",
      [name, mobile, email, address, message],
    );

    let mailResult;
    try {
      mailResult = await sendContactEmail({ name, mobile, email, address, message });
    } catch (error) {
      console.error("Contact email failed:", error);
      mailResult = {
        delivered: false,
        reason: "Message saved, but email delivery failed",
      };
    }

    res.status(201).json({
      message: "Message sent successfully",
      emailDelivered: mailResult.delivered,
      emailNote: mailResult.reason || null,
    });
  }),
);

export default router;
