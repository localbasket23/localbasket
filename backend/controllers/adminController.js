const db = require("../db/connection");
const util = require("util");

// promisify db.query
const query = util.promisify(db.query).bind(db);
let sellerColumnsCache = null;

const getSellerColumns = async () => {
  if (sellerColumnsCache) return sellerColumnsCache;
  const rows = await query(
    `
    SELECT COLUMN_NAME
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'sellers'
    `
  );
  sellerColumnsCache = new Set((rows || []).map(r => r.COLUMN_NAME));
  return sellerColumnsCache;
};

const sellerColumnList = (cols, alias = "s") => {
  const base = [
    "id",
    "store_name",
    "owner_name",
    "phone",
    "status",
    "account_status",
    "reject_reason",
    "owner_id_doc",
    "license_doc",
    "store_photo",
    "created_at"
  ];
  const optional = [
    "address",
    "pincode",
    "alt_phone",
    "bank_holder",
    "bank_account",
    "bank_ifsc",
    "bank_name",
    "bank_branch",
    "bank_passbook"
  ];
  const list = base.concat(optional).filter(c => cols.has(c));
  if (!list.includes("id")) list.unshift("id");
  return list.map(c => `${alias}.${c} AS ${c}`).join(", ");
};

const isValidIfsc = (value) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(value || "").trim().toUpperCase());
const isValidAccount = (value) => /^[0-9]{9,18}$/.test(String(value || "").trim());
async function ensurePayoutTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS seller_payouts (
      seller_id INT PRIMARY KEY,
      last_paid_at DATETIME NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function ensureSellerAuditTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS seller_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seller_id INT NOT NULL,
      action VARCHAR(30) NOT NULL,
      reason TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function logSellerAction(seller_id, action, reason = null) {
  try {
    await ensureSellerAuditTable();
    await query(
      "INSERT INTO seller_audit_logs (seller_id, action, reason) VALUES (?,?,?)",
      [seller_id, action, reason]
    );
  } catch {
    // non-blocking
  }
}

/* =====================================================
   SELLER AUDIT LOGS
   GET /api/admin/seller-audit
===================================================== */
exports.getSellerAuditLogs = async (req, res) => {
  try {
    await ensureSellerAuditTable();
    const logs = await query(`
      SELECT
        l.id,
        l.seller_id,
        l.action,
        l.reason,
        l.created_at,
        s.store_name
      FROM seller_audit_logs l
      LEFT JOIN sellers s ON s.id = l.seller_id
      ORDER BY l.created_at DESC
      LIMIT 200
    `);

    res.json({ success: true, logs: logs || [] });
  } catch (err) {
    console.error("AUDIT LOG ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to load audit logs" });
  }
};

async function ensureSettingsColumns() {
  const columns = [
    { name: "payout_cycle", sql: "ALTER TABLE settings ADD COLUMN payout_cycle VARCHAR(20) DEFAULT 'Weekly'" },
    { name: "min_payout", sql: "ALTER TABLE settings ADD COLUMN min_payout DECIMAL(10,2) DEFAULT 0" },
    { name: "system_mode", sql: "ALTER TABLE settings ADD COLUMN system_mode VARCHAR(20) DEFAULT 'active'" }
  ];

  for (const col of columns) {
    const rows = await query("SHOW COLUMNS FROM settings LIKE ?", [col.name]);
    if (!rows || rows.length === 0) {
      await query(col.sql);
    }
  }
}

async function ensureSettingsRow() {
  try {
    await query(
      "INSERT INTO settings (id, global_commission_enabled, global_commission_percent, payout_cycle, min_payout, system_mode) VALUES (1, 1, 10, 'Weekly', 0, 'active') ON DUPLICATE KEY UPDATE id=id"
    );
  } catch (e) {
    // ignore if schema differs
  }
}
function timeAgo(input) {
  if (!input) return "just now";
  const date = new Date(input);
  if (isNaN(date.getTime())) return "just now";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
}

