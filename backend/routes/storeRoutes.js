const express = require("express");
const router = express.Router();
const db = require("../db/connection");

router.get("/", (req, res) => {
  const pincode = String(req.query?.pincode || "").trim();
  const hasPinFilter = /^[0-9]{6}$/.test(pincode);

  if (pincode && !hasPinFilter) {
    return res.status(400).json({
      success: false,
      stores: [],
      message: "Valid 6-digit pincode is required"
    });
  }

  const sql = `
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
      COALESCE(r.avg_rating, 0) AS avg_rating,
      COALESCE(r.rating_count, 0) AS rating_count
    FROM sellers s
    LEFT JOIN categories c ON c.id = s.category_id
    LEFT JOIN (
      SELECT store_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
      FROM store_ratings
      GROUP BY store_id
    ) r ON r.store_id = s.id
    WHERE s.status = 'APPROVED'
      ${hasPinFilter ? "AND s.pincode = ?" : ""}
    ORDER BY s.store_name ASC
  `;

  db.query(sql, hasPinFilter ? [pincode] : [], (err, rows) => {
    if (err) {
      console.error("STORE LIST ERROR:", err.sqlMessage || err.message || err);
      return res.status(500).json({
        success: false,
        stores: [],
        message: "Database error"
      });
    }

    return res.json({
      success: true,
      stores: rows || []
    });
  });
});

router.get("/:id", (req, res) => {
  const storeId = Number(req.params.id);
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Invalid store id"
    });
  }

  const sql = `
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
      COALESCE(r.avg_rating, 0) AS avg_rating,
      COALESCE(r.rating_count, 0) AS rating_count
    FROM sellers s
    LEFT JOIN categories c ON c.id = s.category_id
    LEFT JOIN (
      SELECT store_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
      FROM store_ratings
      GROUP BY store_id
    ) r ON r.store_id = s.id
    WHERE s.id = ?
      AND s.status = 'APPROVED'
    LIMIT 1
  `;

  db.query(sql, [storeId], (err, rows) => {
    if (err) {
      console.error("SINGLE STORE ERROR:", err.sqlMessage || err.message || err);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }

    return res.json({
      success: true,
      store: rows[0]
    });
  });
});

module.exports = router;
