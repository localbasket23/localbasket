const router = require("express").Router();

/* =====================================================
   CONTROLLER IMPORTS
===================================================== */
const {
  createOrder,
  getCustomerOrders,
  getSellerOrders,
  getAllOrders,
  updateOrderStatus,
  submitOrderFeedback,
  getOrderInvoice
} = require("../controllers/orderController");

/* =====================================================
   ORDER ROUTES â SINGLE SOURCE OF TRUTH
===================================================== */

/**
 * 1ï¸â£ CREATE ORDER
 * POST /api/orders/create
 */
router.post("/create", createOrder);

/**
 * 2ï¸â£ CUSTOMER â MY ORDERS
 * GET /api/orders/customer/:customerId
 */
router.get("/customer/:customerId", (req, res, next) => {
  const { customerId } = req.params;

  if (!customerId) {
    return res.status(400).json({
      success: false,
      orders: [],
      message: "Customer ID is required"
    });
  }

  next();
}, getCustomerOrders);

/**
 * 3ï¸â£ SELLER â ORDERS DASHBOARD
 * GET /api/orders/seller/:sellerId
 */
router.get("/seller/:sellerId", (req, res, next) => {
  const { sellerId } = req.params;

  if (!sellerId) {
    return res.status(400).json({
      success: false,
      orders: [],
      message: "Seller ID is required"
    });
  }

  next();
}, getSellerOrders);

/**
 * 4ï¸â£ ADMIN â ALL ORDERS
 * GET /api/orders/all
 */
router.get("/all", getAllOrders);

/**
 * 5?? CUSTOMER ? ORDER INVOICE
 * GET /api/orders/:orderId/invoice
 */
router.get("/:orderId/invoice", (req, res, next) => {
  const { orderId } = req.params;
  if (!orderId) {
    return res.status(400).json({ success: false, message: "orderId is required" });
  }
  next();
}, getOrderInvoice);

/**
 * 5?? CUSTOMER  ORDER FEEDBACK
 * POST /api/orders/:orderId/feedback
 */
router.post("/:orderId/feedback", (req, res, next) => {
  const { orderId } = req.params;
  if (!orderId) {
    return res.status(400).json({ success: false, message: "orderId is required" });
  }
  next();
}, submitOrderFeedback);
/**
 * 5ï¸â£ UPDATE ORDER STATUS (ð¥ CORE ROUTE)
 * PUT /api/orders/:orderId/status
 *
 * Body example:
 * {
 *   status: "CONFIRMED" | "PACKED" | "DELIVERED" | "REJECTED",
 *   cancelled_by?: "CUSTOMER" | "SELLER",
 *   reason?: "string"
 * }
 *
 * Notes:
 * - Customer cancel  â status = REJECTED + cancelled_by = CUSTOMER
 * - Seller reject   â status = REJECTED + cancelled_by = SELLER
 * - This is the ONLY route to change order state
 */
router.put("/:orderId/status", (req, res, next) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!orderId || !status) {
    return res.status(400).json({
      success: false,
      message: "orderId and status are required"
    });
  }

  // Normalize for controller
  req.body.order_id = Number(orderId);
  req.body.status = String(status).toUpperCase();

  next();
}, updateOrderStatus);

module.exports = router;

