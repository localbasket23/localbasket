const express = require("express");
const router = express.Router();

const customerController = require("../controllers/customerController");
const {
  register,
  login,
  requestLoginOtp,
  verifyLoginOtp,
  updateProfile,
  requireAuth
} = customerController;

/* =====================================================
   CUSTOMER ROUTES
   BASE URL: /api/customer
===================================================== */

// POST /api/customer/register
router.post("/register", register);

// POST /api/customer/login
router.post("/login", login);

// POST /api/customer/login-otp/request
router.post("/login-otp/request", requestLoginOtp);
router.post("/request-otp", requestLoginOtp);
router.post("/otp/request", requestLoginOtp);

// POST /api/customer/login-otp/verify
router.post("/login-otp/verify", verifyLoginOtp);
router.post("/verify-otp", verifyLoginOtp);
router.post("/otp/verify", verifyLoginOtp);

// PUT /api/customer/profile
router.put("/profile", requireAuth, updateProfile);

module.exports = router;