/* =====================================================
   ADMIN DASHBOARD STATS
   GET /api/admin/dashboard
===================================================== */
exports.getDashboardStats = async (req, res) => {
  try {
    const [sellers] = await query("SELECT COUNT(*) AS total FROM sellers");
    const [pending] = await query(
      "SELECT COUNT(*) AS total FROM sellers WHERE status='PENDING'"
    );
    const [orders] = await query("SELECT COUNT(*) AS total FROM orders");
    const [revenue] = await query(
      "SELECT IFNULL(SUM(total_amount),0) AS total FROM orders WHERE status='DELIVERED'"
    );

    const recentSellers = await query(
      "SELECT id, store_name, created_at FROM sellers ORDER BY created_at DESC LIMIT 4"
    );
    const recentOrders = await query(
      "SELECT id, status, created_at FROM orders ORDER BY created_at DESC LIMIT 4"
    );

    const activities = [];

    (recentSellers || []).forEach(s => {
      const ts = new Date(s.created_at).getTime();
      activities.push({
        type: "seller",
        message: `New seller ${s.store_name || `Seller #${s.id}`} registered`,
        time: timeAgo(s.created_at),
        ts: isNaN(ts) ? 0 : ts
      });
    });

    (recentOrders || []).forEach(o => {
      const status = String(o.status || "PLACED").toUpperCase();
      let message = `New Order #${o.id} received`;
      if (status === "DELIVERED") message = `Order #${o.id} delivered`;
      else if (status === "REJECTED") message = `Order #${o.id} rejected`;
      else if (status === "CANCELLED") message = `Order #${o.id} cancelled`;
      else if (status === "CONFIRMED") message = `Order #${o.id} confirmed`;
      else if (status === "OUT_FOR_DELIVERY") message = `Order #${o.id} out for delivery`;
      const ts = new Date(o.created_at).getTime();
      activities.push({
        type: "order",
        message,
        time: timeAgo(o.created_at),
        ts: isNaN(ts) ? 0 : ts
      });
    });

    const recentActivities = activities
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
      .slice(0, 8)
      .map(({ ts, ...rest }) => rest);

    res.json({
      success: true,
      stats: {
        totalSellers: sellers.total,
        pendingVerifications: pending.total,
        totalOrders: orders.total,
        totalRevenue: revenue.total
      },
      recentActivities
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Dashboard failed"
    });
  }
};

/* =====================================================
   GET ALL SELLERS (ADMIN MASTER LIST)
   GET /api/admin/sellers
===================================================== */
exports.getAllSellers = async (req, res) => {
  try {
    const cols = await getSellerColumns();
    const sellerCols = sellerColumnList(cols);
    const sellers = await query(`
      SELECT
        ${sellerCols},
        c.name AS category,
        IFNULL(sc.commission_percent, 10) AS commission
      FROM sellers s
      JOIN categories c ON c.id = s.category_id
      LEFT JOIN seller_commission sc ON sc.seller_id = s.id
      ORDER BY s.created_at DESC
    `);

    res.json({
      success: true,
      sellers
    });
  } catch (err) {
    console.error("❌ ALL SELLERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load sellers"
    });
  }
};

