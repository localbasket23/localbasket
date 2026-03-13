const Groq = require("groq-sdk");

const readEnv = (key) => String(process.env[key] || "").trim();

const groq = new Groq({
  apiKey: readEnv("GROQ_API_KEY")
});

/* =========================================
   AI CHAT
   POST /api/ai/gemini
========================================= */
exports.geminiChat = async (req, res) => {
  try {

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
          content: "You are LocalBasket AI. Suggest grocery items and answer in Hinglish."
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.7,
      max_tokens: 512
    });

    const text = completion?.choices?.[0]?.message?.content || "No response";

    res.json({
      success: true,
      text
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};


/* =========================================
   HEALTH
========================================= */
exports.aiHealth = async (req, res) => {

  const apiKey = readEnv("GROQ_API_KEY");

  res.json({
    success: true,
    ai: {
      provider: "Groq",
      configured: !!apiKey
    }
  });

};


/* =========================================
   INFO
========================================= */
exports.geminiInfo = async (req, res) => {

  res.status(405).json({
    success: false,
    message: "Use POST /api/ai/gemini with JSON body {\"query\":\"hello\"}"
  });

};