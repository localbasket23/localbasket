/* =====================================================
   LOCALBASKET  STORE ENGINE (CUSTOMER)
===================================================== */

const CONFIG = {
  API_URL: "http://localhost:5000/api",
  IMAGE_URL: "http://localhost:5000/uploads/",
  DEFAULT_IMG: "https://placehold.co/200?text=No+Image"
};

const params = new URLSearchParams(window.location.search);
const storeId = params.get("id");

function getCartKey() {
  try {
    const u = JSON.parse(localStorage.getItem("lbUser"));
    const id = u && u.id ? u.id : "guest";
    return `lbCart_${id}`;
  } catch {
    return "lbCart_guest";
  }
}

function loadCart() {
  const key = getCartKey();
  let cart = JSON.parse(localStorage.getItem(key) || "[]");
  if (!cart.length) {
    const legacy = JSON.parse(localStorage.getItem("lbCart") || "[]");
    if (legacy.length) {
      localStorage.setItem(key, JSON.stringify(legacy));
      localStorage.removeItem("lbCart");
      cart = legacy;
    }
  }
  return cart;
}

function saveCart(cart) {
  localStorage.setItem(getCartKey(), JSON.stringify(cart));
}

const state = {
  store: null,
  products: [],
  filtered: [],
  isStoreOnline: false,
  cart: loadCart(),
  activeProductId: null,
  activeRating: 0
};

document.addEventListener("DOMContentLoaded", async () => {
  if (!storeId) {
    showError("Invalid Store Link");
    return;
  }

  const ok = await loadStore();
  if (!ok) return;
  await loadProducts();
  syncCartFromStorage();
});

