(function () {
  var OPEN_CART_FLAG = "lbOpenCartAfterRedirect";

  function getCartTotal() {
    var user = null;
    try {
      user = JSON.parse(localStorage.getItem("lbUser") || "null");
    } catch (err) {
      user = null;
    }

    var keys = [];
    if (user && user.id != null) {
      keys.push("lbCart_" + String(user.id));
    }
    keys.push("lbCart");

    for (var i = 0; i < keys.length; i += 1) {
      var raw = localStorage.getItem(keys[i]);
      if (!raw) continue;
      try {
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) continue;
        return parsed.reduce(function (sum, item) {
          var qty = Number(item && item.qty != null ? item.qty : 1);
          return sum + (Number.isFinite(qty) ? qty : 0);
        }, 0);
      } catch (err) {
        // ignore malformed cart
      }
    }

    return 0;
  }

  function openCart() {
    if (typeof window.toggleCart === "function") {
      window.toggleCart(true);
      return true;
    }

    var drawer = document.getElementById("cartDrawer");
    var overlay = document.getElementById("cartOverlay");
    if (drawer && overlay) {
      drawer.classList.add("active");
      overlay.style.display = "block";
      return true;
    }

    var sharedDrawer = document.getElementById("lbCartDrawer");
    var sharedOverlay = document.getElementById("lbCartOverlay");
    if (sharedDrawer && sharedOverlay) {
      sharedDrawer.classList.add("active");
      sharedOverlay.style.display = "block";
      return true;
    }

    return false;
  }

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
    var countEl = document.getElementById("cartCount");
    if (countEl) {
      countEl.textContent = getCartTotal() + " Items";
    }

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
