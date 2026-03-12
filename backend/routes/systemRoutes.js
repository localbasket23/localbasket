const express = require("express");
const router = express.Router();

const { getSystemStatus, submitSupportRequest, trackSiteVisit } = require("../controllers/systemController");

// Public endpoint used by frontend to decide maintenance overlay.
router.get("/status", getSystemStatus);
router.post("/support/request", submitSupportRequest);
router.post("/analytics/visit", trackSiteVisit);

module.exports = router;
