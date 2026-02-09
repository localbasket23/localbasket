const express = require("express");
const router = express.Router();

const customerController = require("../controllers/customerController");
const { register, login, updateProfile, requireAuth } = customerController;

/* =====================================================
   CUSTOMER ROUTES
   BASE URL: /api/customer
===================================================== */

// POST /api/customer/register
router.post("/register", register);

// POST /api/customer/login
router.post("/login", login);

// PUT /api/customer/profile
router.put("/profile", requireAuth, updateProfile);

module.exports = router;
