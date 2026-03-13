const express = require("express");
const router = express.Router();

const { geminiChat, aiHealth } = require("../controllers/aiController");

// GET /api/ai/health
router.get("/health", aiHealth);

// POST /api/ai/gemini
router.post("/gemini", geminiChat);

module.exports = router;
