const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const readEnv = (key) => String(process.env[key] || "").trim();

const clampInt = (value, fallback, min, max) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const rounded = Math.floor(num);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
};

const normalizeMessages = (messages = []) => {
  const list = Array.isArray(messages) ? messages : [];
  return list
    .map((m) => {
      if (!m) return null;
      const roleRaw = String(m.role || "").toLowerCase();
      const role = roleRaw === "model" || roleRaw === "assistant" || roleRaw === "bot" ? "model" : "user";
      const text = String(m.text == null ? "" : m.text).trim();
      if (!text) return null;
      return { role, text: text.slice(0, 4000) };
    })
    .filter(Boolean);
};

const extractText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || !parts.length) return "";
  return parts
    .map((p) => (p && typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
};

/* =====================================================
   GEMINI CHAT (AI STUDIO)
   POST /api/ai/gemini
===================================================== */
exports.geminiChat = async (req, res) => {
  const apiKey = readEnv("GEMINI_API_KEY");
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: "GEMINI_API_KEY not configured on server"
    });
  }

  const body = req.body || {};
  const model = String(body.model || readEnv("GEMINI_MODEL") || "gemini-2.0-flash").trim();
  const temperature = clampInt(body.temperature, 70, 0, 100) / 100;
  const maxOutputTokens = clampInt(body.maxOutputTokens, 512, 64, 2048);

  const messages = normalizeMessages(body.messages || []);
  const lastUser = String(body.query || body.prompt || "").trim();
  if (!messages.length && !lastUser) {
    return res.status(400).json({ success: false, message: "Missing messages/query" });
  }

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));
  if (lastUser) {
    contents.push({ role: "user", parts: [{ text: lastUser.slice(0, 4000) }] });
  }

  const systemInstruction = String(body.system || "").trim() || [
    "You are LocalBasket AI.",
    "Answer concisely in Hinglish.",
    "If you don't know, say you don't know.",
    "Do not ask for secrets (passwords, OTP, card details).",
  ].join(" ");

  const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens
        }
      }),
      signal: controller.signal
    });

    const ct = String(resp.headers.get("content-type") || "");
    const data = ct.includes("application/json")
      ? await resp.json().catch(() => ({}))
      : { error: await resp.text().catch(() => "") };

    if (!resp.ok) {
      const msg =
        data?.error?.message ||
        (typeof data?.error === "string" ? data.error : "") ||
        `Gemini error (${resp.status})`;
      return res.status(502).json({ success: false, message: msg });
    }

    const text = extractText(data);
    if (!text) return res.json({ success: true, text: "Sorry, I couldn't generate a response." });
    return res.json({ success: true, text });
  } catch (err) {
    const message = err?.name === "AbortError" ? "Gemini request timeout" : (err?.message || "Gemini request failed");
    return res.status(502).json({ success: false, message });
  } finally {
    clearTimeout(timeout);
  }
};

