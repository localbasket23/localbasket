const Groq = require("groq-sdk");

/* =========================================
   ENV HELPER
========================================= */
const readEnv = (key) => String(process.env[key] || "").trim();

/* =========================================
   INIT GROQ
========================================= */
const GROQ_API_KEY = readEnv("GROQ_API_KEY");

const groq = new Groq({
  apiKey: GROQ_API_KEY
});

/* =========================================
   AI CHAT
   POST /api/ai/gemini
========================================= */
exports.geminiChat = async (req, res) => {
  try {

    if (!GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GROQ_API_KEY not configured on server"
      });
    }

    const body = req.body || {};

    const query = String(
      body.query ||
      body.prompt ||
      (req.query && (req.query.query || req.query.q)) ||
      ""
    ).trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query required"
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content:
            "You are LocalBasket AI. Help users with grocery suggestions and store queries. Reply briefly in Hinglish."
        },
        {
          role: "user",
          content: query.slice(0, 4000)
        }
      ],
      temperature: 0.7,
      max_tokens: 512
    });

    const text =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "Sorry, response generate nahi ho paya.";

    return res.json({
      success: true,
      text
    });

  } catch (err) {

    console.error("AI ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err?.message || "AI request failed"
    });

  }
};

/* =========================================
   AI HEALTH
   GET /api/ai/health
========================================= */
exports.aiHealth = async (req, res) => {

  const apiKey = readEnv("GROQ_API_KEY");

  res.json({
    success: true,
    ai: {
      provider: "Groq",
      configured: !!apiKey,
      model: "llama3-8b-8192"
    }
  });

};

/* =========================================
   METHOD INFO
   GET /api/ai/gemini
========================================= */
exports.geminiInfo = async (req, res) => {

  res.status(405).json({
    success: false,
    message: 'Use POST /api/ai/gemini with JSON body {"query":"hello"}'
  });

};