const express = require("express");
const router = express.Router();

const { getSystemStatus, submitSupportRequest } = require("../controllers/systemController");

// Public endpoint used by frontend to decide maintenance overlay.
router.get("/status", getSystemStatus);
router.post("/support/request", submitSupportRequest);

module.exports = router;
