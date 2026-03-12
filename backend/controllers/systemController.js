const db = require("../db/connection");
const util = require("util");

const query = util.promisify(db.query).bind(db);

const normalizeMode = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "maintenance") return "maintenance";
  return "active";
};

// GET /api/system/status
exports.getSystemStatus = async (req, res) => {
  try {
    const rows = await query("SELECT system_mode FROM settings WHERE id=1");
    const mode = normalizeMode(rows && rows[0] && rows[0].system_mode);
    res.json({ success: true, system_mode: mode });
  } catch (err) {
    // Fail-open: if settings can't be read, keep the platform usable.
    console.error("SYSTEM STATUS ERROR:", err);
    res.json({ success: true, system_mode: "active", degraded: true });
  }
};

async function ensureSupportRequestsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS support_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NULL,
      name VARCHAR(160) NULL,
      email VARCHAR(190) NULL,
      phone VARCHAR(20) NULL,
      issue_type VARCHAR(60) NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
      admin_note TEXT NULL,
      resolved_at DATETIME NULL,
      resolved_by VARCHAR(80) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_support_status (status),
      KEY idx_support_created (created_at)
    )
  `);
}

// POST /api/system/support/request
exports.submitSupportRequest = async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const phone = String(req.body?.phone || "").trim();
  const issue_type = String(req.body?.type || req.body?.issue_type || "").trim();
  const message = String(req.body?.message || "").trim();
  const customer_id = req.body?.customer_id ? Number(req.body.customer_id) : null;

  const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!name || !emailOk || !issue_type || message.length < 5) {
    return res.status(400).json({
      success: false,
      message: "name, email, type and message are required"
    });
  }
  if (!Number.isFinite(customer_id) || customer_id <= 0) {
    return res.status(401).json({ success: false, message: "Login required" });
  }

  try {
    await ensureSupportRequestsTable();

    const customerRows = await query("SELECT id, name, email, phone FROM customers WHERE id=? LIMIT 1", [customer_id]);
    const customer = customerRows && customerRows[0] ? customerRows[0] : null;
    if (!customer) return res.status(401).json({ success: false, message: "Login required" });

    const result = await query(
      `
      INSERT INTO support_requests (customer_id, name, email, phone, issue_type, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
      `,
      [
        customer_id,
        name || customer.name || null,
        email || customer.email || null,
        phone || customer.phone || null,
        issue_type,
        message
      ]
    );

    return res.json({
      success: true,
      id: result?.insertId || null,
      ticket: `SUP-${result?.insertId || Date.now()}`
    });
  } catch (err) {
    console.error("SUPPORT REQUEST ERROR:", err?.sqlMessage || err?.message || err);
    return res.status(500).json({ success: false, message: "Failed to submit support request" });
  }
};

// POST /api/system/analytics/visit
exports.trackSiteVisit = async (req, res) => {
  const sessionIdRaw = String(req.body?.sid || req.body?.session_id || "").trim();
  const session_id = sessionIdRaw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (!session_id || session_id.length < 8) {
    return res.status(400).json({ success: false, message: "sid is required" });
  }

  const event = String(req.body?.event || "ping").trim().toLowerCase();
  const path = String(req.body?.path || req.body?.pathname || "").trim().slice(0, 255);
  const referrer = String(req.body?.referrer || req.get("referer") || "").trim().slice(0, 255);
  const user_agent = String(req.get("user-agent") || "").trim().slice(0, 255);

  const elapsedRaw = Number(req.body?.elapsed_ms ?? req.body?.elapsed ?? 0);
  const elapsed_ms = Number.isFinite(elapsedRaw) ? Math.max(0, Math.min(7 * 24 * 60 * 60 * 1000, Math.floor(elapsedRaw))) : 0;

  const inferredAdmin = path.startsWith("/welcome/admin");
  const is_admin = inferredAdmin ? 1 : 0;
  const pageviewInc = event === "load" || event === "pageview" ? 1 : 0;

  try {
    await query(
      `
      INSERT INTO site_visits (session_id, is_admin, first_seen_at, last_seen_at, max_elapsed_ms, pageviews, last_path, referrer, user_agent)
      VALUES (?, ?, NOW(), NOW(), ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        is_admin = VALUES(is_admin),
        last_seen_at = NOW(),
        max_elapsed_ms = GREATEST(max_elapsed_ms, VALUES(max_elapsed_ms)),
        pageviews = pageviews + ?,
        last_path = VALUES(last_path),
        referrer = VALUES(referrer),
        user_agent = VALUES(user_agent)
      `,
      [session_id, is_admin, elapsed_ms, Math.max(1, pageviewInc), path || null, referrer || null, user_agent || null, pageviewInc]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("VISIT TRACK ERROR:", err?.sqlMessage || err?.message || err);
    return res.status(500).json({ success: false });
  }
};
