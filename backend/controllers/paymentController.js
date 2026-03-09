/*************************************
 * PAYMENT CONTROLLER - RAZORPAY
 *************************************/

const getRazorpay = require("../config/razorpay");

exports.paymentStatus = (req, res) => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
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

exports.createPaymentOrder = async (req, res) => {
  try {
    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!keyId || !keySecret) {
      return res.status(500).json({
        success: false,
        message: "Razorpay keys are not configured on server"
      });
    }

    const { amount } = req.body || {};
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: "Razorpay client initialization failed"
      });
    }

    const options = {
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      receipt: `lb_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId
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
