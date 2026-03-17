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

const ALLOWED_MODELS = new Set([
  // Recommended replacements for deprecated llama3-8b/70b-8192.
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  // Optional newer models (keep allowlist explicit to avoid accidental invalid IDs).
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct"
]);

const normalizeRole = (role) => {
  const r = String(role || "").trim().toLowerCase();
  if (r === "system") return "system";
  if (r === "assistant" || r === "model" || r === "bot") return "assistant";
  return "user";
};

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

    const requestedModel = String(body.model || "").trim();
    const envModel = readEnv("GROQ_MODEL");
    const modelCandidate = requestedModel || envModel || "llama-3.1-8b-instant";
    const model = ALLOWED_MODELS.has(modelCandidate) ? modelCandidate : "llama-3.1-8b-instant";

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

    const systemText = String(body.system || "").trim() ||
      "You are LocalBasket AI. Help users with grocery suggestions and store queries. Reply briefly in Hinglish.";

    const history = Array.isArray(body.messages) ? body.messages : [];
    const historyMsgs = history
      .slice(-10)
      .map((m) => ({
        role: normalizeRole(m && m.role),
        content: String(m && (m.content || m.text) || "").trim()
      }))
      .filter((m) => m.content);

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemText.slice(0, 2000)
        },
        ...historyMsgs,
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
      model: readEnv("GROQ_MODEL") || "llama-3.1-8b-instant"
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
