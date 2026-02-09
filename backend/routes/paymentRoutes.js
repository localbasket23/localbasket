const express = require("express");
const router = express.Router();
const { createPaymentOrder } = require("../controllers/paymentController");

router.post("/create", createPaymentOrder);
module.exports = router;