/* =====================================================
   LOAD STORE
===================================================== */
async function loadStore() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/stores/${storeId}`);
    const data = await res.json();

    if (!data.success || !data.store) throw new Error(data.message || "Store not found");

    const store = data.store;
    state.store = store;
    state.isStoreOnline = Number(store.is_online) === 1;

    document.getElementById("storeName").innerText = store.store_name;
    document.getElementById("headerStoreName").innerText = store.store_name;

    const img = document.getElementById("storeImg");
    img.src = store.store_photo ? CONFIG.IMAGE_URL + store.store_photo : CONFIG.DEFAULT_IMG;
    img.onerror = () => (img.src = CONFIG.DEFAULT_IMG);

    const tag = document.querySelector(".online-tag");
    if (tag) {
      tag.innerText = state.isStoreOnline ? "OPEN NOW" : "CLOSED";
      tag.style.background = state.isStoreOnline ? "#10b981" : "#ef4444";
    }

    const cat = document.getElementById("storeCategory");
    if (cat) {
      const name = store.category_name || store.category || store.business_type || "General";
      cat.innerText = `Category: ${name}`;
    }

    const ratingEl = document.getElementById("storeRating");
    if (ratingEl) {
      const candidates = [
        store?.rating,
        store?.avg_rating,
        store?.average_rating,
        store?.store_rating,
        store?.storeRating,
        store?.avgRating,
        store?.rating_avg,
        store?.ratingAverage
      ];
      const countCandidates = [
        store?.rating_count,
        store?.ratingCount,
        store?.reviews_count,
        store?.reviewCount
      ];
      const count = Number(countCandidates.find(v => v !== null && v !== undefined && v !== "") || 0);
      let ratingText = "New";
      for (const v of candidates) {
        if (v === null || v === undefined || v === "") continue;
        const n = Number(v);
        if (Number.isFinite(n)) {
          ratingText = (n === 0 && count === 0) ? "New" : (count > 0 ? `${n.toFixed(1)} (${count})` : n.toFixed(1));
          break;
        }
      }
      ratingEl.innerText = `Rating: ${ratingText}`;
    }

    const phoneEl = document.getElementById("storePhone");
    if (phoneEl) phoneEl.innerText = store.phone || store.store_phone || "Not available";

    const areaEl = document.getElementById("storeArea");
    if (areaEl) {
      const area = store.area || store.locality || store.city || "Not available";
      areaEl.innerText = `Area: ${area}`;
    }

    const addressEl = document.getElementById("storeAddress");
    if (addressEl) {
      const address = store.address || store.store_address || "Not available";
      addressEl.innerText = address;
    }

    const pinEl = document.getElementById("storePincode");
    if (pinEl) {
      const pin = store.pincode || store.pin_code || store.zip || "Not available";
      pinEl.innerText = pin;
    }

    const timingEl = document.getElementById("storeTiming");
    if (timingEl) timingEl.innerText = "Rs. 100";
    return true;
  } catch (err) {
    console.error("STORE ERROR:", err);
    showError(err.message || "Unable to load store");
    return false;
  }
}

/* =====================================================
   LOAD PRODUCTS
===================================================== */
async function loadProducts() {
  const list = document.getElementById("productList");
  if (!list) return;
  list.innerHTML = `<div class="empty-state">Loading products...</div>`;

  try {
    const res = await fetch(`${CONFIG.API_URL}/products?storeId=${storeId}`);
    const data = await res.json();

    if (!data.success || !Array.isArray(data.products) || !data.products.length) {
      list.innerHTML = `<div class="empty-state">No products available</div>`;
      return;
    }

    state.products = data.products;
    state.filtered = [...state.products];
    renderProducts(state.filtered);
  } catch (err) {
    console.error("PRODUCT ERROR:", err);
    list.innerHTML = `<div class="empty-state" style="color:#b91c1c;border-color:#fecaca;background:#fef2f2;">Server error</div>`;
  }
}

/* =====================================================
   SEARCH FILTER
===================================================== */
function filterProducts() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  state.filtered = state.products.filter(p =>
    String(p.name || "").toLowerCase().includes(q)
  );
  renderProducts(state.filtered);
}

/* =====================================================
   RENDER PRODUCTS
===================================================== */
function renderProducts(items) {
  const list = document.getElementById("productList");

  list.innerHTML = items.map(p => {
    const qty = getCartQty(p.id);
    const price = Number(p.price || 0);
    const mrp =
      Number(p.mrp || p.mrp_price || p.original_price || p.list_price || 0) || 0;
    const hasDiscount = mrp > price && price > 0;
    const discountPct = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
    const ratingVal = Number(p.avg_rating || p.rating || 0);
    const ratingCount = Number(p.rating_count || p.reviews_count || 0);
    const ratingText = ratingCount ? `${ratingVal.toFixed(1)} (${ratingCount})` : "New";
    const ratingStars = renderStars(ratingVal);
    return `
      <div class="product-card" data-id="${p.id}" onclick="openProductView(${p.id})" ${!state.isStoreOnline ? 'style="opacity:.6"' : ""}>
        <div class="product-img-box">
          <img src="${p.image ? CONFIG.IMAGE_URL + p.image : CONFIG.DEFAULT_IMG}" onerror="this.src='${CONFIG.DEFAULT_IMG}'">
          ${hasDiscount ? `<span class="discount-tag" title="${discountPct}% OFF"><span>${discountPct}%<br>OFF</span></span>` : ""}
        </div>

        <div class="product-name">${p.name}</div>
        <div class="product-unit">${p.unit || ""}</div>
        <div class="product-rating">
          <span class="stars">${ratingStars}</span>
          <span>${ratingText}</span>
        </div>

        <div class="product-footer">
          <div class="price-block">
            <div class="price-main">Rs. ${price}</div>
            ${hasDiscount ? `
              <div class="price-sub">
                <span class="mrp">Rs. ${mrp}</span>
                <span class="discount-badge">${discountPct}% OFF</span>
              </div>
            ` : ""}
          </div>
          <button class="add-btn" ${p.stock <= 0 ? "disabled" : ""} onclick="addToCart(${p.id}); event.stopPropagation();" style="display:${qty ? "none" : "inline-block"};">
            ${p.stock > 0 ? "Add" : "Out"}
          </button>
          <div class="qty-controls" style="display:${qty ? "flex" : "none"};">
            <button onclick="updateQty(${p.id}, -1); event.stopPropagation();">-</button>
            <span>${qty}</span>
            <button onclick="updateQty(${p.id}, 1); event.stopPropagation();">+</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* =====================================================
   CART LOGIC
