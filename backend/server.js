if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const db = require("./db/connection");

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

// CORS: allow configured frontend origins, fallback to all.
const allowedOrigins = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : "*",
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

app.get("/api/health", async (req, res) => {
  try {
    await db.promise().query("SELECT 1 AS ok");
    res.json({
      status: "ok",
      env: !!process.env.DATABASE_URL
    });
  } catch (err) {
    console.error("HEALTH CHECK DB ERROR:", {
      message: err.message || String(err),
      code: err.code || null,
      errno: err.errno || null
    });
    res.status(500).json({
      status: "error",
      env: !!process.env.DATABASE_URL,
      message: err.message || "Database connection failed"
    });
  }
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
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => {
    console.log(`LocalBasket backend listening on port ${port}`);
  });
}

module.exports = app;
