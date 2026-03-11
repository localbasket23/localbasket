/*
  Checkout script (UTF-8 safe)
  Fixes: avoid non-ASCII symbols in order summary that can render as '?' on some setups.
*/

"use strict";

function safeParseJson(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeIndianPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  let d = digits;
  // Accept common variants: +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

const user = safeParseJson(localStorage.getItem("lbUser") || "null", null);

if (!user || !user.id) {
  alert("Please login first");
  window.location.href = "/welcome/customer/index.html";
}

function getCartKey() {
  const id = user && user.id ? user.id : "guest";
  return `lbCart_${id}`;
}

const CART_KEY = getCartKey();

function readCartFromStorage() {
  const keys = [CART_KEY, "lbCart_guest", "lbCart"];
  for (const key of keys) {
    const parsed = safeParseJson(localStorage.getItem(key) || "[]", []);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  }
  return [];
}

let cart = readCartFromStorage();

const orderItemsBox = document.getElementById("orderItems");
const itemsTotalEl = document.getElementById("itemsTotal");
const deliveryFeeEl = document.getElementById("deliveryFee");
const gstFeeEl = document.getElementById("gstFee");
const grandTotalEl = document.getElementById("grandTotal");
const checkoutActionBtn = document.getElementById("checkoutActionBtn");
const GST_RATE = 0.05;

function getApiBases() {
  const bases = [];
  const byConfigured = typeof window !== "undefined" ? window.API_BASE_URL : null;
  const byWindow = typeof window !== "undefined" ? window.LB_API_BASE : null;
  const byStorage = localStorage.getItem("lbApiBase");
  const byOrigin =
    typeof window !== "undefined" &&
    window.location &&
    /^https?:\/\//i.test(window.location.origin)
      ? window.location.origin
      : null;

  [byConfigured, byWindow, byStorage, byOrigin].forEach((base) => {
    if (!base || typeof base !== "string") return;
    const clean = base.trim().replace(/\/+$/, "");
    if (!clean || bases.includes(clean)) return;
    bases.push(clean);
  });

  // local dev fallbacks
  ["http://localhost:5000", "http://127.0.0.1:5000"].forEach((base) => {
    if (!bases.includes(base)) bases.push(base);
  });

  return bases;
}

async function fetchJsonWithFallback(path, options = {}) {
  const isAbsolute = /^https?:\/\//i.test(String(path || "").trim());
  if (isAbsolute) {
    const res = await fetch(path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
    return data || {};
  }

  let lastError = new Error("Network request failed");
  for (const base of getApiBases()) {
    try {
      const res = await fetch(`${base}${path}`, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      return data || {};
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
if (nameInput) nameInput.value = user?.name || "";
if (phoneInput) phoneInput.value = user?.phone || "";

["address", "area", "pincode"].forEach((id) => {
  const field = document.getElementById(id);
  if (!field) return;
  const saved = localStorage.getItem("lb_" + id);
  if (saved) field.value = saved;
  field.addEventListener("input", () => {
    localStorage.setItem("lb_" + id, String(field.value || "").trim());
  });
});

function syncCheckoutButtonText() {
  const paymentEl = document.getElementById("payment");
  if (!checkoutActionBtn || !paymentEl) return;
  checkoutActionBtn.textContent = paymentEl.value === "ONLINE" ? "Proceed to Pay" : "Place Order";
}

const paymentSelect = document.getElementById("payment");
if (paymentSelect) paymentSelect.addEventListener("change", syncCheckoutButtonText);
syncCheckoutButtonText();

function formatMoney(n) {
  const val = Number(n || 0);
  return Number.isFinite(val) ? val.toFixed(2) : "0.00";
}

function renderCart() {
  if (!orderItemsBox || !itemsTotalEl || !deliveryFeeEl || !grandTotalEl) return;
  orderItemsBox.innerHTML = "";
  let itemsTotal = 0;

  if (!cart.length) {
    orderItemsBox.innerHTML = "<p class='empty'>Your cart is empty</p>";
    itemsTotalEl.innerText = "Rs. 0";
    deliveryFeeEl.innerText = "Rs. 0";
    if (gstFeeEl) gstFeeEl.innerText = "Rs. 0";
    grandTotalEl.innerText = "Rs. 0";
    return;
  }

  cart.forEach((item) => {
    const qty = Number(item.qty || 0);
    const price = Number(item.price || 0);
    const sub = qty * price;
    const itemName = item.product_name || item.name || item.productName || "Product";
    itemsTotal += sub;

    // IMPORTANT: Use ASCII "x" instead of the multiplication sign to avoid "?" rendering.
    orderItemsBox.innerHTML += `
      <div class="cart-item">
        <span>${String(itemName)} x ${qty}</span>
        <span>Rs. ${formatMoney(sub)}</span>
      </div>
    `;
  });

  const deliveryFee = itemsTotal < 100 ? 40 : 0;
  const gstAmount = Number((itemsTotal * GST_RATE).toFixed(2));
  const grandTotal = Number((itemsTotal + deliveryFee + gstAmount).toFixed(2));

  itemsTotalEl.innerText = `Rs. ${formatMoney(itemsTotal)}`;
  deliveryFeeEl.innerText = deliveryFee === 0 ? "FREE" : `Rs. ${formatMoney(deliveryFee)}`;
  if (gstFeeEl) gstFeeEl.innerText = `Rs. ${formatMoney(gstAmount)}`;
  grandTotalEl.innerText = `Rs. ${formatMoney(grandTotal)}`;
}

renderCart();

async function saveOrder(orderData) {
  const base = String(window.API_BASE_URL || "").trim().replace(/\/+$/, "");
  const path = "/api/orders/create";
  const url = base ? `${base}${path}` : path;

  const data = await fetchJsonWithFallback(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });

  if (!data.success) {
    alert(`Order failed: ${data.message || "Unable to save order"}`);
    return;
  }

  localStorage.removeItem(CART_KEY);
  window.location.href = "/welcome/customer/checkout/thankyou.html";
}

function showOrderConfirm(message) {
  const overlay = document.getElementById("confirmOverlay");
  const textEl = document.getElementById("confirmText");
  const okBtn = document.getElementById("confirmOk");
  const cancelBtn = document.getElementById("confirmCancel");

  if (!overlay || !textEl || !okBtn || !cancelBtn) {
    return Promise.resolve(confirm(message));
  }

  textEl.textContent = message;
  overlay.style.display = "flex";

  return new Promise((resolve) => {
    const cleanup = () => {
      overlay.style.display = "none";
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onOverlay);
      document.removeEventListener("keydown", onEsc);
    };

    const onOk = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onOverlay = (e) => {
      if (e.target === overlay) onCancel();
    };

    const onEsc = (e) => {
      if (e.key === "Escape") onCancel();
    };

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    overlay.addEventListener("click", onOverlay);
    document.addEventListener("keydown", onEsc);
    setTimeout(() => okBtn.focus(), 0);
  });
}

function startRazorpayPayment(orderData) {
  const DEFAULT_PUBLIC_LOGO = "https://localbasket.co.in/welcome/logo2.png?v=20260303";
  const brandLogo =
    (typeof window !== "undefined" && window.LB_BRAND_LOGO_URL) ||
    localStorage.getItem("lbBrandLogoUrl") ||
    DEFAULT_PUBLIC_LOGO;

  const payload = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: orderData.total_amount }),
  };

  const base = String(window.API_BASE_URL || "").trim().replace(/\/+$/, "");
  const p1 = `${base}/api/payment/create-order`;
  const p2 = `${base}/api/payment/create`;

  fetchJsonWithFallback(p1, payload)
    .catch(() => fetchJsonWithFallback(p2, payload))
    .then((rpOrder) => {
      if (!rpOrder || rpOrder.success === false) {
        alert(`Payment init failed: ${rpOrder?.message || "Unknown error"}`);
        return;
      }

      if (!rpOrder.id || !rpOrder.key_id) {
        alert("Payment init failed: Invalid order response");
        return;
      }

      if (typeof Razorpay === "undefined") {
        alert("Payment SDK failed to load. Please refresh and try again.");
        return;
      }

      const options = {
        key: rpOrder.key_id,
        amount: rpOrder.amount,
        currency: "INR",
        name: "Local Basket",
        image: brandLogo,
        description: "Order Payment",
        order_id: rpOrder.id,
        handler: (response) => {
          orderData.payment_status = "PAID";
          orderData.payment_id = response.razorpay_payment_id;
          saveOrder(orderData).catch((err) => alert(`Server error: ${err?.message || "Unknown error"}`));
        },
        prefill: {
          name: orderData.customer_name,
          contact: orderData.phone,
        },
        theme: { color: "#0f766e" },
      };

      new Razorpay(options).open();
    })
    .catch((err) => alert(`Payment init failed: ${err?.message || "Network error"}`));
}

async function placeOrder() {
  const name = String(document.getElementById("name")?.value || "").trim();
  const phoneInputEl = document.getElementById("phone");
  const phoneRaw = String(phoneInputEl?.value || "").trim();
  const phone = normalizeIndianPhone(phoneRaw);
  const address = String(document.getElementById("address")?.value || "").trim();
  const pincode = String(document.getElementById("pincode")?.value || "").trim();
  const paymentMethod = String(document.getElementById("payment")?.value || "COD").trim();

  if (!name || !phoneRaw || !address || !pincode) {
    alert("Error: Fill all required fields");
    return;
  }

  if (!/^[6-9]\\d{9}$/.test(phone)) {
    alert("Error: Invalid phone number");
    return;
  }

  // Normalize UI after validation (helps users see what format we accept)
  try {
    if (phoneInputEl) phoneInputEl.value = phone;
  } catch {}

  if (!/^\\d{6}$/.test(pincode)) {
    alert("Error: Invalid pincode");
    return;
  }

  cart = readCartFromStorage();
  if (!cart.length) {
    alert("Error: Cart is empty");
    return;
  }

  const itemsTotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  try {
    const storeId = Number(cart[0]?.storeId || 0);
    if (storeId) {
      const base = String(window.API_BASE_URL || "").trim().replace(/\/+$/, "");
      const data = await fetchJsonWithFallback(`${base}/api/stores/${storeId}`);
      const minOrder = Number(data?.store?.minimum_order || 100);
      if (itemsTotal < minOrder) {
        alert(`Error: Minimum order is Rs. ${minOrder}. Please add more items.`);
        return;
      }
    }
  } catch {
    // Do not block checkout if store fetch fails.
  }

  const deliveryFee = itemsTotal < 100 ? 40 : 0;
  const gstAmount = Number((itemsTotal * GST_RATE).toFixed(2));
  const total = Number((itemsTotal + deliveryFee + gstAmount).toFixed(2));

  const orderData = {
    seller_id: cart[0].storeId,
    customer_id: user.id,
    customer_name: name,
    phone,
    address,
    pincode,
    cart,
    total_amount: total,
    payment_method: paymentMethod,
    payment_status: paymentMethod === "COD" ? "PENDING" : "INITIATED",
    payment_id: null,
  };

  const confirmed = await showOrderConfirm(`Do you want to place this order for Rs. ${formatMoney(total)}?`);
  if (!confirmed) return;

  if (paymentMethod === "ONLINE") {
    startRazorpayPayment(orderData);
  } else {
    try {
      await saveOrder(orderData);
    } catch (err) {
      alert(`Server error: ${err?.message || "Unknown error"}`);
    }
  }
}

// expose for inline onclick in checkout.html
window.placeOrder = placeOrder;
