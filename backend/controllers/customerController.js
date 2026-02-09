const db = require("../db/connection");
const bcrypt = require("bcrypt");
const util = require("util");
const jwt = require("jsonwebtoken");

const query = util.promisify(db.query).bind(db);

const JWT_SECRET = process.env.JWT_SECRET || "localbasket_dev_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const signToken = (customer) => {
  return jwt.sign(
    { id: customer.id, phone: customer.phone },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
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
