import { Router } from "express";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyGoogleCredential } from "../services/googleAuthService.js";
import { sendOtpEmail } from "../services/mailService.js";
import { normalizePhoneNumber, sendPhoneOtp, verifyPhoneOtp } from "../services/phoneOtpService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hashPassword, verifyPassword } from "../utils/passwords.js";

const router = Router();
const PENDING_VALUE = "__PENDING__";
const PENDING_EMAIL_DOMAIN = "pending.local";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[6-9]\d{9}$/;

const roleConfig = {
  farmer: {
    table: "farmerlogin",
    id: "farmer_id",
    name: "farmer_name",
    profile: ({ body, stateName }) => [
      body.name,
      body.passwordHash,
      body.email,
      body.mobile,
      body.gender,
      body.dob,
      stateName,
      body.district,
      body.city,
      0,
    ],
    insertSql:
      "INSERT INTO farmerlogin (farmer_name, password, email, phone_no, F_gender, F_birthday, F_State, F_District, F_Location, otp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  },
  customer: {
    table: "custlogin",
    id: "cust_id",
    name: "cust_name",
    profile: ({ body, stateName }) => [
      body.name,
      body.passwordHash,
      body.email,
      body.address,
      body.city,
      body.pincode,
      stateName,
      body.mobile,
      0,
    ],
    insertSql:
      "INSERT INTO custlogin (cust_name, password, email, address, city, pincode, state, phone_no, otp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  },
  admin: {
    table: "admin",
    id: "admin_id",
    name: "admin_name",
  },
};

function isPendingValue(value) {
  return !String(value || "").trim() || String(value).trim() === PENDING_VALUE;
}

function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || "").trim());
}

function normalizeIndianMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
}

function isValidIndianMobile(value) {
  return PHONE_PATTERN.test(normalizeIndianMobile(value));
}

function isPlaceholderEmail(email) {
  return String(email || "").trim().toLowerCase().endsWith(`@${PENDING_EMAIL_DOMAIN}`);
}

function isProfileComplete(role, profile) {
  if (!profile) return false;

  if (role === "farmer") {
    return ![
      profile.farmer_name,
      profile.email,
      profile.phone_no,
      profile.F_gender,
      profile.F_birthday,
      profile.F_State,
      profile.F_District,
      profile.F_Location,
    ].some(isPendingValue) && !isPlaceholderEmail(profile.email);
  }

  if (role === "customer") {
    return ![
      profile.cust_name,
      profile.email,
      profile.phone_no,
      profile.state,
      profile.city,
      profile.address,
      profile.pincode,
    ].some(isPendingValue) && !isPlaceholderEmail(profile.email);
  }

  return true;
}

function sanitizeAuthUser(role, profile) {
  if (role === "farmer") {
    return {
      id: profile.id ?? profile.farmer_id,
      role,
      name: profile.name ?? profile.farmer_name,
      email: profile.email,
      mobile: profile.phone_no || "",
      profileComplete: isProfileComplete(role, profile),
    };
  }

  if (role === "customer") {
    return {
      id: profile.id ?? profile.cust_id,
      role,
      name: profile.name ?? profile.cust_name,
      email: profile.email,
      mobile: profile.phone_no || "",
      profileComplete: isProfileComplete(role, profile),
    };
  }

  return {
    id: profile.id ?? profile.admin_id,
    role: "admin",
    name: profile.name ?? profile.admin_name,
    profileComplete: true,
  };
}

async function loadUserProfile(role, userId) {
  if (role === "farmer") {
    const [user] = await query(
      "SELECT farmer_id, farmer_name, email, phone_no, F_gender, F_birthday, F_State, F_District, F_Location FROM farmerlogin WHERE farmer_id = ?",
      [userId],
    );
    return user || null;
  }

  if (role === "customer") {
    const [user] = await query(
      "SELECT cust_id, cust_name, email, phone_no, state, city, address, pincode FROM custlogin WHERE cust_id = ?",
      [userId],
    );
    return user || null;
  }

  const [admin] = await query("SELECT admin_id, admin_name FROM admin WHERE admin_id = ?", [userId]);
  return admin || null;
}