===================================================== */
function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  let cart = loadCart();

  if (cart.length && String(cart[0].storeId) !== String(storeId)) {
    alert("You can order from only one store at a time");
    return;
  }

  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      qty: 1,
      storeId,
      seller_id: product.seller_id
    });
  }

  saveCart(cart);
  syncCartFromStorage();
}

function updateQty(id, change) {
  let cart = loadCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.qty += change;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }

  saveCart(cart);
  syncCartFromStorage();
}

function syncCartFromStorage() {
  state.cart = loadCart();
  updateCartUI();
  updateProductCardQtys();
  updateProductViewQty();
  window.dispatchEvent(new Event("lb-cart-updated"));
}

function updateProductCardQtys() {
  document.querySelectorAll(".product-card").forEach(card => {
    const id = Number(card.getAttribute("data-id"));
    const qty = getCartQty(id);
    const addBtn = card.querySelector(".add-btn");
    const qtyBox = card.querySelector(".qty-controls");

    if (addBtn) addBtn.style.display = qty ? "none" : "inline-block";
    if (qtyBox) {
      qtyBox.style.display = qty ? "flex" : "none";
      const span = qtyBox.querySelector("span");
      if (span) span.innerText = qty;
    }
  });
}

function getCartQty(id) {
  const item = state.cart.find(i => i.id === id);
  return item ? item.qty : 0;
}

/* =====================================================
   PRODUCT VIEW MODAL
===================================================== */
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getProductRating(p) {
  const ratingCandidates = [
    p.rating, p.avg_rating, p.average_rating, p.product_rating,
    p.rating_avg, p.ratingAverage
  ];
  const countCandidates = [
    p.rating_count, p.ratingCount, p.reviews_count, p.reviewCount, p.reviewsCount
  ];
  const count = Number(countCandidates.find(v => v !== null && v !== undefined && v !== "") || 0);
  let rating = 0;
  for (const v of ratingCandidates) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) { rating = n; break; }
  }
  return { rating, count };
}

function renderStars(rating) {
  const rounded = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.round(rounded);
  return "★★★★★☆☆☆☆☆".slice(5 - full, 10 - full);
}

function openProductView(id) {
  const product = state.products.find(p => Number(p.id) === Number(id));
  if (!product) return;
  state.activeProductId = Number(id);
  state.activeRating = 0;

  const img = document.getElementById("pvImg");
  img.src = product.image ? CONFIG.IMAGE_URL + product.image : CONFIG.DEFAULT_IMG;
  img.onerror = () => (img.src = CONFIG.DEFAULT_IMG);

  document.getElementById("pvTitle").innerText = product.name || "Product";
  document.getElementById("pvUnit").innerText = product.unit || "Unit";

  const inStock = Number(product.stock || 0) > 0;
  document.getElementById("pvStock").innerText = inStock ? "In Stock" : "Out of Stock";
  const pvAddBtn = document.getElementById("pvAddBtn");
  if (pvAddBtn) {
    pvAddBtn.disabled = !inStock;
    pvAddBtn.innerText = inStock ? "Add to Basket" : "Out of Stock";
  }

  const desc = product.description || product.details || product.desc || "No description available.";
  document.getElementById("pvDesc").innerText = desc;

  const price = Number(product.price || 0);
  const mrp = Number(product.mrp || product.mrp_price || product.original_price || product.list_price || 0) || 0;
  const hasDiscount = mrp > price && price > 0;
  document.getElementById("pvPrice").innerText = `Rs. ${price}`;
  const mrpEl = document.getElementById("pvMrp");
  const discEl = document.getElementById("pvDiscount");
  if (hasDiscount) {
    const discountPct = Math.round(((mrp - price) / mrp) * 100);
    mrpEl.innerText = `Rs. ${mrp}`;
    mrpEl.style.display = "inline";
    discEl.innerText = `${discountPct}% OFF`;
    discEl.style.display = "inline-block";
  } else {
    mrpEl.innerText = "";
    mrpEl.style.display = "none";
    discEl.style.display = "none";
  }

  const { rating, count } = getProductRating(product);
  document.getElementById("pvStars").innerText = renderStars(rating);
  document.getElementById("pvRatingText").innerText = count ? `${rating.toFixed(1)} (${count})` : "New";

  const reviewsBox = document.getElementById("pvReviews");
  const reviews = Array.isArray(product.reviews) ? product.reviews : [];
  if (!reviews.length) {
    reviewsBox.innerHTML = `<div class="pv-review-card">Loading reviews...</div>`;
  } else {
    reviewsBox.innerHTML = renderReviewCards(reviews);
  }

  updateProductViewQty();
  resetReviewForm();
  document.getElementById("productViewOverlay").style.display = "flex";
  document.body.style.overflow = "hidden";
  fetchProductReviews(product.id);
}

