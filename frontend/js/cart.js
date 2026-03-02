(function () {
  var OPEN_CART_FLAG = "lbOpenCartAfterRedirect";
  var RUPEE = "\u20B9";
  var pathName = String(window.location.pathname || "").toLowerCase();
  var isNonCustomerPage =
    pathName.indexOf("/seller/") !== -1 ||
    pathName.indexOf("/admin/") !== -1 ||
    pathName.indexOf("/seller-auth/") !== -1 ||
    pathName.indexOf("/welcome/seller") !== -1 ||
    pathName.indexOf("/welcome/admin") !== -1;

  if (isNonCustomerPage) {
    try {
      sessionStorage.removeItem(OPEN_CART_FLAG);
    } catch (err) {
      // ignore storage issues
    }
    window.initCart = function () {};
    window.lbOpenCart = function () { return false; };
    window.lbCloseCart = function () {};
    return;
  }

  function getUser() {
    var user = null;
    try {
      user = JSON.parse(localStorage.getItem("lbUser") || "null");
    } catch (err) {
      user = null;
    }

    return user;
  }

  function getCartKeys() {
    var user = getUser();
    var keys = [];
    if (user && user.id != null) keys.push("lbCart_" + String(user.id));
    keys.push("lbCart_guest");
    keys.push("lbCart");
    return keys;
  }

  function readCartByKey(key) {
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function getActiveCart() {
    var keys = getCartKeys();
    for (var i = 0; i < keys.length; i += 1) {
      var list = readCartByKey(keys[i]);
      if (Array.isArray(list) && list.length) {
        return { key: keys[i], items: list };
      }
    }

    var fallbackKey = keys[0] || "lbCart";
    var fallbackItems = readCartByKey(fallbackKey) || [];
    return { key: fallbackKey, items: fallbackItems };
  }

  function setCart(items, key) {
    var targetKey = key || getActiveCart().key;
    localStorage.setItem(targetKey, JSON.stringify(Array.isArray(items) ? items : []));
    try {
      window.dispatchEvent(new Event("lb-cart-updated"));
    } catch (err) {
      // ignore event issues
    }
  }

  function getCartTotal() {
    var cart = getActiveCart().items;
    return cart.reduce(function (sum, item) {
      var qty = Number(item && item.qty != null ? item.qty : 1);
      return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);
  }

  function getCartAmount() {
    var cart = getActiveCart().items;
    return cart.reduce(function (sum, item) {
      var qty = Number(item && item.qty != null ? item.qty : 0);
      var price = Number(item && item.price != null ? item.price : 0);
      return sum + (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(price) ? price : 0);
    }, 0);
  }

  function ensureSharedCartDrawer() {
    var existingDrawer = document.getElementById("lbCartDrawer");
    var existingOverlay = document.getElementById("lbCartOverlay");
    if (existingDrawer && existingOverlay) return;

    var overlay = document.createElement("div");
    overlay.id = "lbCartOverlay";
    overlay.className = "lb-cart-overlay";

    var drawer = document.createElement("aside");
    drawer.id = "lbCartDrawer";
    drawer.className = "lb-cart-drawer";
    drawer.innerHTML = [
      '<div class="lb-cart-header">',
      '<h3 style="font-weight:800;">Your Basket</h3>',
      '<button class="lb-cart-close" type="button" aria-label="Close">&times;</button>',
      "</div>",
      '<div class="lb-cart-items" id="lbCartItems"></div>',
      '<div class="lb-cart-footer">',
      '<div class="lb-cart-total"><span>Total</span><span id="lbCartTotal">' + RUPEE + "0</span></div>",
      '<button class="lb-cart-checkout" type="button" id="lbCartCheckout">Proceed to Checkout</button>',
      "</div>"
    ].join("");

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
  }

  function renderSharedCart() {
    ensureSharedCartDrawer();
    var listEl = document.getElementById("lbCartItems");
    var totalEl = document.getElementById("lbCartTotal");
    var checkoutBtn = document.getElementById("lbCartCheckout");
    var active = getActiveCart();
    var cart = active.items;

    if (listEl) {
      if (!cart.length) {
        listEl.innerHTML = '<div style="text-align:center; color:#64748b; padding:30px 0;">Your basket is empty.</div>';
      } else {
        listEl.innerHTML = cart.map(function (item) {
          var id = String(item && item.id != null ? item.id : "");
          var name = String(item && item.name != null ? item.name : "Item");
          var price = Number(item && item.price != null ? item.price : 0);
          var qty = Number(item && item.qty != null ? item.qty : 0);
          return [
            '<div class="lb-cart-row" data-id="' + id + '">',
            "<div>",
            '<div class="lb-cart-title">' + name + "</div>",
            '<div class="lb-cart-sub">' + RUPEE + price + "</div>",
            "</div>",
            '<div class="lb-cart-qty">',
            '<button type="button" data-cart-action="dec">-</button>',
            "<span>" + qty + "</span>",
            '<button type="button" data-cart-action="inc">+</button>',
            "</div>",
            "</div>"
          ].join("");
        }).join("");
      }
    }

    if (totalEl) totalEl.textContent = RUPEE + getCartAmount().toFixed(2);
    if (checkoutBtn) checkoutBtn.disabled = !cart.length;
  }

  function closeSharedCart() {
    var sharedDrawer = document.getElementById("lbCartDrawer");
    var sharedOverlay = document.getElementById("lbCartOverlay");
    if (sharedDrawer) sharedDrawer.classList.remove("active");
    if (sharedOverlay) sharedOverlay.style.display = "none";
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }

  function bindSharedCartEvents() {
    ensureSharedCartDrawer();
    var sharedDrawer = document.getElementById("lbCartDrawer");
    var sharedOverlay = document.getElementById("lbCartOverlay");
    if (!sharedDrawer || !sharedOverlay) return;
    if (sharedDrawer.dataset.lbBound === "1") return;

    sharedOverlay.addEventListener("click", closeSharedCart);

    var closeBtn = sharedDrawer.querySelector(".lb-cart-close");
    if (closeBtn) closeBtn.addEventListener("click", closeSharedCart);

    sharedDrawer.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cart-action]");
      if (!btn) return;
      var row = e.target.closest(".lb-cart-row");
      if (!row) return;
      var id = String(row.getAttribute("data-id") || "");
      var active = getActiveCart();
      var cart = active.items.slice();
      var idx = cart.findIndex(function (i) { return String(i && i.id) === id; });
      if (idx < 0) return;

      var currentQty = Number(cart[idx].qty || 0);
      if (btn.dataset.cartAction === "inc") cart[idx].qty = currentQty + 1;
      if (btn.dataset.cartAction === "dec") cart[idx].qty = currentQty - 1;
      cart = cart.filter(function (i) { return Number(i && i.qty || 0) > 0; });
      setCart(cart, active.key);
      renderSharedCart();
      updateCartCount();
    });

    var checkoutBtn = document.getElementById("lbCartCheckout");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", function () {
        if (!getActiveCart().items.length) return;
        window.location.href = "/welcome/customer/checkout/checkout.html";
      });
    }

    sharedDrawer.dataset.lbBound = "1";
  }

  function openSharedCart() {
    bindSharedCartEvents();
    renderSharedCart();

    var sharedDrawer = document.getElementById("lbCartDrawer");
    var sharedOverlay = document.getElementById("lbCartOverlay");
    if (!sharedDrawer || !sharedOverlay) return false;

    sharedDrawer.classList.add("active");
    sharedOverlay.style.display = "block";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return true;
  }

  function updateCartCount() {
    var countText = getCartTotal() + " Items";
    var countEl = document.getElementById("cartCount");
    if (countEl) countEl.textContent = countText;
    var legacyCount = document.getElementById("cartCountLabel");
    if (legacyCount && /\bBasket\b/i.test(legacyCount.textContent || "")) {
      legacyCount.textContent = "Basket (" + getCartTotal() + ")";
    }
  }

  function openCart() {
    return openSharedCart();
  }

  function closeCart() {
    closeSharedCart();
  }

  window.lbOpenCart = openCart;
  window.lbCloseCart = closeCart;

  window.toggleCart = function (open) {
    if (open) return openSharedCart();
    closeSharedCart();
    return true;
  };

  function bindCartTriggers() {
    var triggers = document.querySelectorAll("#cartPill, [data-nav=\"cart\"]");
    triggers.forEach(function (btn) {
      if (!btn || btn.dataset.lbCartBound) return;
      btn.addEventListener("click", function (e) {
        if (e) e.preventDefault();
        openCart();
      });
      btn.dataset.lbCartBound = "1";
    });
  }

  function initCart() {
    updateCartCount();
    bindSharedCartEvents();
    renderSharedCart();
    bindCartTriggers();

    try {
      if (sessionStorage.getItem(OPEN_CART_FLAG) === "1") {
        sessionStorage.removeItem(OPEN_CART_FLAG);
        openCart();
      }
    } catch (err) {
      // ignore storage failure
    }
  }

  window.initCart = initCart;
  window.addEventListener("lb-cart-updated", function () {
    updateCartCount();
    renderSharedCart();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCart);
  } else {
    initCart();
  }

  var headerHost = document.getElementById("header");
  if (headerHost && "MutationObserver" in window) {
    var observer = new MutationObserver(function () {
      bindCartTriggers();
    });
    observer.observe(headerHost, { childList: true, subtree: true });
  }
})();
