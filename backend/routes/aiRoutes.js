const express = require("express");
const router = express.Router();

const { geminiChat, aiHealth, geminiInfo } = require("../controllers/aiController");

// GET /api/ai/health
router.get("/health", aiHealth);

// GET /api/ai/gemini (method hint)
router.get("/gemini", geminiInfo);

// POST /api/ai/gemini
router.post("/gemini", geminiChat);

module.exports = router;