async function ensureUniqueEmail(role, email, excludeUserId = null) {
  const config = roleConfig[role];
  const sql =
    excludeUserId == null
      ? `SELECT ${config.id} AS id FROM ${config.table} WHERE email = ?`
      : `SELECT ${config.id} AS id FROM ${config.table} WHERE email = ? AND ${config.id} <> ?`;
  const values = excludeUserId == null ? [email] : [email, excludeUserId];
  const rows = await query(sql, values);
  return rows.length === 0;
}

async function createQuickAccount(role, { email, mobile, name }) {
  const config = roleConfig[role];
  const passwordHash = await hashPassword(`quick-${role}-${Date.now()}-${Math.random()}`);

  if (role === "farmer") {
    const safeEmail = email || `farmer.${Date.now()}.${Math.floor(Math.random() * 10000)}@${PENDING_EMAIL_DOMAIN}`;
    const result = await query(config.insertSql, [
      name || PENDING_VALUE,
      passwordHash,
      safeEmail,
      mobile || PENDING_VALUE,
      PENDING_VALUE,
      PENDING_VALUE,
      PENDING_VALUE,
      PENDING_VALUE,
      PENDING_VALUE,
      0,
    ]);
    return result.insertId;
  }

  const safeEmail = email || `customer.${Date.now()}.${Math.floor(Math.random() * 10000)}@${PENDING_EMAIL_DOMAIN}`;
  const result = await query(config.insertSql, [
    name || PENDING_VALUE,
    passwordHash,
    safeEmail,
    PENDING_VALUE,
    PENDING_VALUE,
    PENDING_VALUE,
    PENDING_VALUE,
    mobile || PENDING_VALUE,
    0,
  ]);
  return result.insertId;
}

async function recordLoginEvent({ role, userId, userName, identifier = null, method }) {
  await query(
    `INSERT INTO user_login_history (user_role, user_id, user_name, identifier, login_method)
     VALUES (?, ?, ?, ?, ?)`,
    [role, userId, userName || role, identifier, method],
  );
}

function createToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || "change-this-secret", {
    expiresIn: "7d",
  });
}

function createPendingOtpToken(payload) {
  return jwt.sign(
    { ...payload, type: "pending_otp" },
    process.env.JWT_SECRET || "change-this-secret",
    { expiresIn: "15m" },
  );
}

function createPendingPhoneOtpToken(payload) {
  return jwt.sign(
    { ...payload, type: "pending_phone_otp" },
    process.env.JWT_SECRET || "change-this-secret",
    { expiresIn: "15m" },
  );
}

async function issueOtp({ role, email, userId, table, idColumn }) {
  const otp = String(Math.floor(10000 + Math.random() * 90000));
  await query(`UPDATE ${table} SET otp = ? WHERE ${idColumn} = ?`, [otp, userId]);

  const mailResult = await sendOtpEmail({ email, otp, role });
  if (!mailResult.delivered) {
    return {
      ok: false,
      reason: mailResult.reason || "OTP email could not be delivered",
    };
  }

  return {
    ok: true,
    otpToken: createPendingOtpToken({ role, userId }),
  };
}

async function findUserByPhone(role, phoneNumber) {
  const config = roleConfig[role];
  if (!config || role === "admin") {
    return null;
  }

  const raw = String(phoneNumber || "").trim();
  const digits = raw.replace(/\D/g, "");
  const candidates = [raw];

  if (digits) {
    candidates.push(digits);
  }

  if (digits.length === 10) {
    candidates.push(`+91${digits}`);
  }

  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

  const users = await query(
    `SELECT ${config.id} AS id, ${config.name} AS name, email, phone_no
     FROM ${config.table}
     WHERE phone_no IN (${uniqueCandidates.map(() => "?").join(", ")})`,
    uniqueCandidates,
  );

  return users[0] || null;
}

