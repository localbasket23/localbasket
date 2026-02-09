const db = require("../db/connection");
const bcrypt = require("bcrypt");
const dbp = db.promise();
const query = dbp.query.bind(dbp);
let sellerColumnsCache = null;

const getSellerColumns = async () => {
  if (sellerColumnsCache) return sellerColumnsCache;
  const [rows] = await query(
    `
    SELECT COLUMN_NAME
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'sellers'
    `
  );
  sellerColumnsCache = new Set(rows.map(r => r.COLUMN_NAME));
  return sellerColumnsCache;
};

const pickColumns = (columns, data) => {
  const out = {};
  Object.keys(data).forEach((key) => {
    if (columns.has(key) && data[key] !== undefined) out[key] = data[key];
  });
  return out;
};

const isValidIfsc = (value) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(value || "").trim().toUpperCase());
const isValidAccount = (value) => /^[0-9]{9,18}$/.test(String(value || "").trim());
const isFullAddress = (value) => {
  const text = String(value || "").trim();
  if (text.length < 20) return false;
  const parts = text.split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length < 3) return false;
  const hasNumber = /\d/.test(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return hasNumber && wordCount >= 5;
};

/* =====================================================
   SELLER REGISTER
===================================================== */
exports.register = async (req, res) => {
  try {
    const {
      store_name,
      owner_name,
      email,
      phone,
      address,
      pincode,
      password,
      category_id,
      alt_phone,
      bank_holder,
      bank_account,
      bank_ifsc,
      bank_name,
      bank_branch
    } = req.body;

    if (!store_name || !owner_name || !phone || !pincode || !password || !category_id) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }
    if (!address || !isFullAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Full shop address required"
      });
    }
    if (!bank_holder || !bank_account || !bank_ifsc || !bank_name) {
      return res.status(400).json({
        success: false,
        message: "Bank details required"
      });
    }
    if (!isValidAccount(bank_account)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account number"
      });
    }
    if (!isValidIfsc(bank_ifsc)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IFSC code"
      });
    }

    /* ✅ CHECK CATEGORY (ACTIVE ONLY) */
    const [cat] = await query(
      "SELECT id FROM categories WHERE id=? AND is_active=1",
      [category_id]
    );

    if (cat.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive category"
      });
    }

    const owner_id_doc = req.files?.owner_id_doc?.[0]?.filename || null;
    const license_doc  = req.files?.license_doc?.[0]?.filename || null;
    const store_photo  = req.files?.store_photo?.[0]?.filename || null;

    // Owner ID optional; admin will verify later

    /* 🔐 HASH PASSWORD */
    const hashedPassword = await bcrypt.hash(password, 10);

    const columns = await getSellerColumns();
    const data = pickColumns(columns, {
      store_name,
      owner_name,
      email: email || null,
      phone,
      address,
      pincode,
      password: hashedPassword,
      owner_id_doc,
      license_doc,
      bank_passbook,
      store_photo,
      category_id,
      alt_phone: alt_phone || null,
      bank_holder,
      bank_account,
      bank_ifsc: String(bank_ifsc || "").trim().toUpperCase(),
      bank_name,
      bank_branch: bank_branch || null,
      status: "PENDING",
      reject_reason: null,
      is_online: 0,
      account_status: "ACTIVE"
    });

    const cols = Object.keys(data);
    const placeholders = cols.map(() => "?").join(",");
    const sql = `INSERT INTO sellers (${cols.join(",")}) VALUES (${placeholders})`;
    await query(sql, cols.map(k => data[k]));

    res.status(201).json({
      success: true,
      status: "PENDING",
      message: "Registration successful. Waiting for admin approval."
    });

  } catch (err) {
    console.error("❌ SELLER REGISTER ERROR:", err.sqlMessage || err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Phone or email already registered"
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
};

/* =====================================================
   SELLER LOGIN
===================================================== */
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and password required"
      });
    }

    const [rows] = await query(
      `SELECT s.*, c.name AS category
       FROM sellers s
       JOIN categories c ON s.category_id = c.id
       WHERE s.phone=? LIMIT 1`,
      [phone]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const seller = rows[0];

    const match = await bcrypt.compare(password, seller.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (seller.account_status === "BLOCKED") {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked by admin"
      });
    }

    if (seller.status !== "APPROVED") {
      return res.json({
        success: true,
        status: seller.status,
        seller: {
          id: seller.id,
          store_name: seller.store_name,
          owner_name: seller.owner_name,
          phone: seller.phone,
          address: seller.address,
          category: seller.category,
          reject_reason: seller.reject_reason
        }
      });
    }

    res.json({
      success: true,
      status: "APPROVED",
      seller: {
        id: seller.id,
        store_name: seller.store_name,
        owner_name: seller.owner_name,
        email: seller.email,
        phone: seller.phone,
        category: seller.category,
        pincode: seller.pincode,
        store_photo: seller.store_photo,
        is_online: seller.is_online
      }
    });

  } catch (err) {
    console.error("❌ SELLER LOGIN ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   SELLER RESUBMIT (AFTER REJECTION)
===================================================== */
exports.resubmit = async (req, res) => {
  try {
    const sellerId = req.params.id;
    const {
      store_name,
      owner_name,
      address,
      category_id,
      pincode,
      bank_holder,
      bank_account,
      bank_ifsc,
      bank_name,
      bank_branch
    } = req.body;

    if (!sellerId || !category_id) {
      return res.status(400).json({
        success: false,
        message: "Seller ID or category missing"
      });
    }

    const owner_id_doc = req.files?.owner_id_doc?.[0]?.filename || null;
    const license_doc  = req.files?.license_doc?.[0]?.filename || null;
    const bank_passbook = req.files?.bank_passbook?.[0]?.filename || null;
    const store_photo  = req.files?.store_photo?.[0]?.filename || null;

    if (address && !isFullAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Full shop address required"
      });
    }
    if (bank_ifsc && !isValidIfsc(bank_ifsc)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IFSC code"
      });
    }
    if (bank_account && !isValidAccount(bank_account)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account number"
      });
    }

    const columns = await getSellerColumns();
    const data = pickColumns(columns, {
      store_name,
      owner_name,
      address,
      pincode: pincode || null,
      category_id,
      store_photo,
      owner_id_doc,
      license_doc,
      bank_passbook,
      bank_holder,
      bank_account,
      bank_ifsc: bank_ifsc ? String(bank_ifsc).trim().toUpperCase() : null,
      bank_name,
      bank_branch,
      status: "PENDING",
      reject_reason: null
    });

    const setSql = Object.keys(data).map(k => `${k} = COALESCE(?, ${k})`).join(", ");
    const sql = `UPDATE sellers SET ${setSql} WHERE id = ?`;
    const values = Object.keys(data).map(k => data[k]).concat([sellerId]);
    const [result] = await query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    res.json({
      success: true,
      message: "Details resubmitted. Await admin verification."
    });

  } catch (err) {
    console.error("❌ SELLER RESUBMIT ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   ADD PRODUCT
===================================================== */
exports.addProduct = (req, res) => {
  const { seller_id, name, category, unit, price, stock, mrp } = req.body;

  if (!seller_id || !name || !category || !unit || !price || !stock) {
    return res.status(400).json({
      success: false,
      message: "All product fields are required"
    });
  }

  const image = req.file ? req.file.filename : null;

  db.query(
    `INSERT INTO products
     (seller_id, name, category, unit, price, mrp, stock, image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [seller_id, name, category, unit, price, mrp || null, stock, image],
    err => {
      if (err) {
        console.error("❌ ADD PRODUCT ERROR:", err.sqlMessage);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true, message: "Product added successfully" });
    }
  );
};

/* =====================================================
   GET SELLER PRODUCTS
===================================================== */
exports.getMyProducts = (req, res) => {
  const { seller_id } = req.query;

  if (!seller_id) {
    return res.status(400).json({
      success: false,
      message: "Seller ID required"
    });
  }

  db.query(
    `SELECT id, name, category, unit, price, mrp, stock, image, created_at
     FROM products
     WHERE seller_id=?
     ORDER BY created_at DESC`,
    [seller_id],
    (err, rows) => {
      if (err) {
        console.error("❌ GET PRODUCTS ERROR:", err.sqlMessage);
        return res.status(500).json({ success: false, products: [] });
      }
      res.json({ success: true, products: rows });
    }
  );
};

/* =====================================================
   SELLER ONLINE / OFFLINE
===================================================== */
exports.updateStatus = (req, res) => {
  const { seller_id, is_online } = req.body;

  if (!seller_id) {
    return res.status(400).json({
      success: false,
      message: "Seller ID missing"
    });
  }

  db.query(
    "UPDATE sellers SET is_online=? WHERE id=?",
    [is_online ? 1 : 0, seller_id],
    err => {
      if (err) {
        console.error("❌ SELLER STATUS ERROR:", err.sqlMessage);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true, message: "Status updated successfully" });
    }
  );
};

/* =====================================================
   SELLER DASHBOARD
===================================================== */
exports.getDashboard = async (req, res) => {
  const sellerIdNum = Number(req.params.id);
  const sellerIdStr = String(req.params.id);

  if (!sellerIdNum) {
    return res.status(400).json({
      success: false,
      message: "Seller ID required"
    });
  }

  const getProductsCount = () =>
    new Promise((resolve, reject) => {
      db.query(
        "SELECT COUNT(*) AS total FROM products WHERE seller_id=?",
        [sellerIdNum],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows[0].total);
        }
      );
    });

  const getOrdersCount = () =>
    new Promise((resolve, reject) => {
      db.query(
        `
        SELECT COUNT(*) AS total
        FROM orders
        WHERE
          JSON_CONTAINS(
            JSON_EXTRACT(cart, '$[*].seller_id'),
            CAST(? AS JSON)
          )
          OR
          JSON_CONTAINS(
            JSON_EXTRACT(cart, '$[*].storeId'),
            JSON_QUOTE(?)
          )
        `,
        [sellerIdNum, sellerIdStr],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows[0].total);
        }
      );
    });

  try {
    const [totalProducts, totalOrders] = await Promise.all([
      getProductsCount(),
      getOrdersCount()
    ]);

    res.json({
      success: true,
      stats: { totalProducts, totalOrders }
    });
  } catch (err) {
    console.error("❌ SELLER DASHBOARD ERROR:", err.sqlMessage || err);
    res.status(500).json({
      success: false,
      message: "Dashboard failed"
    });
  }
};

