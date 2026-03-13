const express = require("express");
const router = express.Router();

const { geminiChat } = require("../controllers/aiController");

// POST /api/ai/gemini
router.post("/gemini", geminiChat);

module.exports = router;

