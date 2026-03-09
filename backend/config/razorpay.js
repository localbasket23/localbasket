const Razorpay = require("razorpay");

let razorpayClient = null;

function getRazorpay() {
  if (razorpayClient) return razorpayClient;

  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    console.warn("Razorpay is not configured: missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
    return null;
  }

  try {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
    return razorpayClient;
  } catch (err) {
    console.error("Failed to initialize Razorpay client", err.message || err);
    return null;
  }
}

module.exports = getRazorpay;
