const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload");
const db = require("../db/connection");

/* ================= CONTROLLER ================= */
const sellerController = require("../controllers/sellerController");

const {
  register,
  login,
  resubmit,
  addProduct,
  getMyProducts,
  getDashboard,
  updateStatus,
  updateProfile,
  removeStoreImage
} = sellerController;

/* =====================================================
   1️⃣ SELLER AUTH
===================================================== */

// REGISTER SELLER
router.post(
  "/register",
  upload.any(),
  register
);

// LOGIN SELLER
router.post("/login", login);

// RESUBMIT AFTER REJECTION
router.put(
  "/resubmit/:id",
  upload.any(),
  resubmit
);

/* =====================================================
   2️⃣ SELLER ONLINE / OFFLINE
===================================================== */

// PUT /api/seller/status
router.put("/status", updateStatus);
router.post("/update-profile", upload.any(), updateProfile);
router.post("/remove-store-image", removeStoreImage);

/* =====================================================
   3️⃣ PRODUCT MANAGEMENT
===================================================== */

// ADD PRODUCT
router.post(
  "/products",
  upload.array("image", 8),
  addProduct
);

// GET SELLER PRODUCTS
// GET /api/seller/products?seller_id=1
router.get("/products", getMyProducts);

// UPDATE PRODUCT
router.put("/products/:id", (req, res) => {
  const productId = Number(req.params.id);
  const { name, price, stock, mrp } = req.body;

  if (!productId || !name || price === undefined || stock === undefined) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  const sql = `
    UPDATE products
    SET name = ?, price = ?, mrp = ?, stock = ?
    WHERE id = ?
  `;

  db.query(sql, [name, price, mrp || null, stock, productId], (err, result) => {
    if (err) {
      console.error("❌ UPDATE PRODUCT ERROR:", err.sqlMessage);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully"
    });
  });
});

