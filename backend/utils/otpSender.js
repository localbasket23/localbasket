const https = require("https");

const toE164 = (rawPhone) => {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length >= 11 && String(rawPhone || "").trim().startsWith("+")) {
    return `+${digits}`;
  }
  return null;
};

const postForm = (hostname, path, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(body).toString();
    const req = https.request(
      {
        method: "POST",
        hostname,
        path,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(payload),
          ...headers
        }
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          resolve({ ok, statusCode: res.statusCode, data });
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
};

const sendOtpViaTwilio = async ({ to, otp }) => {
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  const from = process.env.TWILIO_FROM_NUMBER || "";
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || "";

  if (!sid || !token || (!from && !messagingServiceSid)) {
    return {
      success: false,
      message:
        "Twilio config missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER (or TWILIO_MESSAGING_SERVICE_SID)."
    };
  }

  const path = `/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const smsBody = `Your LocalBasket OTP is ${otp}. It will expire in 5 minutes.`;
  const payload = messagingServiceSid
    ? { To: to, Body: smsBody, MessagingServiceSid: messagingServiceSid }
    : { To: to, Body: smsBody, From: from };

  const res = await postForm("api.twilio.com", path, payload, {
    Authorization: `Basic ${auth}`
  });

  if (!res.ok) {
    return {
      success: false,
      message: `Twilio OTP send failed (${res.statusCode})`
    };
  }

  return { success: true };
};

exports.sendOtpSms = async ({ phone, otp }) => {
  const to = toE164(phone);
  if (!to) {
    return {
      success: false,
      message: "Invalid phone number format for OTP"
    };
  }

  const provider = String(process.env.OTP_PROVIDER || "TWILIO").toUpperCase();

  if (provider === "TWILIO") {
    return sendOtpViaTwilio({ to, otp });
  }

  return {
    success: false,
    message: `Unsupported OTP provider: ${provider}`
  };
};

