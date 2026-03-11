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

