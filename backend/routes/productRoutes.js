const express = require("express");
const router = express.Router();
const db = require("../db/connection");
const dbp = db.promise();

let productColumnsCache = null;

async function getProductColumns() {
  if (productColumnsCache) return productColumnsCache;
  const [rows] = await dbp.query(
    `
    SELECT COLUMN_NAME
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'products'
    `
  );
  productColumnsCache = new Set(rows.map((r) => r.COLUMN_NAME));
  return productColumnsCache;
}

function parseProductImages(row) {
  const out = [];
  const pushSafe = (value) => {
    const name = String(value || "").trim();
    if (!name) return;
    if (!out.includes(name)) out.push(name);
  };

  if (row?.images_json) {
    try {
      const parsed = JSON.parse(row.images_json);
      if (Array.isArray(parsed)) parsed.forEach(pushSafe);
    } catch {}
  }

  pushSafe(row?.image);
  return out;
}

/* =====================================================
   GET PRODUCTS BY STORE ID
   URL: /api/products?storeId=1
===================================================== */
router.get("/", async (req, res) => {
  const storeId = parseInt(req.query.storeId, 10);

  if (!storeId) {
    return res.status(400).json({
      success: false,
      products: [],
      message: "storeId is required"
    });
  }

  try {
    const columns = await getProductColumns();
    const selectCols = [
      "p.id",
      "p.seller_id",
      "p.name",
      "p.category",
      "p.unit",
      "p.price",
      "p.mrp",
      "p.stock",
      "p.image"
    ];

    if (columns.has("description")) selectCols.push("p.description");
    if (columns.has("sub_category")) selectCols.push("p.sub_category");
    if (columns.has("images_json")) selectCols.push("p.images_json");

    const sql = `
      SELECT
        ${selectCols.join(", ")},
        COALESCE(r.avg_rating, 0) AS avg_rating,
        COALESCE(r.rating_count, 0) AS rating_count
      FROM products p
      LEFT JOIN (
        SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
        FROM product_reviews
        GROUP BY product_id
      ) r ON r.product_id = p.id
      WHERE p.seller_id = ?
      ORDER BY p.name ASC
    `;

    const [rows] = await dbp.query(sql, [storeId]);
    const products = (rows || []).map((row) => ({
      ...row,
      images: parseProductImages(row)
    }));

    res.json({
      success: true,
      products
    });
  } catch (err) {
    console.error("PRODUCT FETCH ERROR:", err.sqlMessage || err.message || err);
    return res.status(500).json({
      success: false,
      products: [],
      message: "Database error"
    });
  }
});

/* =====================================================
   GET REVIEWS BY PRODUCT ID
   URL: /api/products/:id/reviews
===================================================== */
router.get("/:id/reviews", (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (!productId) {
    return res.status(400).json({ success: false, reviews: [], message: "Invalid product id" });
  }

  const sql = `
    SELECT
      id,
      product_id,
      customer_name,
      rating,
      comment,
      created_at
    FROM product_reviews
    WHERE product_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `;

  db.query(sql, [productId], (err, rows) => {
    if (err) {
      console.error("PRODUCT REVIEW FETCH ERROR:", err.sqlMessage || err.message);
      return res.status(500).json({ success: false, reviews: [], message: "Database error" });
    }
    const ratings = (rows || []).map(r => Number(r.rating || 0));
    const avg = ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)) : 0;
    res.json({ success: true, reviews: rows || [], avg_rating: avg, rating_count: ratings.length });
  });
});

/* =====================================================
   ADD REVIEW FOR PRODUCT
   URL: /api/products/:id/reviews
===================================================== */
router.post("/:id/reviews", (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const { rating, comment, customer_id, customer_name, store_id } = req.body || {};
  const ratingNum = Number(rating);

  if (!productId || !Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ success: false, message: "Invalid rating" });
  }

  const sql = `
    INSERT INTO product_reviews (product_id, store_id, customer_id, customer_name, rating, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const safeName = customer_name ? String(customer_name).slice(0, 120) : null;
  const safeComment = comment ? String(comment).slice(0, 800) : null;
  const safeStoreId = store_id ? Number(store_id) : null;

  db.query(sql, [productId, safeStoreId, customer_id || null, safeName, ratingNum, safeComment], (err) => {
    if (err) {
      console.error("PRODUCT REVIEW INSERT ERROR:", err.sqlMessage || err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json({ success: true, message: "Review added" });
  });
});

module.exports = router;
