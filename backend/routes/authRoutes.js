const express = require("express");
const router = express.Router();
const { sendOtp, verifyOtp } = require("../controllers/authController");

// POST /auth/send-otp
router.post("/send-otp", sendOtp);

// POST /auth/verify-otp
router.post("/verify-otp", verifyOtp);

module.exports = router;