/* =====================================================
   GET PENDING SELLERS
   GET /api/admin/sellers/pending
===================================================== */
exports.getPendingSellers = async (req, res) => {
  try {
    const sellers = await query(`
      SELECT
        s.*,
        c.name AS category
      FROM sellers s
      JOIN categories c ON c.id = s.category_id
      WHERE s.status='PENDING'
      ORDER BY s.created_at DESC
    `);

    res.json({
      success: true,
      sellers
    });
  } catch (err) {
    console.error("❌ PENDING SELLERS ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   APPROVE SELLER
   POST /api/admin/sellers/:id/approve
===================================================== */
exports.approveSeller = async (req, res) => {
  try {
    const { seller_id } = req.body;

    if (!seller_id) {
      return res.status(400).json({
        success: false,
        message: "seller_id required"
      });
    }

    const cols = await getSellerColumns();
    const needsBankCheck = ["bank_holder", "bank_account", "bank_ifsc", "bank_passbook"].every(c => cols.has(c));
    if (needsBankCheck) {
      const rows = await query(
        "SELECT bank_holder, bank_account, bank_ifsc, bank_passbook FROM sellers WHERE id = ?",
        [seller_id]
      );
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: "Seller not found" });
      }
      const bank = rows[0] || {};
      if (!bank.bank_holder || !bank.bank_account || !bank.bank_ifsc || !bank.bank_passbook) {
        return res.status(400).json({ success: false, message: "Bank details/passbook missing" });
      }
      if (!isValidAccount(bank.bank_account) || !isValidIfsc(bank.bank_ifsc)) {
        return res.status(400).json({ success: false, message: "Invalid bank details" });
      }
    }

    const result = await query(
      "UPDATE sellers SET status='APPROVED', reject_reason=NULL WHERE id=?",
      [seller_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ APPROVE ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   REJECT SELLER
   POST /api/admin/sellers/:id/reject
===================================================== */
exports.rejectSeller = async (req, res) => {
  try {
    const { seller_id, reason } = req.body;

    if (!seller_id || !reason) {
      return res.status(400).json({
        success: false,
        message: "seller_id & reason required"
      });
    }

    const result = await query(
      "UPDATE sellers SET status='REJECTED', reject_reason=? WHERE id=?",
      [reason, seller_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ REJECT ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   UPDATE SELLER STATUS (GENERIC)
   POST /api/admin/sellers/status
===================================================== */
exports.updateSellerStatus = async (req, res) => {
  try {
    const { seller_id, status, reason } = req.body;

    if (!seller_id || !status) {
      return res.status(400).json({
        success: false,
        message: "seller_id & status required"
      });
    }

    const upperStatus = String(status || "").toUpperCase();
    if (upperStatus === "APPROVED") {
      const cols = await getSellerColumns();
      const needsBankCheck = ["bank_holder", "bank_account", "bank_ifsc", "bank_passbook"].every(c => cols.has(c));
      if (needsBankCheck) {
        const rows = await query(
          "SELECT bank_holder, bank_account, bank_ifsc, bank_passbook FROM sellers WHERE id = ?",
          [seller_id]
        );
        if (!rows || rows.length === 0) {
          return res.status(404).json({ success: false, message: "Seller not found" });
        }
        const bank = rows[0] || {};
        if (!bank.bank_holder || !bank.bank_account || !bank.bank_ifsc || !bank.bank_passbook) {
          return res.status(400).json({ success: false, message: "Bank details/passbook missing" });
        }
        if (!isValidAccount(bank.bank_account) || !isValidIfsc(bank.bank_ifsc)) {
          return res.status(400).json({ success: false, message: "Invalid bank details" });
        }
      }
    }

    const result = await query(
      "UPDATE sellers SET status=?, reject_reason=? WHERE id=?",
      [status, reason || null, seller_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ UPDATE STATUS ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   BLOCK / UNBLOCK SELLER
   POST /api/admin/sellers/block
===================================================== */
exports.blockSeller = async (req, res) => {
  try {
    const { seller_id, account_status } = req.body;

    if (!seller_id || !["ACTIVE", "BLOCKED"].includes(account_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid input"
      });
    }

    const result = await query(
      "UPDATE sellers SET account_status=? WHERE id=?",
      [account_status, seller_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ BLOCK ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   UPDATE SELLER COMMISSION
   POST /api/admin/sellers/commission
===================================================== */
exports.updateCommission = async (req, res) => {
  try {
    const { seller_id, commission } = req.body;

    if (!seller_id || commission == null) {
      return res.status(400).json({
        success: false,
        message: "seller_id & commission required"
      });
    }

    await query(
      "REPLACE INTO seller_commission (seller_id, commission_percent) VALUES (?,?)",
      [seller_id, commission]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ COMMISSION ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   GET ALL ORDERS (ADMIN)
   GET /api/admin/orders
===================================================== */
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await query(`
      SELECT 
        o.id,
        o.customer_name,
        o.total_amount,
        o.status,
        o.created_at,
        s.store_name
      FROM orders o
      LEFT JOIN sellers s ON s.id = o.seller_id
      ORDER BY o.id DESC
    `);

    res.json({
      success: true,
      orders
    });
  } catch (err) {
    console.error("❌ ORDERS ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   GET SINGLE ORDER DETAILS
   GET /api/admin/orders/:id
===================================================== */
exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(`
      SELECT 
        o.*,
        s.store_name,
        s.owner_name,
        s.phone AS seller_phone,
        s.address AS seller_address
      FROM orders o
      LEFT JOIN sellers s ON s.id = o.seller_id
      WHERE o.id = ?
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      order: rows[0]
    });
  } catch (err) {
    console.error("❌ ORDER DETAILS ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   SETTINGS (GLOBAL COMMISSION)
===================================================== */
exports.saveGlobalCommission = async (req, res) => {
  try {
    await ensureSettingsColumns();
    await ensureSettingsRow();
    const { enabled, percent } = req.body;

    await query(
      "UPDATE settings SET global_commission_enabled=?, global_commission_percent=? WHERE id=1",
      [enabled ? 1 : 0, percent]
    );

    await logSellerAction(seller_id, "APPROVE", null);
    await logSellerAction(seller_id, "REJECT", reason);
    if (upperStatus === "APPROVED" || upperStatus === "REJECTED") {
      await logSellerAction(seller_id, upperStatus, reason || null);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("GLOBAL COMM ERROR:", err);
    res.status(500).json({ success: false });
  }
};

exports.getAllSettings = async (req, res) => {
  try {
    await ensureSettingsColumns();
    await ensureSettingsRow();
    const [global] = await query("SELECT * FROM settings WHERE id=1");
    const sellers = await query("SELECT * FROM seller_commission");

    res.json({
      success: true,
      global,
      sellers
    });
  } catch (err) {
    console.error("SETTINGS ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* =====================================================
   ✅ CATEGORY MANAGEMENT
===================================================== */

/* GET /api/admin/categories */
exports.getCategories = async (req, res) => {
  try {
    const categories = await query(`
      SELECT id, name, slug, icon, is_active
      FROM categories
      ORDER BY id DESC
    `);

    res.json({ success: true, categories });
  } catch (err) {
    console.error("❌ CATEGORIES ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to load categories" });
  }
};

/* POST /api/admin/categories */
exports.addCategory = async (req, res) => {
  try {
    const { name, slug, icon } = req.body;

    if (!name || !slug || !icon) {
      return res.status(400).json({
        success: false,
        message: "name, slug and icon are required"
      });
    }

    await query(
      "INSERT INTO categories (name, slug, icon, is_active) VALUES (?, ?, ?, 1)",
      [name, slug, icon]
    );

    res.status(201).json({ success: true, message: "Category added" });
  } catch (err) {
    console.error("❌ ADD CATEGORY ERROR:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Category name or slug already exists"
      });
    }
    res.status(500).json({ success: false, message: "Failed to add category" });
  }
};

/* PUT /api/admin/categories/:id/status */
exports.toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (!id || typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "id and is_active required"
      });
    }

    const result = await query(
      "UPDATE categories SET is_active=? WHERE id=?",
      [is_active ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    console.error("❌ TOGGLE CATEGORY ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

/* DELETE /api/admin/categories/:id */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query("DELETE FROM categories WHERE id=?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    console.error("❌ DELETE CATEGORY ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to delete category" });
  }
};

/* =====================================================
   FULL REPORT (ADMIN)
   GET /api/admin/full-report
===================================================== */
exports.getFullReport = async (req, res) => {
  try {
    const [storeCount] = await query("SELECT COUNT(*) AS total FROM sellers");
    const [customerCount] = await query("SELECT COUNT(*) AS total FROM customers");
    const [orderCount] = await query("SELECT COUNT(*) AS total FROM orders");
    const [sales] = await query(
      "SELECT IFNULL(SUM(total_amount),0) AS total FROM orders WHERE status='DELIVERED'"
    );
    const [pending] = await query(
      "SELECT IFNULL(SUM(total_amount),0) AS total FROM orders WHERE status='DELIVERED' AND (payment_status IS NULL OR payment_status!='PAID')"
    );

    const topSellers = await query(`
      SELECT
        s.store_name AS name,
        s.owner_name AS owner,
        COUNT(o.id) AS orders,
        IFNULL(SUM(o.total_amount),0) AS sales
      FROM sellers s
      LEFT JOIN orders o
        ON o.seller_id = s.id AND o.status='DELIVERED'
      GROUP BY s.id
      ORDER BY sales DESC
      LIMIT 8
    `);

    const weekly = await query(`
      SELECT DATE(o.created_at) AS day, IFNULL(SUM(o.total_amount),0) AS total
      FROM orders o
      WHERE o.status='DELIVERED'
        AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(o.created_at)
      ORDER BY day ASC
    `);

    const dayMap = new Map(
      (weekly || []).map(r => [String(r.day).slice(0, 10), Number(r.total || 0)])
    );
    const labels = [];
    const values = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString('en-IN', { weekday: 'short' }));
      values.push(dayMap.get(key) || 0);
    }

    res.json({
      success: true,
      summary: {
        totalStores: storeCount?.total || 0,
        totalCustomers: customerCount?.total || 0,
        totalOrders: orderCount?.total || 0,
        totalSales: sales?.total || 0,
        pendingPayouts: pending?.total || 0,
        asOfDate: new Date().toISOString()
      },
      topSellers: topSellers || [],
      chartData: { labels, values }
    });
  } catch (err) {
    console.error("FULL REPORT ERROR:", err);
    res.status(500).json({ success: false, message: "Report failed" });
  }
};


/* =====================================================
   PAYMENTS (ADMIN)
   GET /api/admin/payments
===================================================== */
exports.getPayments = async (req, res) => {
  try {
    await ensurePayoutTable();

    const cols = await getSellerColumns();
    const sellerCols = sellerColumnList(cols);

    let useGlobal = false;
    let globalPercent = 10;
    try {
      const [settings] = await query("SELECT global_commission_enabled, global_commission_percent FROM settings WHERE id=1");
      if (settings) {
        useGlobal = Number(settings.global_commission_enabled) === 1;
        globalPercent = Number(settings.global_commission_percent || 10);
      }
    } catch (e) {
      // If settings table is missing, fallback to default commission
    }

    const rows = await query(`
      SELECT
        ${sellerCols},
        IFNULL(sc.commission_percent, 10) AS commission_percent,
        sp.last_paid_at,
        IFNULL(SUM(o.total_amount),0) AS total_amount
      FROM sellers s
      LEFT JOIN seller_commission sc ON sc.seller_id = s.id
      LEFT JOIN seller_payouts sp ON sp.seller_id = s.id
      LEFT JOIN orders o
        ON o.seller_id = s.id
        AND o.status='DELIVERED'
        AND (sp.last_paid_at IS NULL OR o.created_at > sp.last_paid_at)
      WHERE s.status='APPROVED'
      GROUP BY s.id
      ORDER BY total_amount DESC
    `);

    const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;
    const payments = (rows || []).map(r => {
      const pct = useGlobal ? globalPercent : Number(r.commission_percent || 10);
      const total = Number(r.total_amount || 0);
      const fee = round2((total * pct) / 100);
      const payout = round2(total - fee);
      const status = total > 0 ? "PENDING" : "PAID";
      return {
        seller_id: r.id || r.seller_id,
        store_name: r.store_name,
        bank_holder: r.bank_holder,
        bank_account: r.bank_account,
        bank_ifsc: r.bank_ifsc,
        bank_name: r.bank_name,
        bank_branch: r.bank_branch,
        bank_passbook: r.bank_passbook,
        total_amount: total,
        platform_fee: fee,
        seller_payout: payout,
        payout_status: status,
        commission_percent: pct
      };
    });

    res.json({ success: true, payments });
  } catch (err) {
    console.error("PAYMENTS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to load payments" });
  }
};

/* =====================================================
   PAYMENTS RELEASE (ADMIN)
   POST /api/admin/payments/release
===================================================== */
exports.releasePayout = async (req, res) => {
  try {
    const { sellerId } = req.body;
    if (!sellerId) {
      return res.status(400).json({ success: false, message: "sellerId required" });
    }

    const cols = await getSellerColumns();
    const needsBankCheck = ["bank_holder", "bank_account", "bank_ifsc"].every(c => cols.has(c));
    if (needsBankCheck) {
      const rows = await query(
        "SELECT bank_holder, bank_account, bank_ifsc FROM sellers WHERE id = ?",
        [sellerId]
      );
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: "Seller not found" });
      }
      const bank = rows[0] || {};
      if (!bank.bank_holder || !bank.bank_account || !bank.bank_ifsc) {
        return res.status(400).json({ success: false, message: "Bank details missing" });
      }
      if (!isValidAccount(bank.bank_account) || !isValidIfsc(bank.bank_ifsc)) {
        return res.status(400).json({ success: false, message: "Invalid bank details" });
      }
    }

    await ensurePayoutTable();
    await query(
      "INSERT INTO seller_payouts (seller_id, last_paid_at) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_paid_at=NOW()",
      [sellerId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("RELEASE PAYOUT ERROR:", err);
    res.status(500).json({ success: false, message: "Release failed" });
  }
};

/* =====================================================
   SAVE PAYOUT SETTINGS
   POST /api/admin/settings/payout
===================================================== */
exports.savePayoutSettings = async (req, res) => {
  try {
    await ensureSettingsColumns();
    await ensureSettingsRow();
    const { payout_cycle, min_payout } = req.body || {};
    await query(
      "UPDATE settings SET payout_cycle=?, min_payout=? WHERE id=1",
      [payout_cycle || 'Weekly', Number(min_payout || 0)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("PAYOUT SETTINGS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to save payout settings" });
  }
};

/* =====================================================
   SAVE SYSTEM MODE
   POST /api/admin/settings/system
===================================================== */
exports.saveSystemSettings = async (req, res) => {
  try {
    await ensureSettingsColumns();
    await ensureSettingsRow();
    const { system_mode } = req.body || {};
    await query(
      "UPDATE settings SET system_mode=? WHERE id=1",
      [system_mode || 'active']
    );
    res.json({ success: true });
  } catch (err) {
    console.error("SYSTEM SETTINGS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to save system settings" });
  }
};





