const db = require("../db/connection");
const { register: createStore } = require("./sellerController");

exports.createStore = createStore;

const buildStoreListSql = ({ withRatings = true, withCategories = true, withMinimumOrder = true, byId = false, hasPinFilter = false } = {}) => `
  SELECT
    s.id AS id,
    s.store_name,
    s.owner_name,
    s.store_photo,
    s.store_photo AS image,
    s.phone,
    s.address,
    s.pincode,
    ${withMinimumOrder ? "COALESCE(s.minimum_order, 100)" : "100"} AS minimum_order,
    ${withCategories ? "s.category_id" : "NULL"} AS category_id,
    ${withCategories ? "c.name" : "NULL"} AS category_name,
    ${withCategories ? "c.slug" : "NULL"} AS category_slug,
    s.status,
    s.is_online,
    ${withRatings ? "COALESCE(r.avg_rating, 0)" : "0"} AS avg_rating,
    ${withRatings ? "COALESCE(r.rating_count, 0)" : "0"} AS rating_count
  FROM sellers s
  ${withCategories ? "LEFT JOIN categories c ON c.id = s.category_id" : ""}
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

const queryStoresWithFallbacks = async ({ byId = false, hasPinFilter = false, params = [] } = {}) => {
  const attempts = [
    { withRatings: true, withCategories: true, withMinimumOrder: true },
    { withRatings: false, withCategories: true, withMinimumOrder: true },
    { withRatings: false, withCategories: false, withMinimumOrder: true },
    { withRatings: false, withCategories: false, withMinimumOrder: false }
  ];

  let lastErr = null;
  for (const attempt of attempts) {
    try {
      return await queryStores(buildStoreListSql({ ...attempt, byId, hasPinFilter }), params);
    } catch (err) {
      lastErr = err;
      const code = String(err?.code || "").trim();
      if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(code)) {
        throw err;
      }
    }
  }

  throw lastErr;
};

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
      const rows = await queryStoresWithFallbacks({ hasPinFilter, params });
      return res.json({ success: true, stores: rows });
    } catch (err) {
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
      const rows = await queryStoresWithFallbacks({ byId: true, params: [storeId] });
      if (!rows || rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Store not found"
        });
      }
      return res.json({ success: true, store: rows[0] });
    } catch (err) {
      console.error("SINGLE STORE ERROR:", err.sqlMessage || err.message || err);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    }
  })();
};
