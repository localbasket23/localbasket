/*************************************
 * CHECKOUT SCRIPT â€” FINAL (FIXED)
 *************************************/

/* ================= AUTH CHECK ================= */
const user = JSON.parse(localStorage.getItem("lbUser"));

if (!user || !user.id) {
  alert("Please login first");
  window.location.href = "../index.html";
}

/* ================= CART (PER USER) ================= */
function getCartKey() {
  try {
    const u = JSON.parse(localStorage.getItem("lbUser"));
    const id = u && u.id ? u.id : "guest";
    return `lbCart_${id}`;
  } catch {
    return "lbCart_guest";
  }
}

const CART_KEY = getCartKey();
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

/* ================= DOM ELEMENTS ================= */
const orderItemsBox = document.getElementById("orderItems");
const itemsTotalEl  = document.getElementById("itemsTotal");
const deliveryFeeEl = document.getElementById("deliveryFee");
const gstFeeEl      = document.getElementById("gstFee");
const grandTotalEl  = document.getElementById("grandTotal");
const GST_RATE = 0.05;

/* ================= AUTO FILL USER ================= */
const nameInput  = document.getElementById("name");
const phoneInput = document.getElementById("phone");

if (nameInput)  nameInput.value  = user.name  || "";
if (phoneInput) phoneInput.value = user.phone || "";

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
        <span>${itemName} × ${qty}</span>
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
function saveOrder(orderData) {
  fetch("http://localhost:5000/api/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData)
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      alert("âŒ Order failed");
      return;
    }

    /* âœ… CLEAR CART */
    localStorage.removeItem(CART_KEY);
    window.location.href = "./thankyou.html";
  })
  .catch(() => alert("âŒ Server error"));
}

/* ================= RAZORPAY PAYMENT ================= */
function startRazorpayPayment(orderData) {
  fetch("http://localhost:5000/api/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: orderData.total_amount })
  })
  .then(res => res.json())
  .then(rpOrder => {
    if (!rpOrder || !rpOrder.id) {
      alert("âŒ Payment init failed");
      return;
    }

    const options = {
      key: "rzp_test_S00oIIfqinUdN2",
      amount: rpOrder.amount,
      currency: "INR",
      name: "Local Basket",
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
  .catch(() => alert("âŒ Payment error"));
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
/* ================= PLACE ORDER ================= */
async function placeOrder() {
  const name    = nameInput.value.trim();
  const phone   = phoneInput.value.trim();
  const address = document.getElementById("address").value.trim();
  const pincode = document.getElementById("pincode").value.trim();
  const paymentMethod = document.getElementById("payment").value;

  if (!name || !phone || !address || !pincode) {
    alert("âŒ Fill all required fields");
    return;
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    alert("âŒ Invalid phone number");
    return;
  }

  if (!/^\d{6}$/.test(pincode)) {
    alert("âŒ Invalid pincode");
    return;
  }

  if (!cart.length) {
    alert("âŒ Cart is empty");
    return;
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


