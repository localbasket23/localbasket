const db = require("../db/connection");
const { register: createStore } = require("./sellerController");

exports.createStore = createStore;

const buildStoreListSql = ({ withRatings = true, byId = false, hasPinFilter = false } = {}) => `
  SELECT
    s.id AS id,
    s.store_name,
    s.owner_name,
    s.store_photo,
    s.store_photo AS image,
    s.phone,
    s.address,
    s.pincode,
    COALESCE(s.minimum_order, 100) AS minimum_order,
    s.category_id,
    c.name AS category_name,
    c.slug AS category_slug,
    s.status,
    s.is_online,
    ${withRatings ? "COALESCE(r.avg_rating, 0)" : "0"} AS avg_rating,
    ${withRatings ? "COALESCE(r.rating_count, 0)" : "0"} AS rating_count
  FROM sellers s
  LEFT JOIN categories c ON c.id = s.category_id
  ${withRatings ? `
  LEFT JOIN (
    SELECT store_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
    FROM store_ratings
    GROUP BY store_id
  ) r ON r.store_id = s.id
  ` : ""}
  WHERE ${byId ? "s.id = ?" : "s.status = 'APPROVED'"}
    ${byId ? "AND s.status = 'APPROVED'" : ""}
    ${hasPinFilter ? "AND s.pincode = ?" : ""}
  ORDER BY s.store_name ASC
  ${byId ? "LIMIT 1" : ""}
`;

const queryStores = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      return resolve(rows || []);
    });
  });

exports.listStores = (req, res) => {
  const pincode = String(req.query?.pincode || "").trim();
  const hasPinFilter = /^[0-9]{6}$/.test(pincode);

  if (pincode && !hasPinFilter) {
    return res.status(400).json({
      success: false,
      stores: [],
      message: "Valid 6-digit pincode is required"
    });
  }

  const params = hasPinFilter ? [pincode] : [];

  (async () => {
    try {
      const rows = await queryStores(buildStoreListSql({ withRatings: true, hasPinFilter }), params);
      return res.json({ success: true, stores: rows });
    } catch (err) {
      const code = String(err?.code || "").trim();
      if (code === "ER_NO_SUCH_TABLE") {
        try {
          const fallbackRows = await queryStores(buildStoreListSql({ withRatings: false, hasPinFilter }), params);
          return res.json({ success: true, stores: fallbackRows });
        } catch (fallbackErr) {
          console.error("STORE LIST FALLBACK ERROR:", fallbackErr.sqlMessage || fallbackErr.message || fallbackErr);
        }
      }
      console.error("STORE LIST ERROR:", err.sqlMessage || err.message || err);
      return res.status(500).json({
        success: false,
        stores: [],
        message: "Database error"
      });
    }
  })();
};

exports.getStoreById = (req, res) => {
  const storeId = Number(req.params.id);
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Invalid store id"
    });
  }

  (async () => {
    try {
      const rows = await queryStores(buildStoreListSql({ withRatings: true, byId: true }), [storeId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Store not found"
        });
      }
      return res.json({ success: true, store: rows[0] });
    } catch (err) {
      const code = String(err?.code || "").trim();
      if (code === "ER_NO_SUCH_TABLE") {
        try {
          const fallbackRows = await queryStores(buildStoreListSql({ withRatings: false, byId: true }), [storeId]);
          if (!fallbackRows || fallbackRows.length === 0) {
            return res.status(404).json({
              success: false,
              message: "Store not found"
            });
          }
          return res.json({ success: true, store: fallbackRows[0] });
        } catch (fallbackErr) {
          console.error("SINGLE STORE FALLBACK ERROR:", fallbackErr.sqlMessage || fallbackErr.message || fallbackErr);
        }
      }
      console.error("SINGLE STORE ERROR:", err.sqlMessage || err.message || err);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    }
  })();
};