// DELETE PRODUCT
router.delete("/products/:id", (req, res) => {
  const productId = Number(req.params.id);

  if (!productId) {
    return res.status(400).json({
      success: false,
      message: "Invalid product id"
    });
  }

  db.query(
    "DELETE FROM products WHERE id = ?",
    [productId],
    (err, result) => {
      if (err) {
        console.error("❌ DELETE PRODUCT ERROR:", err.sqlMessage);
        return res.status(500).json({
          success: false,
          message: "Database error"
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      res.json({
        success: true,
        message: "Product deleted successfully"
      });
    }
  );
});

/* =====================================================
   4️⃣ SELLER DASHBOARD
===================================================== */

// GET /api/seller/dashboard/:id
router.get("/dashboard/:id", getDashboard);

/* =====================================================
   5️⃣ SELLER ORDERS (JSON CART SUPPORT)
===================================================== */

// GET /api/seller/orders/:sellerId
router.get("/orders/:sellerId", (req, res) => {
  const sellerIdNum = Number(req.params.sellerId);
  const sellerIdStr = String(req.params.sellerId);

  const sql = `
    SELECT
      id,
      customer_name,
      phone,
      address,
      pincode,
      total_amount,
      payment_method,
      payment_status,
      status,
      cancelled_by,
      cancelled_by_role,
      cancel_actor,
      rejected_by,
      rejected_by_role,
      status_updated_by,
      reason,
      cancel_reason,
      customer_reason,
      seller_reason,
      status_reason,
      reject_reason,
      rejection_reason,
      cancellation_reason,
      created_at,
      cart
    FROM orders
    WHERE
      JSON_CONTAINS(
        JSON_EXTRACT(cart, '$[*].seller_id'),
        CAST(? AS JSON)
      )
      OR
      JSON_CONTAINS(
        JSON_EXTRACT(cart, '$[*].storeId'),
        JSON_QUOTE(?)
      )
    ORDER BY created_at DESC
  `;

  db.query(sql, [sellerIdNum, sellerIdStr], (err, rows) => {
    if (err) {
      console.error("❌ SELLER ORDERS ERROR:", err.sqlMessage);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    }

    const orders = rows.map(order => ({
      ...order,
      cart: typeof order.cart === "string"
        ? JSON.parse(order.cart)
        : order.cart,
      status: order.status || "PENDING"
    }));

    res.json({
      success: true,
      orders
    });
  });
});

/* =====================================================
   6️⃣ ORDER STATUS UPDATE
===================================================== */

// PUT /api/seller/orders/:orderId/status
router.put("/orders/:orderId/status", (req, res) => {
  const orderId = Number(req.params.orderId);
  const {
    status,
    status_updated_by,
    cancelled_by,
    cancelled_by_role,
    cancel_actor,
    rejected_by,
    rejected_by_role,
    reason,
    cancel_reason,
    customer_reason,
    seller_reason,
    status_reason,
    reject_reason,
    rejection_reason,
    cancellation_reason
  } = req.body;

  if (!orderId || !status) {
    return res.status(400).json({
      success: false,
      message: "Order ID and status required"
    });
  }

  const sql = `
    UPDATE orders
    SET
      status = ?,
      status_updated_by = COALESCE(?, status_updated_by),
      cancelled_by = COALESCE(?, cancelled_by),
      cancelled_by_role = COALESCE(?, cancelled_by_role),
      cancel_actor = COALESCE(?, cancel_actor),
      rejected_by = COALESCE(?, rejected_by),
      rejected_by_role = COALESCE(?, rejected_by_role),
      reason = COALESCE(?, reason),
      cancel_reason = COALESCE(?, cancel_reason),
      customer_reason = COALESCE(?, customer_reason),
      seller_reason = COALESCE(?, seller_reason),
      status_reason = COALESCE(?, status_reason),
      reject_reason = COALESCE(?, reject_reason),
      rejection_reason = COALESCE(?, rejection_reason),
      cancellation_reason = COALESCE(?, cancellation_reason)
    WHERE id = ?
  `;

  const normalizedStatus = String(status).toUpperCase();
  const inferredStatusReason = status_reason || reason || null;
  const inferredCancelReason =
    cancel_reason ||
    (normalizedStatus === "CANCELLED"
      ? (customer_reason || cancellation_reason || inferredStatusReason || null)
      : null);
  const inferredCustomerReason =
    customer_reason ||
    (normalizedStatus === "CANCELLED" ? (inferredCancelReason || inferredStatusReason || null) : null);
  const inferredSellerReason =
    seller_reason ||
    (normalizedStatus === "REJECTED" ? (reject_reason || rejection_reason || inferredStatusReason || null) : null);
  const inferredRejectReason =
    reject_reason ||
    (normalizedStatus === "REJECTED" ? (inferredSellerReason || rejection_reason || inferredStatusReason || null) : null);
  const inferredRejectionReason =
    rejection_reason ||
    (normalizedStatus === "REJECTED" ? (inferredSellerReason || inferredRejectReason || inferredStatusReason || null) : null);
  const inferredCancellationReason =
    cancellation_reason ||
    (normalizedStatus === "CANCELLED" ? (inferredCancelReason || inferredCustomerReason || inferredStatusReason || null) : null);

  db.query(
    sql,
    [
      normalizedStatus,
      status_updated_by || null,
      cancelled_by || null,
      cancelled_by_role || null,
      cancel_actor || null,
      rejected_by || null,
      rejected_by_role || null,
      reason || inferredStatusReason || null,
      inferredCancelReason,
      inferredCustomerReason,
      inferredSellerReason,
      inferredStatusReason,
      inferredRejectReason,
      inferredRejectionReason,
      inferredCancellationReason,
      orderId
    ],
    (err, result) => {
    if (err) {
      console.error("❌ ORDER STATUS UPDATE ERROR:", err.sqlMessage);
      return res.status(500).json({
        success: false,
        message: "Status update failed"
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`
    });
    }
  );
});

// GET /api/seller/feedback/:sellerId
router.get("/feedback/:sellerId", (req, res) => {
  const sellerId = Number(req.params.sellerId);
  if (!sellerId) {
    return res.status(400).json({ success: false, feedback: [], message: "Invalid seller id" });
  }

  const sql = `
    SELECT
      sr.rating,
      sr.comment,
      sr.created_at
    FROM store_ratings sr
    INNER JOIN orders o ON o.id = sr.order_id
    WHERE o.seller_id = ?
    ORDER BY sr.created_at DESC
    LIMIT 100
  `;

  db.query(sql, [sellerId], (err, rows) => {
    if (err) {
      console.error("❌ SELLER FEEDBACK ERROR:", err.sqlMessage || err.message);
      return res.status(500).json({ success: false, feedback: [], message: "Database error" });
    }
    res.json({ success: true, feedback: rows || [] });
  });
});

/* =====================================================
   ✅ EXPORT ROUTER
===================================================== */
module.exports = router;
