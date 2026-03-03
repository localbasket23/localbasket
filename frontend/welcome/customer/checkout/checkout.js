/*************************************
 * CHECKOUT SCRIPT — FINAL (FIXED)
 *************************************/

/* ================= AUTH CHECK ================= */
function safeParseJson(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const user = safeParseJson(localStorage.getItem("lbUser") || "null", null);

if (!user || !user.id) {
  alert("Please login first");
  window.location.href = "/welcome/customer/index.html";
}

/* ================= CART (PER USER) ================= */
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

/* ================= DOM ELEMENTS ================= */
const orderItemsBox = document.getElementById("orderItems");
const itemsTotalEl  = document.getElementById("itemsTotal");
const deliveryFeeEl = document.getElementById("deliveryFee");
const gstFeeEl      = document.getElementById("gstFee");
const grandTotalEl  = document.getElementById("grandTotal");
const checkoutActionBtn = document.getElementById("checkoutActionBtn");
const GST_RATE = 0.05;
const LOCAL_API_BASES = [
  "http://localhost:5000",
  "http://127.0.0.1:5000"
];
const FALLBACK_API_BASE =
  typeof window !== "undefined" &&
  window.location &&
  /^https?:\/\//i.test(window.location.origin)
    ? window.location.origin
    : "";

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

  [byConfigured, byWindow, byStorage, byOrigin, ...LOCAL_API_BASES, FALLBACK_API_BASE].forEach((base) => {
    if (!base || typeof base !== "string") return;
    const clean = base.trim().replace(/\/+$/, "");
    if (!clean || bases.includes(clean)) return;
    bases.push(clean);
  });

  return bases;
}

async function fetchJsonWithFallback(path, options = {}) {
  const isAbsolute = /^https?:\/\//i.test(String(path || "").trim());
  if (isAbsolute) {
    const res = await fetch(path, options);
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(
        (data && data.message) ||
        (data && data.error) ||
        `HTTP ${res.status}`
      );
    }

    return data || {};
  }

  const bases = getApiBases();
  let lastError = "Unknown network error";

  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, options);
      const text = await res.text();
      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        lastError =
          (data && data.message) ||
          (data && data.error) ||
          `HTTP ${res.status}`;
        continue;
      }

      return data || {};
    } catch (err) {
      lastError = err && err.message ? err.message : "Network request failed";
    }
  }

  throw new Error(lastError);
}

/* ================= AUTO FILL USER ================= */
const nameInput  = document.getElementById("name");
const phoneInput = document.getElementById("phone");

if (nameInput)  nameInput.value  = user.name  || "";
if (phoneInput) phoneInput.value = user.phone || "";

function syncCheckoutButtonText() {
  const paymentEl = document.getElementById("payment");
  if (!checkoutActionBtn || !paymentEl) return;
  checkoutActionBtn.textContent =
    paymentEl.value === "ONLINE" ? "Proceed to Pay" : "Place Order";
}

const paymentSelect = document.getElementById("payment");
if (paymentSelect) {
  paymentSelect.addEventListener("change", syncCheckoutButtonText);
}
syncCheckoutButtonText();

/* ================= ADDRESS AUTO SAVE ================= */
["address", "area", "pincode"].forEach(id => {
  const field = document.getElementById(id);
  if (!field) return;

  const saved = localStorage.getItem("lb_" + id);
  if (saved) field.value = saved;

  field.addEventListener("input", () => {
    localStorage.setItem("lb_" + id, field.value.trim());
  });
});

/* ================= RENDER CART ================= */
function renderCart() {
  if (!orderItemsBox || !itemsTotalEl || !deliveryFeeEl || !grandTotalEl) return;
  orderItemsBox.innerHTML = "";
  let itemsTotal = 0;

  if (!cart.length) {
    orderItemsBox.innerHTML = "<p class='empty'>Your cart is empty</p>";
    itemsTotalEl.innerText  = "Rs. 0";
    deliveryFeeEl.innerText = "Rs. 0";
    if (gstFeeEl) gstFeeEl.innerText = "Rs. 0";
    grandTotalEl.innerText  = "Rs. 0";
    return;
  }

  cart.forEach(item => {
    const qty   = Number(item.qty);
    const price = Number(item.price);
    const sub   = qty * price;
    const itemName = item.product_name || item.name || item.productName || "Product";
    itemsTotal += sub;

    orderItemsBox.innerHTML += `
      <div class="cart-item">
        <span>${itemName} � ${qty}</span>
        <span>Rs. ${sub}</span>
      </div>
    `;
  });

  itemsTotalEl.innerText = `Rs. ${itemsTotal}`;

  const deliveryFee = itemsTotal < 100 ? 40 : 0;
  deliveryFeeEl.innerText = deliveryFee === 0 ? "FREE" : `Rs. ${deliveryFee}`;

  const gstAmount = Number((itemsTotal * GST_RATE).toFixed(2));
  if (gstFeeEl) gstFeeEl.innerText = `Rs. ${gstAmount.toFixed(2)}`;

  const grandTotal = Number((itemsTotal + deliveryFee + gstAmount).toFixed(2));
  grandTotalEl.innerText = `Rs. ${grandTotal.toFixed(2)}`;
}

