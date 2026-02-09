/*************************************
 * PAYMENT CONTROLLER — RAZORPAY
 *************************************/

const razorpay = require("../config/razorpay");

/**
 * CREATE RAZORPAY ORDER
 * POST /api/payment/create
 */
exports.createPaymentOrder = async (req, res) => {
  try {
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
      currency: order.currency
    });

  } catch (error) {
    console.error("Razorpay Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create payment order"
    });
  }
};
