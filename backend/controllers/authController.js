const util = require("util");
const https = require("https");
const nodemailer = require("nodemailer");
const db = require("../db/connection");

const query = util.promisify(db.query).bind(db);
const OTP_TTL_MINUTES = 5;

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const normalizePhone = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
};

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim().toLowerCase());

const httpsPostJson = (url, payload, headers = {}) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...headers
        }
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            parsed = data;
          }
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            body: parsed
          });
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
};

const sendWhatsappOtp = async ({ phone, otp }) => {
  const token = String(process.env.WHATSAPP_TOKEN || "").trim();
  const phoneNumberId = String(process.env.PHONE_NUMBER_ID || "").trim();
  const templateName = String(process.env.WHATSAPP_TEMPLATE_NAME || "").trim();
  const templateLang = String(process.env.WHATSAPP_TEMPLATE_LANG || "en").trim();

  if (!token || !phoneNumberId) {
    return {
      success: false,
      message: "WhatsApp API config missing"
    };
  }

  const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`;
  const messageBody = `Your LocalBasket OTP is ${otp}. Do not share it.`;
  const payload = templateName
    ? {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }]
            }
          ]
        }
      }
    : {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: messageBody }
      };

  const res = await httpsPostJson(url, payload, {
    Authorization: `Bearer ${token}`
  });

  if (!res.ok) {
    return {
      success: false,
      message: "WhatsApp OTP delivery failed",
      details: res.body
    };
  }

  return { success: true };
};

const sendEmailOtp = async ({ email, otp }) => {
  const user = String(process.env.EMAIL_USER || "localbasket.helpdesk@gmail.com").trim();
  const pass = String(process.env.EMAIL_PASS || "").trim();
  const host = String(process.env.EMAIL_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.EMAIL_PORT || 465);
  const secure = String(process.env.EMAIL_SECURE || "").trim()
    ? String(process.env.EMAIL_SECURE).toLowerCase() === "true"
    : port === 465;
  const from = String(process.env.EMAIL_FROM || `"LocalBasket" <${user}>`).trim();

  if (!user || !pass) {
    return {
      success: false,
      message: "Email SMTP config missing"
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  try {
    // Some SMTP providers may fail verify() even though sendMail works; don't hard-fail here.
    try {
      await transporter.verify();
    } catch (err) {
      console.warn("EMAIL SMTP VERIFY FAILED:", err?.message || err);
    }
    await transporter.sendMail({
      from,
      to: email,
      subject: "LocalBasket OTP Verification",
      text: `Your LocalBasket OTP is ${otp}. Do not share it.`
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: "Email OTP delivery failed",
      details: err?.message || String(err || "")
    };
  }
};

const isProductionEnv = () => String(process.env.NODE_ENV || "").toLowerCase() === "production";
const isTruthyEnv = (value) => ["1", "true", "yes", "y", "on"].includes(String(value || "").trim().toLowerCase());
const shouldReturnDebugOtp = () => !isProductionEnv() && isTruthyEnv(process.env.OTP_DEBUG_RETURN);

exports.sendOtp = async (req, res) => {
  try {
    const rawPhone = String(req.body.phone || "").trim();
    const rawEmail = String(req.body.email || "").trim().toLowerCase();

    const phone = normalizePhone(rawPhone);
    const email = rawEmail;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Valid phone is required"
      });
    }

    if (!isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required"
      });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const [waResult, emailResult] = await Promise.allSettled([
      sendWhatsappOtp({ phone, otp }),
      sendEmailOtp({ email, otp })
    ]);

    const whatsapp = waResult.status === "fulfilled" ? waResult.value : {
      success: false,
      message: "WhatsApp OTP delivery failed",
      details: waResult.reason?.message || "Unknown error"
    };
    const mail = emailResult.status === "fulfilled" ? emailResult.value : {
      success: false,
      message: "Email OTP delivery failed",
      details: emailResult.reason?.message || "Unknown error"
    };

    const sentOn = [];
    if (whatsapp.success) sentOn.push("WhatsApp");
    if (mail.success) sentOn.push("email");

    if (!sentOn.length) {
      console.error("OTP CHANNEL FAILURE:", { whatsapp, email: mail });
      if (shouldReturnDebugOtp()) {
        console.warn("AUTH OTP DEBUG MODE: returning OTP in response (non-production only).");
        return res.json({
          success: true,
          message: `OTP generated (debug): ${otp}`,
          debug_otp: otp
        });
      }
      return res.status(502).json({
        success: false,
        message: "OTP delivery failed on all channels",
        ...(isProductionEnv() ? {} : { channels: { whatsapp, email: mail } })
      });
    }

    await query("DELETE FROM otp_verifications WHERE expires_at < NOW()");
    await query(
      `INSERT INTO otp_verifications (phone, email, otp, expires_at)
       VALUES (?, ?, ?, ?)`,
      [phone, email, otp, expiresAt]
    );

    return res.json({
      success: true,
      message: `OTP sent to ${sentOn.join(" and ")}`
    });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!phone || !isEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "phone, email and 6-digit otp are required"
      });
    }

    const rows = await query(
      `SELECT id, expires_at
       FROM otp_verifications
       WHERE phone = ? AND email = ? AND otp = ?
       ORDER BY id DESC
       LIMIT 1`,
      [phone, email, otp]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const record = rows[0];
    if (new Date(record.expires_at).getTime() < Date.now()) {
      await query("DELETE FROM otp_verifications WHERE id = ?", [record.id]);
      return res.status(401).json({
        success: false,
        message: "OTP expired"
      });
    }

    await query("DELETE FROM otp_verifications WHERE id = ?", [record.id]);

    return res.json({
      success: true,
      message: "OTP verified successfully"
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP"
    });
  }
};
