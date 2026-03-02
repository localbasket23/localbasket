require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const customerRoutes = require("./routes/customerRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const storeRoutes = require("./routes/storeRoutes");
const productRoutes = require("./routes/productRoutes");
const locationRoutes = require("./routes/locationRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Allow all origins for cloud deployments behind different frontends.
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    message: "LocalBasket API running",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/customer", customerRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/auth", authRoutes);

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "LocalBasket API base",
    endpoints: {
      health: "/api/health",
      customer: [
        "POST /api/customer/login",
        "POST /api/customer/login-otp/request",
        "POST /api/customer/login-otp/verify"
      ],
      seller: [
        "POST /api/seller/login",
        "POST /api/seller/login-otp/request",
        "POST /api/seller/login-otp/verify"
      ],
      auth: [
        "POST /api/auth/send-otp",
        "POST /api/auth/verify-otp"
      ]
    }
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "LocalBasket Backend Running"
  });
});

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  if (err && err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected field",
      field: err.field || null,
      path: req.originalUrl || req.url || null
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const publicApiUrl = process.env.PUBLIC_API_URL || `http://0.0.0.0:${PORT}`;

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("Server is running");
    console.log(`API URL: ${publicApiUrl}`);
    console.log("Health Check: /api/health");
  });

  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise Rejection:", err);
    server.close(() => process.exit(1));
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    server.close(() => process.exit(1));
  });
}

module.exports = app;
