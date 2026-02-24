const express = require("express");
const router = express.Router();
const { createPaymentOrder, paymentStatus } = require("../controllers/paymentController");

router.get("/status", paymentStatus);
router.post("/create", createPaymentOrder);
router.post("/create-order", createPaymentOrder);
module.exports = router;

