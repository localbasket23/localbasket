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

  try {
    const result = await query(
      `
      INSERT INTO support_requests (customer_id, name, email, phone, issue_type, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
      `,
      [Number.isFinite(customer_id) ? customer_id : null, name, email || null, phone || null, issue_type, message]
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