function validateRegistration(role, body) {
  const common = [];

  if (!body.name?.trim()) common.push("Name is required");
  if (!body.email?.trim()) common.push("Email is required");
  if (body.email?.trim() && !isValidEmail(body.email)) common.push("Enter a valid email address");
  if (!body.password?.trim() || body.password.length < 6) common.push("Password must be at least 6 characters");
  if (!body.stateCode) common.push("State is required");

  if (role === "farmer") {
    if (!body.mobile?.trim()) common.push("Mobile is required");
    if (body.mobile?.trim() && !isValidIndianMobile(body.mobile)) common.push("Enter a valid 10-digit mobile number");
    if (!body.district?.trim()) common.push("District is required");
    if (!body.city?.trim()) common.push("Location is required");
  }

  if (role === "customer") {
    if (!body.mobile?.trim()) common.push("Mobile is required");
    if (body.mobile?.trim() && !isValidIndianMobile(body.mobile)) common.push("Enter a valid 10-digit mobile number");
    if (!body.address?.trim()) common.push("Address is required");
    if (!body.city?.trim()) common.push("City is required");
    if (!body.pincode?.trim()) common.push("Pincode is required");
  }

  return common;
}

router.post(
  "/register/:role",
  asyncHandler(async (req, res) => {
    const config = roleConfig[req.params.role];

    if (!config || req.params.role === "admin") {
      return res.status(400).json({ message: "Unsupported registration role" });
    }

    const errors = validateRegistration(req.params.role, req.body);
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors });
    }

    const { email, password, name, stateCode } = req.body;
    const normalizedMobile = req.body.mobile ? normalizeIndianMobile(req.body.mobile) : "";
    const existing = await query(`SELECT ${config.id} FROM ${config.table} WHERE email = ?`, [email]);
    if (existing.length) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const [state] = await query("SELECT StateName FROM state WHERE StCode = ?", [stateCode]);
    if (!state) {
      return res.status(400).json({ message: "Invalid state selected" });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      config.insertSql,
      config.profile({ body: { ...req.body, mobile: normalizedMobile, passwordHash }, stateName: state.StateName }),
    );
    const userId = result.insertId;

    const otpResult = await issueOtp({
      role: req.params.role,
      email,
      userId,
      table: config.table,
      idColumn: config.id,
    });

    if (!otpResult.ok) {
      return res.status(500).json({ message: otpResult.reason });
    }

    res.status(201).json({
      requiresOtp: true,
      otpToken: otpResult.otpToken,
      user: { id: userId, role: req.params.role, name, email },
      message: "OTP sent to your email. Verify it to continue.",
    });
  }),
);