function closeProductView() {
  const overlay = document.getElementById("productViewOverlay");
  if (overlay) overlay.style.display = "none";
  document.body.style.overflow = "";
  state.activeProductId = null;
  state.activeRating = 0;
}

function updateProductViewQty() {
  if (!state.activeProductId) return;
  const qty = getCartQty(state.activeProductId);
  const addBtn = document.getElementById("pvAddBtn");
  const qtyBox = document.getElementById("pvQty");
  const qtyVal = document.getElementById("pvQtyValue");
  if (!addBtn || !qtyBox || !qtyVal) return;
  addBtn.style.display = qty ? "none" : "inline-flex";
  qtyBox.style.display = qty ? "flex" : "none";
  qtyVal.innerText = qty || 1;
}

function addToCartFromView() {
  if (!state.activeProductId) return;
  addToCart(state.activeProductId);
  updateProductViewQty();
}

function updateQtyFromView(change) {
  if (!state.activeProductId) return;
  updateQty(state.activeProductId, change);
  updateProductViewQty();
}

function resetReviewForm() {
  const starLabel = document.getElementById("pvStarLabel");
  const reviewText = document.getElementById("pvReviewText");
  document.querySelectorAll(".pv-star-btn").forEach(btn => btn.classList.remove("active"));
  if (starLabel) starLabel.innerText = "Tap to rate";
  if (reviewText) reviewText.value = "";
}

function setStarRating(value) {
  state.activeRating = value;
  const starLabel = document.getElementById("pvStarLabel");
  document.querySelectorAll(".pv-star-btn").forEach(btn => {
    const star = Number(btn.getAttribute("data-star"));
    btn.classList.toggle("active", star <= value);
  });
  if (starLabel) starLabel.innerText = value ? `${value} Star${value > 1 ? "s" : ""}` : "Tap to rate";
}

