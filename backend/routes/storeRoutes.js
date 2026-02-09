const express = require("express");
const router = express.Router();
const db = require("../db/connection");

/* =====================================================
   GET STORES BY PINCODE (HOME PAGE)
   URL: /api/stores?pincode=401101
===================================================== */
router.get("/", (req, res) => {
  const { pincode } = req.query;

  /* 🔒 Validation */
  if (!pincode || !/^\d{6}$/.test(String(pincode))) {
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
      s.store_photo,
      s.phone,
      s.address,
      s.pincode,
      s.category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      s.status,
      s.is_online,\n      COALESCE(r.avg_rating, 0) AS avg_rating,\n      COALESCE(r.rating_count, 0) AS rating_count
    FROM sellers s
    LEFT JOIN categories c ON c.id = s.category_id\n    LEFT JOIN (\n      SELECT store_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count\n      FROM store_ratings\n      GROUP BY store_id\n    ) r ON r.store_id = s.id
    WHERE s.pincode = ?
      AND s.status = 'APPROVED'
    ORDER BY s.store_name ASC
  `;

  db.query(sql, [pincode], (err, rows) => {
    if (err) {
      console.error("❌ STORE LIST ERROR:", err.sqlMessage);
      return res.status(500).json({
        success: false,
        stores: [],
        message: "Database error"
      });
    }

    res.json({
      success: true,
      stores: rows || []
    });
  });
});

/* =====================================================
   GET SINGLE STORE BY ID (STORE PAGE)
   URL: /api/stores/:id
===================================================== */
router.get("/:id", (req, res) => {
  const storeId = parseInt(req.params.id, 10);

  /* 🔒 Validation */
  if (isNaN(storeId) || storeId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid store id"
    });
  }

  const sql = `
    SELECT
      s.id AS id,
      s.store_name,
      s.store_photo,
      s.phone,
      s.address,
      s.pincode,
      s.category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      s.status,
      s.is_online,\n      COALESCE(r.avg_rating, 0) AS avg_rating,\n      COALESCE(r.rating_count, 0) AS rating_count
    FROM sellers s
    LEFT JOIN categories c ON c.id = s.category_id\n    LEFT JOIN (\n      SELECT store_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count\n      FROM store_ratings\n      GROUP BY store_id\n    ) r ON r.store_id = s.id
    WHERE s.id = ?
      AND s.status = 'APPROVED'
    LIMIT 1
  `;

  db.query(sql, [storeId], (err, rows) => {
    if (err) {
      console.error("❌ SINGLE STORE ERROR:", err.sqlMessage);
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

    res.json({
      success: true,
      store: rows[0]
    });
  });
});

module.exports = router;