router.post(
  "/login/:role",
  asyncHandler(async (req, res) => {
    const config = roleConfig[req.params.role];
    if (!config) {
      return res.status(400).json({ message: "Unsupported login role" });
    }

    const { email, password, username } = req.body;
    if (req.params.role === "admin") {
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const [admin] = await query("SELECT admin_id, admin_name, admin_password FROM admin WHERE admin_name = ?", [
        username,
      ]);
      if (!admin || !(await verifyPassword(password, admin.admin_password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      await recordLoginEvent({
        role: "admin",
        userId: admin.admin_id,
        userName: admin.admin_name,
        identifier: admin.admin_name,
        method: "password",
      });

      return res.json({
        token: createToken({ role: "admin", userId: admin.admin_id }),
        user: sanitizeAuthUser("admin", admin),
      });
    } else {
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Enter a valid email address" });
      }

      const [user] = await query(
        `SELECT ${config.id} AS id, ${config.name} AS name, email, password FROM ${config.table} WHERE email = ?`,
        [email],
      );
      if (!user || !(await verifyPassword(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const otpResult = await issueOtp({
        role: req.params.role,
        email: user.email,
        userId: user.id,
        table: config.table,
        idColumn: config.id,
      });

      if (!otpResult.ok) {
        return res.status(500).json({ message: otpResult.reason });
      }

      return res.json({
        requiresOtp: true,
        otpToken: otpResult.otpToken,
        user: sanitizeAuthUser(req.params.role, user),
        message: "OTP sent to your email. Verify it to continue.",
      });
    }
  }),
);

router.post(
  "/verify-otp",
  asyncHandler(async (req, res) => {
    const { otpToken, otp } = req.body;
    if (!otpToken || !otp) {
      return res.status(400).json({ message: "OTP token and OTP are required" });
    }

    let payload;
    try {
      payload = jwt.verify(otpToken, process.env.JWT_SECRET || "change-this-secret");
    } catch {
      return res.status(401).json({ message: "OTP session expired. Please login again." });
    }

    if (payload.type !== "pending_otp") {
      return res.status(400).json({ message: "Invalid OTP session" });
    }

    const config = roleConfig[payload.role];
    if (!config || payload.role === "admin") {
      return res.status(400).json({ message: "OTP verification is not supported for this role" });
    }

    const [user] = await query(
      `SELECT ${config.id} AS id, ${config.name} AS name, email, otp FROM ${config.table} WHERE ${config.id} = ?`,
      [payload.userId],
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (String(user.otp || "") !== String(otp).trim()) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    await query(`UPDATE ${config.table} SET otp = 0 WHERE ${config.id} = ?`, [payload.userId]);

    const fullProfile = await loadUserProfile(payload.role, payload.userId);

    await recordLoginEvent({
      role: payload.role,
      userId: payload.userId,
      userName: fullProfile?.farmer_name || fullProfile?.cust_name || user.name,
      identifier: fullProfile?.email || user.email,
      method: "email_otp",
    });

    return res.json({
      token: createToken({ role: payload.role, userId: payload.userId }),
      user: sanitizeAuthUser(payload.role, fullProfile || user),
    });
  }),
);

router.post(
  "/resend-otp",
  asyncHandler(async (req, res) => {
    const { otpToken } = req.body;
    if (!otpToken) {
      return res.status(400).json({ message: "OTP token is required" });
    }

    let payload;
    try {
      payload = jwt.verify(otpToken, process.env.JWT_SECRET || "change-this-secret");
    } catch {
      return res.status(401).json({ message: "OTP session expired. Please login again." });
    }

    if (payload.type !== "pending_otp") {
      return res.status(400).json({ message: "Invalid OTP session" });
    }

    const config = roleConfig[payload.role];
    if (!config || payload.role === "admin") {
      return res.status(400).json({ message: "OTP resend is not supported for this role" });
    }

    const [user] = await query(
      `SELECT ${config.id} AS id, ${config.name} AS name, email FROM ${config.table} WHERE ${config.id} = ?`,
      [payload.userId],
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otpResult = await issueOtp({
      role: payload.role,
      email: user.email,
      userId: user.id,
      table: config.table,
      idColumn: config.id,
    });

    if (!otpResult.ok) {
      return res.status(500).json({ message: otpResult.reason });
    }

    return res.json({
      requiresOtp: true,
      otpToken: otpResult.otpToken,
      user: sanitizeAuthUser(payload.role, user),
      message: "OTP sent again to your email.",
    });
  }),
);

router.post(
  "/phone/start/:role",
  asyncHandler(async (req, res) => {
    const role = req.params.role;
    const phoneNumber = String(req.body?.mobile || "").trim();
    const mode = req.body?.mode === "register" ? "register" : "login";

    if (!["farmer", "customer"].includes(role)) {
      return res.status(400).json({ message: "Phone OTP is only supported for farmer and customer roles" });
    }

    if (!phoneNumber) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    if (!isValidIndianMobile(phoneNumber)) {
      return res.status(400).json({ message: "Enter a valid 10-digit mobile number" });
    }

    let user = await findUserByPhone(role, phoneNumber);
    if (!user && mode !== "register") {
      return res.status(404).json({ message: "No account found for this mobile number" });
    }

    if (!user && mode === "register") {
      const userId = await createQuickAccount(role, {
        mobile: normalizePhoneNumber(phoneNumber),
        name: role === "farmer" ? "New Farmer" : "New Customer",
      });
      user = await findUserByPhone(role, phoneNumber);
      if (!user || user.id !== userId) {
        return res.status(500).json({ message: "Phone signup could not be created" });
      }
    }

    const phoneResult = await sendPhoneOtp({ phoneNumber });
    if (!phoneResult.sent) {
      return res.status(500).json({ message: phoneResult.reason });
    }

    return res.json({
      requiresPhoneOtp: true,
      phoneOtpToken: createPendingPhoneOtpToken({
        role,
        userId: user.id,
        mobile: phoneResult.phoneNumber || normalizePhoneNumber(phoneNumber),
        mode,
      }),
      user: {
        id: user.id,
        role,
        name: user.name,
        email: user.email,
        mobile: phoneResult.phoneNumber || normalizePhoneNumber(user.phone_no),
        profileComplete: false,
      },
      message: "SMS OTP sent to your mobile number.",
    });
  }),
);

router.post(
  "/phone/verify",
  asyncHandler(async (req, res) => {
    const { phoneOtpToken, otp } = req.body;

    if (!phoneOtpToken || !otp) {
      return res.status(400).json({ message: "Phone OTP token and OTP are required" });
    }

    let payload;
    try {
      payload = jwt.verify(phoneOtpToken, process.env.JWT_SECRET || "change-this-secret");
    } catch {
      return res.status(401).json({ message: "Phone OTP session expired. Please start again." });
    }

    if (payload.type !== "pending_phone_otp") {
      return res.status(400).json({ message: "Invalid phone OTP session" });
    }

    const verification = await verifyPhoneOtp({
      phoneNumber: payload.mobile,
      code: String(otp).trim(),
    });

    if (!verification.ok) {
      return res.status(401).json({ message: "Invalid mobile OTP" });
    }

    const config = roleConfig[payload.role];
    const [user] = await query(
      `SELECT ${config.id} AS id, ${config.name} AS name, email FROM ${config.table} WHERE ${config.id} = ?`,
      [payload.userId],
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const fullProfile = await loadUserProfile(payload.role, payload.userId);

    await recordLoginEvent({
      role: payload.role,
      userId: payload.userId,
      userName: fullProfile?.farmer_name || fullProfile?.cust_name || user.name,
      identifier: fullProfile?.phone_no || payload.mobile,
      method: "phone_otp",
    });

    return res.json({
      token: createToken({ role: payload.role, userId: payload.userId }),
      user: sanitizeAuthUser(payload.role, fullProfile || user),
    });
  }),
);

router.post(
  "/google/:role",
  asyncHandler(async (req, res) => {
    const role = req.params.role;
    const credential = req.body?.credential;
    const mode = req.body?.mode === "register" ? "register" : "login";

    if (!["farmer", "customer"].includes(role)) {
      return res.status(400).json({ message: "Google sign-in is only supported for farmer and customer roles" });
    }

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const googleResult = await verifyGoogleCredential(credential);
    if (!googleResult.ok) {
      return res.status(401).json({ message: googleResult.reason });
    }

    const config = roleConfig[role];
    let [user] = await query(
      `SELECT ${config.id} AS id, ${config.name} AS name, email FROM ${config.table} WHERE email = ?`,
      [googleResult.profile.email],
    );

    if (!user && mode === "register") {
      const userId = await createQuickAccount(role, {
        email: googleResult.profile.email,
        name: googleResult.profile.name,
      });
      user = await loadUserProfile(role, userId);
    }

    if (!user) {
      return res.status(404).json({
        message: `No ${role} account exists for ${googleResult.profile.email}. Register first, then use Google sign-in.`,
      });
    }

    const fullProfile = await loadUserProfile(role, user.id ?? user.farmer_id ?? user.cust_id);

    await recordLoginEvent({
      role,
      userId: user.id ?? user.farmer_id ?? user.cust_id,
      userName: fullProfile?.farmer_name || fullProfile?.cust_name || user.name,
      identifier: googleResult.profile.email,
      method: "google",
    });

    return res.json({
      token: createToken({ role, userId: user.id ?? user.farmer_id ?? user.cust_id }),
      user: sanitizeAuthUser(role, fullProfile || user),
    });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { role, userId } = req.user;
    const config = roleConfig[role];

    if (role === "admin") {
      const [admin] = await query("SELECT admin_id, admin_name FROM admin WHERE admin_id = ?", [userId]);
      return res.json(sanitizeAuthUser("admin", admin));
    }

    const user = await loadUserProfile(role, userId);
    res.json(sanitizeAuthUser(role, user));
  }),
);

router.put(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { role, userId } = req.user;

    if (role === "admin") {
      return res.status(400).json({ message: "Admin profile editing is not supported" });
    }

    const [existing] =
      role === "farmer"
        ? await query(
            "SELECT farmer_id, email, password, F_State, farmer_name, phone_no, F_gender, F_birthday, F_District, F_Location FROM farmerlogin WHERE farmer_id = ?",
            [userId],
          )
        : await query(
            "SELECT cust_id, email, password, state, cust_name, phone_no, city, address, pincode FROM custlogin WHERE cust_id = ?",
            [userId],
          );

    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const nextStateCode = req.body.stateCode;
    let stateName = role === "farmer" ? existing.F_State : existing.state;

    if (nextStateCode) {
      const [state] = await query("SELECT StateName FROM state WHERE StCode = ?", [nextStateCode]);
      if (!state) {
        return res.status(400).json({ message: "Invalid state selected" });
      }
      stateName = state.StateName;
    }

    const nextPassword = req.body.password?.trim()
      ? await hashPassword(req.body.password.trim())
      : existing.password;
    const nextEmail = String(req.body.email || existing.email || "").trim();

    if (!nextEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!isValidEmail(nextEmail)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const emailAvailable = await ensureUniqueEmail(role, nextEmail, userId);
    if (!emailAvailable) {
      return res.status(409).json({ message: "Email already exists" });
    }

    if (role === "farmer") {
      const { name, mobile, gender, dob, district, city } = req.body;
      if (!name?.trim() || !mobile?.trim() || !district?.trim() || !city?.trim()) {
        return res.status(400).json({ message: "Name, email, mobile, district, and city are required" });
      }

      if (!isValidIndianMobile(mobile)) {
        return res.status(400).json({ message: "Enter a valid 10-digit mobile number" });
      }

      await query(
        `UPDATE farmerlogin
         SET farmer_name = ?, email = ?, phone_no = ?, F_gender = ?, F_birthday = ?, F_State = ?, F_District = ?, F_Location = ?, password = ?
         WHERE farmer_id = ?`,
        [
          name.trim(),
          nextEmail,
          normalizeIndianMobile(mobile),
          gender || "Male",
          dob || "",
          stateName,
          district.trim(),
          city.trim(),
          nextPassword,
          userId,
        ],
      );
    } else {
        const { name, mobile, city, address, pincode } = req.body;
        if (!name?.trim() || !mobile?.trim() || !city?.trim() || !address?.trim() || !pincode?.trim()) {
          return res.status(400).json({ message: "Name, email, mobile, city, address, and pincode are required" });
        }

        if (!isValidIndianMobile(mobile)) {
          return res.status(400).json({ message: "Enter a valid 10-digit mobile number" });
        }

        await query(
          `UPDATE custlogin
         SET cust_name = ?, email = ?, phone_no = ?, state = ?, city = ?, address = ?, pincode = ?, password = ?
         WHERE cust_id = ?`,
          [
            name.trim(),
            nextEmail,
            normalizeIndianMobile(mobile),
            stateName,
            city.trim(),
          address.trim(),
          pincode.trim(),
          nextPassword,
          userId,
        ],
      );
    }

    res.json({ message: "Profile updated successfully" });
  }),
);

export default router;
