const express = require("express");
const router = express.Router();

console.log("🔥 Admin Routes Loaded");

/* ================= CONTROLLER ================= */
const adminController = require("../controllers/adminController");

const {
  getDashboardStats,
  getFullReport,
  getPayments,
  releasePayout,
  getAllSellers,
  getPendingSellers,
  approveSeller,
  rejectSeller,
  updateSellerStatus,
  blockSeller,
  updateCommission,
  getAllOrders,
  getOrderDetails,
  saveGlobalCommission,
  savePayoutSettings,
  saveSystemSettings,
  getAllSettings,
  getSellerAuditLogs,
  // ✅ CATEGORY
  getCategories,
  addCategory,
  toggleCategoryStatus,
  deleteCategory
} = adminController;

/* =====================================================
   ADMIN ROUTES
   BASE URL: /api/admin
===================================================== */

/* ================= DASHBOARD ================= */

// GET /api/admin/dashboard
router.get("/dashboard", getDashboardStats);

// GET /api/admin/full-report
router.get("/full-report", getFullReport);

// GET /api/admin/seller-audit
router.get("/seller-audit", getSellerAuditLogs);

// GET /api/admin/payments
router.get("/payments", getPayments);
// POST /api/admin/payments/release
router.post("/payments/release", releasePayout);

/* ================= SELLER MANAGEMENT ================= */

// MASTER SELLER LIST
// GET /api/admin/sellers
router.get("/sellers", getAllSellers);

// GET /api/admin/sellers/pending
router.get("/sellers/pending", getPendingSellers);

// POST /api/admin/sellers/:id/approve
router.post("/sellers/:id/approve", (req, res) =>
  approveSeller({ ...req, body: { seller_id: req.params.id } }, res)
);

// POST /api/admin/sellers/:id/reject
router.post("/sellers/:id/reject", (req, res) =>
  rejectSeller({
    ...req,
    body: {
      seller_id: req.params.id,
      reason: req.body.reason
    }
  }, res)
);

// GENERIC STATUS UPDATE
// POST /api/admin/sellers/status
router.post("/sellers/status", updateSellerStatus);

// BLOCK / UNBLOCK SELLER
// POST /api/admin/sellers/block
router.post("/sellers/block", blockSeller);

// UPDATE SELLER COMMISSION
// POST /api/admin/sellers/commission
router.post("/sellers/commission", updateCommission);

/* ================= ORDERS ================= */

// GET /api/admin/orders
router.get("/orders", getAllOrders);

// GET /api/admin/orders/:id
router.get("/orders/:id", getOrderDetails);

/* ================= SETTINGS ================= */

// POST /api/admin/settings/commission
router.post("/settings/commission", saveGlobalCommission);
// POST /api/admin/settings/payout
router.post("/settings/payout", savePayoutSettings);
// POST /api/admin/settings/system
router.post("/settings/system", saveSystemSettings);

// GET /api/admin/settings
router.get("/settings", getAllSettings);

/* ================= CATEGORIES ================= */

// GET /api/admin/categories
router.get("/categories", getCategories);

// POST /api/admin/categories
router.post("/categories", addCategory);

// PUT /api/admin/categories/:id/status
router.put("/categories/:id/status", toggleCategoryStatus);

// DELETE /api/admin/categories/:id
router.delete("/categories/:id", deleteCategory);

/* =====================================================
   EXPORT
===================================================== */
module.exports = router;



