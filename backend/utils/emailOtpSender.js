const nodemailer = require("nodemailer");

const isTruthyEnv = (value) => ["1", "true", "yes", "y", "on"].includes(String(value || "").trim().toLowerCase());
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim().toLowerCase());

const buildTransport = () => {
  const host = String(process.env.EMAIL_HOST || "").trim();
  const port = Number(process.env.EMAIL_PORT || 465);
  const secure = String(process.env.EMAIL_SECURE || "").trim()
    ? String(process.env.EMAIL_SECURE).toLowerCase() === "true"
    : port === 465;
  const user = String(process.env.EMAIL_USER || "").trim();
  const pass = String(process.env.EMAIL_PASS || "").trim();
  const from = String(process.env.EMAIL_FROM || "").trim();
  const replyTo = String(process.env.EMAIL_REPLY_TO || "").trim();

  if (!host || !user || !pass || !from) {
    return {
      ok: false,
      error: {
        success: false,
        message: "Email SMTP config missing",
        details: {
          host_present: !!host,
          user_present: !!user,
          pass_present: !!pass,
          from_present: !!from
        }
      }
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 12000,
    tls: { minVersion: "TLSv1.2" }
  });

  return {
    ok: true,
    transporter,
    meta: { from, replyTo }
  };
};

const normalizeSmtpError = (err) => {
  const raw = err || {};
  const errText = String(raw?.message || raw || "");
  const needsVerifyHint =
    /sender|from|domain|verify|verified|unauthorized|forbidden/i.test(errText) ||
    /550|553|554/.test(String(raw?.responseCode || ""));
  return {
    success: false,
    message: "Email OTP delivery failed",
    details: {
      message: errText,
      code: raw?.code || null,
      command: raw?.command || null,
      responseCode: raw?.responseCode || null,
      response: raw?.response || null,
      hint: needsVerifyHint
        ? "Check EMAIL_FROM sender/domain is verified with your SMTP provider (e.g., Resend)."
        : null
    }
  };
};

exports.sendEmailMessage = async ({ to, subject, text, html } = {}) => {
  const email = String(to || "").trim().toLowerCase();
  const subj = String(subject || "LocalBasket Notification").trim();
  const textBody = String(text || "").trim();
  const htmlBody = String(html || "").trim();

  if (!isEmail(email)) {
    return { success: false, message: "Invalid email recipient" };
  }
  if (!textBody && !htmlBody) {
    return { success: false, message: "Email body is required" };
  }

  const t = buildTransport();
  if (!t.ok) return t.error;

  try {
    if (isTruthyEnv(process.env.EMAIL_VERIFY_TRANSPORT)) {
      try {
        await t.transporter.verify();
      } catch (err) {
        console.warn("EMAIL SMTP VERIFY FAILED:", err?.message || err);
      }
    }

    await t.transporter.sendMail({
      from: t.meta.from,
      to: email,
      ...(t.meta.replyTo ? { replyTo: t.meta.replyTo } : {}),
      subject: subj,
      ...(textBody ? { text: textBody } : {}),
      ...(htmlBody ? { html: htmlBody } : {})
    });

    return { success: true };
  } catch (err) {
    return normalizeSmtpError(err);
  }
};

exports.sendOtpEmail = async ({ to, otp, subject, text } = {}) => {
  const email = String(to || "").trim().toLowerCase();
  const otpValue = String(otp || "").trim();
  const subj = String(subject || "LocalBasket OTP Verification").trim();
  const body = String(text || `Your LocalBasket OTP is ${otpValue}. Do not share it.`).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { success: false, message: "Invalid email for OTP" };
  }
  if (!/^\d{6}$/.test(otpValue)) {
    return { success: false, message: "Invalid OTP for email" };
  }

  return exports.sendEmailMessage({
    to: email,
    subject: subj,
    text: body
  });
};
