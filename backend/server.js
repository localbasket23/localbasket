/**
 * =====================================================
 * LOCAL BASKET — BACKEND SERVER
 * CLEAN • STABLE • MOBILE + FRONTEND READY
 * =====================================================
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

/* =====================================================
   ROUTE IMPORTS
===================================================== */
const customerRoutes = require("./routes/customerRoutes");
const sellerRoutes   = require("./routes/sellerRoutes");
const adminRoutes    = require("./routes/adminRoutes");
const storeRoutes    = require("./routes/storeRoutes");
const productRoutes  = require("./routes/productRoutes");
const locationRoutes = require("./routes/locationRoutes");
const orderRoutes    = require("./routes/orderRoutes");
const paymentRoutes  = require("./routes/paymentRoutes");

/* =====================================================
   APP INIT
===================================================== */
const app = express();

/* =====================================================
   GLOBAL MIDDLEWARE
===================================================== */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* =====================================================
   STATIC FILES — UPLOADS
===================================================== */
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(uploadDir));

/* =====================================================
   HEALTH CHECK
===================================================== */
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    message: "LocalBasket API running",
    timestamp: new Date().toISOString()
  });
});

/* =====================================================
   API ROUTES
===================================================== */
console.log("🔌 Loading API routes...");

app.use("/api/customer", customerRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "LocalBasket API base",
    endpoints: {
      health: "/health",
      customer: [
        "POST /api/customer/login",
        "POST /api/customer/login-otp/request",
        "POST /api/customer/login-otp/verify"
      ],
      seller: [
        "POST /api/seller/login",
        "POST /api/seller/login-otp/request",
        "POST /api/seller/login-otp/verify"
      ]
    }
  });
});

/* =====================================================
   ROOT ROUTE
===================================================== */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "LocalBasket Backend Running 🚀"
  });
});

/* =====================================================
   API 404 HANDLER
===================================================== */
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);
  if (err && err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected field",
      field: err.field || null,
      path: req.originalUrl || req.url || null
    });
  }
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

/* =====================================================
   SERVER START (🔥 MOBILE SAFE 🔥)
===================================================== */
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on all devices`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`🌐 http://<YOUR-IP>:${PORT}`);
  console.log(`📌 Health Check : /health`);
});

/* =====================================================
   PROCESS SAFETY
===================================================== */
process.on("unhandledRejection", err => {
  console.error("❌ Unhandled Promise Rejection:", err);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", err => {
  console.error("❌ Uncaught Exception:", err);
  server.close(() => process.exit(1));
});
