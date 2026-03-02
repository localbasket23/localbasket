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
    var drawer = document.getElementById("cartDrawer");
    if (window.toggleCart && drawer) {
      window.toggleCart(true);
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
        var opened = openCart();
        if (!opened) {
          try {
            sessionStorage.setItem(OPEN_CART_FLAG, "1");
          } catch (err) {
            // ignore storage failure
          }
          var path = String(window.location.pathname || "").toLowerCase();
          if (!path.endsWith("/welcome/customer/index.html")) {
            window.location.href = "/welcome/customer/index.html";
          }
        }
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
