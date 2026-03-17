const db = require("../db/connection");
const util = require("util");

const query = util.promisify(db.query).bind(db);

const hasDatabaseConfigured = () => !!String(process.env.DATABASE_URL || "").trim();

const normalizeMode = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "maintenance") return "maintenance";
  return "active";
};

let cache = {
  mode: "active",
  at: 0
};

const readSystemMode = async () => {
  const rows = await query("SELECT system_mode FROM settings WHERE id=1");
  return normalizeMode(rows && rows[0] && rows[0].system_mode);
};

const getCachedSystemMode = async (ttlMs) => {
  const now = Date.now();
  if (cache.at && now - cache.at < ttlMs) return cache.mode;
  try {
    const mode = await readSystemMode();
    cache = { mode, at: now };
    return mode;
  } catch (err) {
    // Fail-open if DB is unavailable.
    console.error("MAINTENANCE MODE CHECK ERROR:", err);
    cache = { mode: "active", at: now };
    return "active";
  }
};

// Blocks most /api/* routes when maintenance is on.
// Always allow /api/admin/* and /api/system/* so the admin can disable maintenance.
module.exports = async function maintenanceGuard(req, res, next) {
  const url = String(req.originalUrl || req.url || "");
  if (!url.startsWith("/api/")) return next();

  // Whitelist critical endpoints
  if (
    url.startsWith("/api/health") ||
    url.startsWith("/api/ai/") ||
    url.startsWith("/api/system") ||
    url.startsWith("/api/admin")
  ) {
    return next();
  }

  // If DB isn't configured, we can't read the system maintenance flag.
  // Fail-open to avoid blocking unrelated endpoints (like AI) on serverless deploys.
  if (!hasDatabaseConfigured()) return next();

  const ttlMs = Number(process.env.MAINTENANCE_CACHE_MS || 15000);
  const mode = await getCachedSystemMode(ttlMs);
  if (mode !== "maintenance") return next();

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Retry-After", "300");
  return res.status(503).json({
    success: false,
    maintenance: true,
    system_mode: "maintenance",
    message: "Maintenance mode"
  });
};