renderCart();

/* ================= SAVE ORDER ================= */
async function saveOrder(orderData) {
  try {
    const data = await fetchJsonWithFallback(`${window.API_BASE_URL}/api/orders/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData)
    });

    if (!data.success) {
      alert(`Order failed: ${data.message || "Unable to save order"}`);
      return;
    }

    localStorage.removeItem(CART_KEY);
    window.location.href = "/welcome/customer/checkout/thankyou.html";
  } catch (err) {
    alert(`Server error: ${err && err.message ? err.message : "Unknown error"}`);
  }
}

/* ================= RAZORPAY PAYMENT ================= */
function startRazorpayPayment(orderData) {
  const DEFAULT_PUBLIC_LOGO = "https://localbasket.co.in/welcome/logo2.png?v=20260303";
  const brandLogo = (() => {
    const configured =
      (typeof window !== "undefined" && window.LB_BRAND_LOGO_URL) ||
      localStorage.getItem("lbBrandLogoUrl");
    if (configured) return configured;
    return DEFAULT_PUBLIC_LOGO;
  })();

  const payload = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: orderData.total_amount })
  };

  fetchJsonWithFallback(`${window.API_BASE_URL}/api/payment/create-order`, payload)
  .catch(() => fetchJsonWithFallback(`${window.API_BASE_URL}/api/payment/create`, payload))
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
      handler: response => {
        orderData.payment_status = "PAID";
        orderData.payment_id = response.razorpay_payment_id;
        saveOrder(orderData);
      },
      prefill: {
        name: orderData.customer_name,
        contact: orderData.phone
      },
      theme: { color: "#0f766e" }
    };

    new Razorpay(options).open();
  })
  .catch((err) => alert(`Payment init failed: ${err?.message || "Network error"}`));
}


function showOrderConfirm(message) {
  const overlay = document.getElementById("confirmOverlay");
  const textEl = document.getElementById("confirmText");
  const okBtn = document.getElementById("confirmOk");
  const cancelBtn = document.getElementById("confirmCancel");

  if (!overlay || !textEl || !okBtn || !cancelBtn) {
    return window.lbConfirm
      ? window.lbConfirm(message)
      : Promise.resolve(confirm(message));
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
/* ================= PLACE ORDER ================= */
async function placeOrder() {
  const name    = nameInput.value.trim();
  const phone   = phoneInput.value.trim();
  const address = document.getElementById("address").value.trim();
  const pincode = document.getElementById("pincode").value.trim();
  const paymentMethod = document.getElementById("payment").value;

  if (!name || !phone || !address || !pincode) {
    alert("❌ Fill all required fields");
    return;
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    alert("❌ Invalid phone number");
    return;
  }

  if (!/^\d{6}$/.test(pincode)) {
    alert("❌ Invalid pincode");
    return;
  }

  if (!cart.length) {
    alert("❌ Cart is empty");
    return;
  }

  const itemsTotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
    0
  );
  try {
    const storeId = Number(cart[0]?.storeId || 0);
    if (storeId) {
      const data = await fetchJsonWithFallback(`${window.API_BASE_URL}/api/stores/${storeId}`);
      const minOrder = Number(data?.store?.minimum_order || 100);
      if (itemsTotal < minOrder) {
        alert(`❌ Minimum order is Rs. ${minOrder}. Please add more items.`);
        return;
      }
    }
  } catch {
    // If min-order check API fails, do not block payment flow.
  }

  const total = Number(grandTotalEl.innerText.replace("Rs. ", ""));

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
    payment_id: null
  };

  const confirmed = await showOrderConfirm(`Do you want to place this order for Rs. ${total}?`);
  if (!confirmed) {
    return;
  }

  if (paymentMethod === "ONLINE") {
    startRazorpayPayment(orderData);
  } else {
    saveOrder(orderData);
  }
}




