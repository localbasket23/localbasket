const express = require("express");
const router = express.Router();

const {
  geminiChat,
  aiHealth,
  geminiInfo
} = require("../controllers/aiController");


/* =========================================
   AI HEALTH CHECK
   GET /api/ai/health
========================================= */
router.get("/health", aiHealth);


/* =========================================
   METHOD INFO
   GET /api/ai/gemini
========================================= */
router.get("/gemini", geminiInfo);


/* =========================================
   AI CHAT (Groq backend)
   POST /api/ai/gemini
========================================= */
router.post("/gemini", geminiChat);


module.exports = router;