const express = require("express");
const router = express.Router();

const { getSystemStatus } = require("../controllers/systemController");

// Public endpoint used by frontend to decide maintenance overlay.
router.get("/status", getSystemStatus);

module.exports = router;

