const { sendEmailMessage } = require("./emailOtpSender");

const APP_NAME = String(process.env.CUSTOMER_APP_NAME || process.env.INVOICE_BRAND_NAME || "LocalBasket").trim();
const SUPPORT_EMAIL = String(
  process.env.CUSTOMER_SUPPORT_EMAIL ||
  process.env.EMAIL_REPLY_TO ||
  process.env.INVOICE_SUPPORT ||
  "localbasket.helpdesk@gmail.com"
).trim();
const PORTAL_URL = String(process.env.CUSTOMER_PORTAL_URL || process.env.FRONTEND_ORIGIN || "").trim();

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim().toLowerCase());
const money = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? `Rs. ${n.toFixed(2)}` : "Rs. 0.00";
};
const safe = (value) => String(value == null ? "" : value).replace(/\s+/g, " ").trim();
const escapeHtml = (value) => String(value == null ? "" : value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");
const normalizeCart = (cart) => {
  if (Array.isArray(cart)) return cart;
  if (typeof cart === "string") {
    try {
      const parsed = JSON.parse(cart);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};
const buildOrderLines = (cart) => {
  const items = normalizeCart(cart);
  if (!items.length) return ["- Order items will be visible in your My Orders section."];

  return items.map((item, index) => {
    const name = safe(item?.name || item?.product_name || `Item ${index + 1}`);
    const qty = Number(item?.qty || item?.quantity || 1);
    const price = Number(item?.price || 0);
    const unit = safe(item?.unit || "");
    const unitText = unit ? ` (${unit})` : "";
    return `- ${name}${unitText} x ${Number.isFinite(qty) ? qty : 1} = ${money((Number.isFinite(qty) ? qty : 1) * (Number.isFinite(price) ? price : 0))}`;
  });
};
const withPortalLine = () => (
  PORTAL_URL
    ? `Open ${APP_NAME}: ${PORTAL_URL}`
    : `Open ${APP_NAME} app/website and check the My Orders section for live updates.`
);

const sendCustomerMail = async ({ email, subject, lines }) => {
  const to = String(email || "").trim().toLowerCase();
  if (!isEmail(to)) return { success: false, message: "Customer email missing or invalid" };

  const text = lines.filter(Boolean).join("\n");
  const htmlParts = [];
  let listBuffer = [];

  for (const rawLine of lines.filter(Boolean)) {
    if (/^- /.test(rawLine)) {
      listBuffer.push(`<li>${escapeHtml(safe(rawLine.slice(2)))}</li>`);
      continue;
    }
    if (listBuffer.length) {
      htmlParts.push(`<ul>${listBuffer.join("")}</ul>`);
      listBuffer = [];
    }
    htmlParts.push(`<p>${escapeHtml(safe(rawLine))}</p>`);
  }

  if (listBuffer.length) {
    htmlParts.push(`<ul>${listBuffer.join("")}</ul>`);
  }

  return sendEmailMessage({
    to,
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">${htmlParts.join("")}</div>`
  });
};

exports.sendWelcomeEmail = async ({ name, email, phone }) => {
  return sendCustomerMail({
    email,
    subject: `Welcome to ${APP_NAME}`,
    lines: [
      `Hi ${safe(name) || "Customer"},`,
      `Welcome to ${APP_NAME}. Your customer account has been created successfully.`,
      "How you can login:",
      `- Use your registered email or phone number with your password.`,
      `- You can also use OTP login from your registered email/phone whenever that option is shown.`,
      phone ? `- Your registered mobile number is ${safe(phone)}.` : "",
      withPortalLine(),
      "What to do next:",
      "- Login and complete your profile if needed.",
      "- Add products to cart and place your first order.",
      "- Keep this email and your registered phone/email handy for login or password reset.",
      SUPPORT_EMAIL ? `Need help? Reply here or contact ${SUPPORT_EMAIL}.` : ""
    ]
  });
};

exports.sendOrderPlacedEmail = async ({
  customerName,
  customerEmail,
  orderId,
  storeName,
  totalAmount,
  paymentMethod,
  paymentStatus,
  address,
  pincode,
  cart
}) => {
  return sendCustomerMail({
    email: customerEmail,
    subject: `${APP_NAME} order #${orderId} placed successfully`,
    lines: [
      `Hi ${safe(customerName) || "Customer"},`,
      `Your order #${safe(orderId)} has been placed successfully${storeName ? ` with ${safe(storeName)}` : ""}.`,
      "Order summary:",
      `- Order ID: #${safe(orderId)}`,
      storeName ? `- Store: ${safe(storeName)}` : "",
      `- Total amount: ${money(totalAmount)}`,
      `- Payment method: ${safe(paymentMethod || "COD")}`,
      `- Payment status: ${safe(paymentStatus || "PENDING")}`,
      address ? `- Delivery address: ${safe(address)}${pincode ? ` - ${safe(pincode)}` : ""}` : "",
      ...buildOrderLines(cart),
      "What happens next:",
      "- The store will review and confirm your order.",
      "- You can track status updates in My Orders.",
      "- At delivery time, keep your delivery OTP ready if the app shows one.",
      "- If there is any issue, contact support or the store from the app.",
      withPortalLine(),
      SUPPORT_EMAIL ? `Support email: ${SUPPORT_EMAIL}` : ""
    ]
  });
};

exports.sendOrderDeliveredEmail = async ({
  customerName,
  customerEmail,
  orderId,
  storeName,
  totalAmount,
  paymentMethod,
  paymentStatus
}) => {
  return sendCustomerMail({
    email: customerEmail,
    subject: `${APP_NAME} order #${orderId} delivered successfully`,
    lines: [
      `Hi ${safe(customerName) || "Customer"},`,
      `Your order #${safe(orderId)} has been delivered successfully${storeName ? ` from ${safe(storeName)}` : ""}.`,
      "Delivery summary:",
      `- Order ID: #${safe(orderId)}`,
      `- Total amount: ${money(totalAmount)}`,
      `- Payment method: ${safe(paymentMethod || "COD")}`,
      `- Payment status: ${safe(paymentStatus || "PENDING")}`,
      "What you can do now:",
      "- Check the delivered items once.",
      "- Download invoice or review the order from My Orders.",
      "- Share feedback/rating if the app asks for it.",
      "- Contact support quickly if anything is missing or incorrect.",
      withPortalLine(),
      SUPPORT_EMAIL ? `Support email: ${SUPPORT_EMAIL}` : "",
      `Thank you for shopping with ${APP_NAME}.`
    ]
  });
};
