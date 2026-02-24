/*************************************
 * PAYMENT CONTROLLER — RAZORPAY
 *************************************/

const razorpay = require("../config/razorpay");

exports.paymentStatus = (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const mode = keyId.startsWith("rzp_live_")
    ? "live"
    : keyId.startsWith("rzp_test_")
      ? "test"
      : "unknown";

  return res.status(200).json({
    success: true,
    has_key_id: Boolean(keyId),
    has_key_secret: Boolean(keySecret),
    mode,
    key_id_hint: keyId ? `${keyId.slice(0, 10)}...` : null
  });
};

/**
 * CREATE RAZORPAY ORDER
 * POST /api/payment/create
 */
exports.createPaymentOrder = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Razorpay keys are not configured on server"
      });
    }

    const { amount } = req.body;

    // ✅ Validation
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    // ✅ Razorpay order options
    const options = {
      amount: Math.round(amount * 100), // convert ₹ to paise
      currency: "INR",
      receipt: "lb_" + Date.now(),
      payment_capture: 1
    };

    // ✅ Create order
    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID || ""
    });

  } catch (error) {
    console.error("Razorpay Order Error:", error);

    const detailedMessage =
      error?.error?.description ||
      error?.description ||
      error?.error?.reason ||
      error?.reason ||
      error?.message ||
      "Failed to create payment order";

    return res.status(500).json({
      success: false,
      message: detailedMessage
    });
  }
};
