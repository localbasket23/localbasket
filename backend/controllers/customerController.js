const db = require("../db/connection");
const bcrypt = require("bcrypt");
const util = require("util");
const jwt = require("jsonwebtoken");

const query = util.promisify(db.query).bind(db);

const JWT_SECRET = process.env.JWT_SECRET || "localbasket_dev_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const customerOtpStore = new Map();

const signToken = (customer) => {
  return jwt.sign(
    { id: customer.id, phone: customer.phone },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const otpKey = (identifier) => String(identifier || "").trim().toLowerCase();

const issueCustomerOtp = (identifier) => {
  const key = otpKey(identifier);
  const otp = generateOtp();
  customerOtpStore.set(key, {
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MS
  });
  return otp;
};

const verifyCustomerOtp = (identifier, otp) => {
  const key = otpKey(identifier);
  const rec = customerOtpStore.get(key);
  if (!rec) return { ok: false, message: "OTP not requested" };
  if (Date.now() > rec.expiresAt) {
    customerOtpStore.delete(key);
    return { ok: false, message: "OTP expired. Please request again." };
  }
  if (String(rec.otp) !== String(otp || "").trim()) {
    return { ok: false, message: "Invalid OTP" };
  }
  customerOtpStore.delete(key);
  return { ok: true };
};

/* =====================================================
   REGISTER CUSTOMER
   POST /api/customer/register
===================================================== */
exports.register = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, phone and password are required"
      });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Enter valid 10-digit phone number"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO customers (name, email, phone, password)
       VALUES (?, ?, ?, ?)`,
      [name, email || null, phone, hashedPassword]
    );

    const user = {
      id: result.insertId,
      name,
      email: email || null,
      phone
    };

    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      token,
      user
    });
  } catch (err) {
    console.error("CUSTOMER REGISTER ERROR:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Email or phone already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
};

/* =====================================================
   LOGIN CUSTOMER
   POST /api/customer/login
===================================================== */
exports.login = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "").trim();
    const password = String(req.body.password || "");

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/Phone and password are required"
      });
    }

    const rows = await query(
      `SELECT id, name, email, phone, password
       FROM customers
       WHERE email = ? OR phone = ?
       LIMIT 1`,
      [identifier, identifier]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const customer = rows[0];
    const isMatch = await bcrypt.compare(password, customer.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const user = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone
    };

    const token = signToken(user);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user
    });
  } catch (err) {
    console.error("CUSTOMER LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
};

/* =====================================================
   REQUEST CUSTOMER OTP LOGIN
   POST /api/customer/login-otp/request
===================================================== */
exports.requestLoginOtp = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.phone || req.body.email || "").trim();
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Phone or email is required"
      });
    }

    const rows = await query(
      `SELECT id, phone, email
       FROM customers
       WHERE email = ? OR phone = ?
       LIMIT 1`,
      [identifier, identifier]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found"
      });
    }

    const customer = rows[0];
    const target = customer.phone || customer.email;
    const otp = issueCustomerOtp(target);
    console.log(`CUSTOMER OTP (${target}): ${otp}`);

    res.json({
      success: true,
      message: "OTP sent successfully",
      dev_otp: otp
    });
  } catch (err) {
    console.error("CUSTOMER OTP REQUEST ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Unable to send OTP"
    });
  }
};

/* =====================================================
   VERIFY CUSTOMER OTP LOGIN
   POST /api/customer/login-otp/verify
===================================================== */
exports.verifyLoginOtp = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.phone || req.body.email || "").trim();
    const otp = String(req.body.otp || "").trim();

    if (!identifier || !otp) {
      return res.status(400).json({
        success: false,
        message: "Identifier and OTP are required"
      });
    }

    const rows = await query(
      `SELECT id, name, email, phone
       FROM customers
       WHERE email = ? OR phone = ?
       LIMIT 1`,
      [identifier, identifier]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found"
      });
    }

    const customer = rows[0];
    const check = verifyCustomerOtp(customer.phone || customer.email, otp);
    if (!check.ok) {
      return res.status(401).json({
        success: false,
        message: check.message
      });
    }

    const user = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone
    };
    const token = signToken(user);

    res.json({
      success: true,
      message: "OTP login successful",
      token,
      user
    });
  } catch (err) {
    console.error("CUSTOMER OTP VERIFY ERROR:", err);
    res.status(500).json({
      success: false,
      message: "OTP login failed"
    });
  }
};

/* =====================================================
   UPDATE CUSTOMER PROFILE
   PUT /api/customer/profile
===================================================== */
exports.updateProfile = async (req, res) => {
  try {
    const id = Number(req.body.id || req.user?.id);
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");

    if (!id || !name || !email) {
      return res.status(400).json({
        success: false,
        message: "Customer id, name and email are required"
      });
    }

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      await query(
        `UPDATE customers
         SET name = ?, email = ?, phone = ?, password = ?
         WHERE id = ?`,
        [name, email, phone || null, hashedPassword, id]
      );

      return res.json({
        success: true,
        message: "Profile and password updated successfully"
      });
    }

    await query(
      `UPDATE customers
       SET name = ?, email = ?, phone = ?
       WHERE id = ?`,
      [name, email, phone || null, id]
    );

    res.json({
      success: true,
      message: "Profile updated successfully"
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Email or phone already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Profile update failed"
    });
  }
};

/* =====================================================
   AUTH MIDDLEWARE
===================================================== */
exports.requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization token missing"
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};