async function submitProductReview() {
  if (!state.activeProductId) return;
  if (!state.activeRating) {
    alert("Please select a rating");
    return;
  }
  const user = JSON.parse(localStorage.getItem("lbUser") || "null");
  const product = state.products.find(p => Number(p.id) === Number(state.activeProductId));
  const comment = (document.getElementById("pvReviewText")?.value || "").trim();
  const resolvedStoreId = product?.seller_id || Number(storeId) || null;

  try {
    const res = await fetch(`${CONFIG.API_URL}/products/${state.activeProductId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: state.activeRating,
        comment,
        customer_id: user?.id || null,
        customer_name: user?.name || user?.username || "Customer",
        store_id: resolvedStoreId
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed");
    resetReviewForm();
    fetchProductReviews(state.activeProductId);
  } catch (err) {
    alert(err?.message || "Unable to submit review");
  }
}

async function fetchProductReviews(productId) {
  try {
    const res = await fetch(`${CONFIG.API_URL}/products/${productId}/reviews`);
    const data = await res.json();
    if (!data || !data.success) throw new Error(data?.message || "Failed");

    const reviews = Array.isArray(data.reviews) ? data.reviews : [];
    const reviewsBox = document.getElementById("pvReviews");
    if (reviewsBox) {
      reviewsBox.innerHTML = reviews.length
        ? renderReviewCards(reviews)
        : `<div class="pv-review-card">No reviews yet.</div>`;
    }
    if (state.activeProductId === productId) {
      const rating = Number(data.avg_rating || 0);
      const count = Number(data.rating_count || 0);
      document.getElementById("pvStars").innerText = renderStars(rating);
      document.getElementById("pvRatingText").innerText = count ? `${rating.toFixed(1)} (${count})` : "New";
    }
  } catch (err) {
    const reviewsBox = document.getElementById("pvReviews");
    if (reviewsBox) {
      reviewsBox.innerHTML = `<div class="pv-review-card">No reviews yet.</div>`;
    }
  }
}

function renderReviewCards(reviews) {
  return reviews.slice(0, 8).map(r => {
    const name = escapeHtml(r.customer_name || r.name || r.user || "Customer");
    const comment = escapeHtml(r.comment || r.review || r.message || "");
    const rr = Number(r.rating || 0);
    return `
      <div class="pv-review-card">
        <div class="pv-review-head">
          <span>${name}</span>
          <span class="pv-stars">${renderStars(rr)}</span>
        </div>
        <div>${comment || "No comment."}</div>
      </div>
    `;
  }).join("");
}

/* =====================================================
   CART UI
===================================================== */
function updateCartUI() {
  const count = state.cart.reduce((sum, i) => sum + i.qty, 0);
  const total = state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  document.getElementById("cartCountLabel").innerText = `Basket (${count})`;
  document.getElementById("cartTotal").innerText = `Rs. ${total}`;
  document.getElementById("mItemCount").innerText = `${count} Items`;
  document.getElementById("mTotalAmount").innerText = `Rs. ${total}`;
  const mobileBar = document.getElementById("mobileBar");
  if (mobileBar) mobileBar.classList.toggle("is-visible", count > 0);

  const box = document.getElementById("cartItemsContainer");
  if (!count) {
    box.innerHTML = "<p>Your basket is empty</p>";
    return;
  }

  box.innerHTML = state.cart.map(i => `
    <div class="cart-row">
      <div>
        <strong>${i.name}</strong><br>
        <small>Rs. ${i.price}</small>
      </div>
      <div class="cart-qty">
        <button onclick="updateQty(${i.id}, -1)">-</button>
        <strong>${i.qty}</strong>
        <button onclick="updateQty(${i.id}, 1)">+</button>
      </div>
    </div>
  `).join("");
}

/* =====================================================
   CHECKOUT
===================================================== */
function checkout() {
  if (!state.cart.length) {
    alert("Cart is empty");
    return;
  }

  if (!state.isStoreOnline) {
    alert("Store is currently closed. Please try later.");
    return;
  }

  window.location.href = "/welcome/customer/checkout/checkout.html";
}

/* =====================================================
   HELPERS
===================================================== */
function toggleCart(show) {
  document.getElementById("cartPanel").classList.toggle("active", show);
  const backdrop = document.getElementById("cartBackdrop");
  if (backdrop) backdrop.classList.toggle("active", show);
  document.body.style.overflow = show ? "hidden" : "";
}

function showError(msg) {
  document.body.innerHTML = `
    <div style="height:100vh;display:flex;align-items:center;justify-content:center;">
      <h2>${msg}</h2>
    </div>
  `;
}

window.filterProducts = filterProducts;
window.openProductView = openProductView;
window.closeProductView = closeProductView;
window.addToCartFromView = addToCartFromView;
window.updateQtyFromView = updateQtyFromView;
window.submitProductReview = submitProductReview;
window.setStarRating = setStarRating;

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".pv-star-btn");
  if (!btn) return;
  const value = Number(btn.getAttribute("data-star"));
  setStarRating(value);
});
