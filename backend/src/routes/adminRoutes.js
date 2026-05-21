import { Router } from "express";
import { query } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { withAdminContact } from "../services/adminContact.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hashPassword } from "../utils/passwords.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get(
  "/admins",
  asyncHandler(async (_req, res) => {
    const rows = await query(
      "SELECT admin_id, admin_name FROM admin ORDER BY admin_id DESC",
    );
    res.json(rows.map(withAdminContact));
  }),
);

router.post(
  "/admins",
  asyncHandler(async (req, res) => {
    const adminName = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (!adminName) {
      return res.status(400).json({ message: "Admin username is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Admin password must be at least 6 characters" });
    }

    const [existing] = await query(
      "SELECT admin_id FROM admin WHERE admin_name = ?",
      [adminName],
    );

    if (existing) {
      return res.status(409).json({ message: "Admin username already exists" });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      "INSERT INTO admin (admin_name, admin_password) VALUES (?, ?)",
      [adminName, passwordHash],
    );

    res.status(201).json({
      message: "Admin added successfully",
      admin: {
        ...withAdminContact({
          admin_id: result.insertId,
          admin_name: adminName,
        }),
      },
    });
  }),
);

router.delete(
  "/admins/:id",
  asyncHandler(async (req, res) => {
    const adminId = Number(req.params.id);
    if (!Number.isInteger(adminId) || adminId <= 0) {
      return res.status(400).json({ message: "Valid admin ID is required" });
    }

    if (adminId === Number(req.user.userId)) {
      return res.status(400).json({ message: "You cannot remove your own active admin account" });
    }

    const [summary] = await query("SELECT COUNT(*) AS total FROM admin");
    if (Number(summary.total || 0) <= 1) {
      return res.status(400).json({ message: "At least one admin account must remain" });
    }

    const result = await query("DELETE FROM admin WHERE admin_id = ?", [adminId]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ message: "Admin removed successfully" });
  }),
);

router.get(
  "/farmers",
  asyncHandler(async (_req, res) => {
    const rows = await query(
      "SELECT farmer_id, farmer_name, F_gender, email, phone_no, F_birthday, F_State, F_District, F_Location FROM farmerlogin ORDER BY farmer_id DESC",
    );
    res.json(rows);
  }),
);

router.get(
  "/customers",
  asyncHandler(async (_req, res) => {
    const rows = await query(
      "SELECT cust_id, cust_name, email, phone_no, state, city, address, pincode FROM custlogin ORDER BY cust_id DESC",
    );
    res.json(rows);
  }),
);

router.get(
  "/messages",
  asyncHandler(async (_req, res) => {
    const rows = await query(
      "SELECT c_id, c_name, c_mobile, c_email, c_address, c_message FROM contactus ORDER BY c_id DESC",
    );
    res.json(rows);
  }),
);

router.delete(
  "/farmers/:id",
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM farmerlogin WHERE farmer_id = ?", [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    res.json({ message: "Farmer deleted successfully" });
  }),
);

router.delete(
  "/customers/:id",
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM custlogin WHERE cust_id = ?", [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer deleted successfully" });
  }),
);

router.delete(
  "/messages/:id",
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM contactus WHERE c_id = ?", [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Message deleted successfully" });
  }),
);

export default router;
