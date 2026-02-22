const initIncludes = async () => {
  const installGlobalToastUI = () => {
    if (window.__lbToastInstalled) return;
    window.__lbToastInstalled = true;

    const host = document.createElement("div");
    host.className = "lb-toast-host";
    document.body.appendChild(host);

    const renderToast = (message, tone = "info") => {
      // Keep toast host at end of body so it stays above dynamic overlays/modals.
      if (host.parentElement) document.body.appendChild(host);

      const isMobile = window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
      host.style.position = "fixed";
      host.style.zIndex = "2147483647";
      host.style.top = isMobile ? "max(10px, env(safe-area-inset-top))" : "max(12px, env(safe-area-inset-top))";
      host.style.bottom = "auto";
      host.style.right = isMobile ? "10px" : "18px";
      host.style.left = isMobile ? "10px" : "auto";
      if (isMobile && window.scrollY > 0) window.scrollTo(0, 0);

      const authOverlay = document.getElementById("authOverlay");
      const authVisible = authOverlay && getComputedStyle(authOverlay).display !== "none";
      host.classList.toggle("lb-toast-over-modal", !!authVisible);

      const safeMessage = String(message == null || message === "" ? "Something went wrong. Please try again." : message);
      const toast = document.createElement("div");
      toast.className = "lb-toast-item";
      toast.setAttribute("data-tone", tone);
      toast.innerHTML = `
        <div class="lb-toast-head">
          <span class="lb-toast-dot"></span>
          <strong>${tone === "error" ? "Error" : "Notice"}</strong>
          <button type="button" class="lb-toast-close" aria-label="Close">&times;</button>
        </div>
        <p>${safeMessage}</p>
      `;
      host.appendChild(toast);

      const remove = () => {
        toast.classList.add("out");
        setTimeout(() => toast.remove(), 220);
      };

      const closeBtn = toast.querySelector(".lb-toast-close");
      if (closeBtn) closeBtn.addEventListener("click", remove);
      toast.addEventListener("click", remove);
      setTimeout(remove, 3200);
    };

    const nativeAlert = window.alert ? window.alert.bind(window) : null;
    window.alert = (message) => {
      try {
        const tone = /error|fail|denied|invalid|unable|not found/i.test(String(message || "")) ? "error" : "info";
        renderToast(message, tone);
      } catch {
        if (nativeAlert) nativeAlert(message);
      }
    };

    window.lbAlert = (message, tone = "info") => renderToast(message, tone);
  };

  installGlobalToastUI();

  const welcomePath = (suffix) => `/welcome/${String(suffix || "").replace(/^\/+/, "")}`;
  const relativeIncludeBase = (() => {
    try {
      return new URL("../includes/", window.location.href).href;
    } catch {
      return null;
    }
  })();
  const includeCandidates = (name) => {
    const candidates = [];
    if (relativeIncludeBase) candidates.push(`${relativeIncludeBase}${name}`);
    candidates.push(welcomePath(`includes/${name}`));
    return candidates;
  };

  async function loadPart(id, name) {
    const host = document.getElementById(id);
    if (!host) return;
    const paths = includeCandidates(name);
    for (const path of paths) {
      try {
        const res = await fetch(path, { cache: "no-cache" });
        if (!res.ok) continue;
        host.innerHTML = await res.text();
        return;
      } catch (e) {
        console.warn("include fetch error", path, e);
      }
    }
    console.warn("include failed", name, paths);
  }

  await loadPart("siteHeader", "header.html");
  await loadPart("siteFooter", "footer.html");

  document.body.classList.add("lb-with-footer");

  document.querySelectorAll("[data-lb-href]").forEach((el) => {
    const target = el.getAttribute("data-lb-href");
    if (target) el.setAttribute("href", welcomePath(target));
  });
  document.querySelectorAll("[data-lb-src]").forEach((el) => {
    const target = el.getAttribute("data-lb-src");
    if (target) el.setAttribute("src", welcomePath(target));
  });

  const footerYear = document.getElementById("lbFooterYear");
  if (footerYear) footerYear.textContent = String(new Date().getFullYear());

  const footerNewsForm = document.getElementById("lbFooterNewsForm");
  if (footerNewsForm) {
    const newsMsg = document.getElementById("lbFooterNewsMsg");
    const setNewsMsg = (text, state) => {
      if (!newsMsg) return;
      newsMsg.textContent = text;
      newsMsg.dataset.state = state || "";
    };

    const emailInput = document.getElementById("lbFooterEmail");
    if (emailInput) {
      emailInput.addEventListener("input", () => setNewsMsg("", ""));
    }

    footerNewsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const submitBtn = footerNewsForm.querySelector("button[type='submit']");
      const email = String(emailInput?.value || "").trim().toLowerCase();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      if (!ok) {
        setNewsMsg("Please enter a valid email address.", "error");
        if (emailInput) emailInput.focus();
        return;
      }
      localStorage.setItem("lbFooterNewsEmail", email);
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Joining...";
      }
      setNewsMsg("Thanks! You are subscribed for updates.", "success");
      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Join";
        }
        setNewsMsg("", "");
      }, 1800);
      footerNewsForm.reset();
    });
  }

  const quickPinForm = document.getElementById("lbQuickPinForm");
  if (quickPinForm) {
    const quickPinInput = document.getElementById("lbQuickPinInput");
    const quickPinMsg = document.getElementById("lbQuickPinMsg");
    const savedPin = localStorage.getItem("lbQuickPin");
    if (quickPinInput && savedPin) quickPinInput.value = savedPin;

    const setQuickPinMsg = (text, state) => {
      if (!quickPinMsg) return;
      quickPinMsg.textContent = text;
      quickPinMsg.dataset.state = state || "";
    };

    quickPinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const rawPin = String(quickPinInput?.value || "").trim();
      const pin = rawPin.replace(/\D/g, "");
      if (!/^\d{6}$/.test(pin)) {
        setQuickPinMsg("Enter a valid 6-digit pincode.", "error");
        if (quickPinInput) quickPinInput.focus();
        return;
      }
      if (quickPinInput) quickPinInput.value = pin;
      localStorage.setItem("lbQuickPin", pin);
      const slowZone = pin.startsWith("8") || pin.startsWith("9");
      const eta = slowZone ? "45-70 mins" : "20-40 mins";
      setQuickPinMsg(`Great news! Delivery available in ${eta} for ${pin}.`, "success");
    });
  }

  const RUPEE = "\u20B9";

  const ensureCartDrawer = () => {
    const existingDrawer = document.getElementById("lbCartDrawer");
    if (existingDrawer) return;
    const overlay = document.createElement("div");
    overlay.id = "lbCartOverlay";
    overlay.className = "lb-cart-overlay";
    const drawer = document.createElement("aside");
    drawer.id = "lbCartDrawer";
    drawer.className = "lb-cart-drawer";
    drawer.innerHTML = `
      <div class="lb-cart-header">
        <h3 style="font-weight:800;">Your Basket</h3>
        <button class="lb-cart-close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="lb-cart-items" id="lbCartItems"></div>
      <div class="lb-cart-footer">
        <div class="lb-cart-total">
          <span>Total</span>
          <span id="lbCartTotal">${RUPEE}0</span>
        </div>
        <button class="lb-cart-checkout" type="button" id="lbCartCheckout">Proceed to Checkout</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
  };

  ensureCartDrawer();

  const sharedDrawer = document.getElementById("lbCartDrawer");
  const sharedOverlay = document.getElementById("lbCartOverlay");
  const legacyDrawer = document.getElementById("cartDrawer");
  const legacyOverlay = document.getElementById("cartOverlay");
  const storeCart = document.getElementById("cartPanel");

  if (sharedDrawer && legacyDrawer && !storeCart) legacyDrawer.style.display = "none";
  if (sharedOverlay && legacyOverlay && !storeCart) legacyOverlay.style.display = "none";


  const loc = localStorage.getItem("lbAddr") || "Select Location";
  const locEl = document.getElementById("locText");
  if (locEl) locEl.textContent = loc;
  const locMobile = document.getElementById("locTextMobile");
  if (locMobile) locMobile.textContent = loc;

  const user = JSON.parse(localStorage.getItem("lbUser") || "null");
  const loginBtn = document.getElementById("loginBtn");
  const userAccount = document.getElementById("userAccount");
  const userInitials = document.getElementById("userInitials");
  const userFullName = document.getElementById("userFullName");

  if (user && user.name) {
    if (loginBtn) loginBtn.style.display = "none";
    if (userAccount) userAccount.style.display = "flex";
    const initials = user.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    if (userInitials) userInitials.textContent = initials || "A";
    if (userFullName) userFullName.textContent = user.name;
  } else {
    if (loginBtn) loginBtn.style.display = "flex";
    if (userAccount) userAccount.style.display = "none";
  }

  const key = user && user.id ? `lbCart_${user.id}` : "lbCart_guest";
  let cart = JSON.parse(localStorage.getItem(key) || "[]");
  const calcCount = (items) => items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const calcTotal = (items) => items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const cartEl = document.getElementById("cartCount");
  if (cartEl) cartEl.textContent = `${calcCount(cart)} Items`;

  const refreshCartFromStorage = () => {
    cart = JSON.parse(localStorage.getItem(key) || "[]");
    renderCartDrawer();
  };

  const renderCartDrawer = () => {
    const listEl = document.getElementById("lbCartItems");
    const legacyListEl = document.getElementById("cartItems");
    const totalEl = document.getElementById("lbCartTotal") || document.getElementById("cartTotal");
    const emptyHtml = `<div style="text-align:center; color:#64748b; padding:30px 0;">Your basket is empty.</div>`;

    if (listEl) {
      listEl.innerHTML = cart.length ? cart.map(item => `
        <div class="lb-cart-row" data-id="${item.id}">
          <div>
            <div class="lb-cart-title">${item.name || "Item"}</div>
            <div class="lb-cart-sub">${RUPEE}${Number(item.price) || 0}</div>
          </div>
          <div class="lb-cart-qty">
            <button type="button" data-cart-action="dec">-</button>
            <span>${Number(item.qty) || 0}</span>
            <button type="button" data-cart-action="inc">+</button>
          </div>
        </div>
      `).join("") : emptyHtml;
    }

    if (legacyListEl) {
      legacyListEl.innerHTML = cart.length ? cart.map(item => `
        <div class="cart-row" data-id="${item.id}">
          <div>
            <strong>${item.name || "Item"}</strong><br>
            <small>${RUPEE}${Number(item.price) || 0}</small>
          </div>
          <div class="cart-qty">
            <button type="button" data-cart-action="dec">-</button>
            <span>${Number(item.qty) || 0}</span>
            <button type="button" data-cart-action="inc">+</button>
          </div>
        </div>
      `).join("") : emptyHtml;
    }

    if (totalEl) totalEl.textContent = `${RUPEE}${calcTotal(cart).toFixed(2)}`;
    if (cartEl) cartEl.textContent = `${calcCount(cart)} Items`;
  };

  renderCartDrawer();

  const locBtn = document.getElementById("locBtn");
  const mobileLocBtn = document.getElementById("mobileLocBtn");
  const cartPill = document.getElementById("cartPill");
  const headerBackBtn = document.getElementById("lbHeaderBackBtn");
  const headerBackBtnMobile = document.getElementById("lbHeaderBackBtnMobile");

  const openLocation = () => {
    const modal = document.getElementById("locationModal");
    if (modal) {
      modal.style.display = "flex";
    } else {
      window.location.href = welcomePath("customer/index.html");
    }
  };

  if (locBtn) locBtn.addEventListener("click", openLocation);
  if (mobileLocBtn) mobileLocBtn.addEventListener("click", openLocation);
  const footerLocBtn = document.getElementById("lbFooterLocBtn");
  if (footerLocBtn) footerLocBtn.addEventListener("click", openLocation);
  const footerSellerBtn = document.getElementById("lbFooterSellerBtn");
  if (footerSellerBtn) {
    footerSellerBtn.addEventListener("click", () => {
      window.location.href = welcomePath("seller/seller-auth/seller-auth.html");
    });
  }

  const footerTopBtn = document.getElementById("lbFooterTopBtn");
  if (footerTopBtn) {
    const isInlineTopBtn = footerTopBtn.dataset.mode === "inline";
    if (!isInlineTopBtn) {
      const toggleFooterTopBtn = () => {
        footerTopBtn.classList.toggle("is-visible", window.scrollY > 260);
      };
      toggleFooterTopBtn();
      window.addEventListener("scroll", toggleFooterTopBtn, { passive: true });
    }
    footerTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  const goBackSafe = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = welcomePath("customer/index.html");
  };
  if (headerBackBtn) headerBackBtn.addEventListener("click", goBackSafe);
  if (headerBackBtnMobile) headerBackBtnMobile.addEventListener("click", goBackSafe);

  const currentPath = window.location.pathname;
  const isCustomerIndexPage =
    currentPath === welcomePath("customer/index.html") ||
    currentPath === welcomePath("customer/");
  let floatingBackBtn = document.querySelector(".lb-back-btn");
  if (isCustomerIndexPage) {
    if (floatingBackBtn) floatingBackBtn.remove();
  } else {
    if (!floatingBackBtn) {
      floatingBackBtn = document.createElement("button");
      floatingBackBtn.type = "button";
      floatingBackBtn.className = "lb-back-btn";
      floatingBackBtn.setAttribute("aria-label", "Go back");
      floatingBackBtn.innerHTML = "<span>&larr;</span>";
      document.body.appendChild(floatingBackBtn);
    }
    floatingBackBtn.addEventListener("click", goBackSafe);
  }

  if (cartPill) {
    cartPill.addEventListener("click", () => {
      const drawer = sharedDrawer || legacyDrawer;
      const overlay = sharedOverlay || legacyOverlay;
      if (drawer && overlay) {
        drawer.classList.add("active");
        overlay.style.display = "block";
      } else {
        window.location.href = welcomePath("customer/index.html");
      }
    });
  }

  const overlay = sharedOverlay;
  const drawer = sharedDrawer;
  if (overlay && drawer) {
    overlay.addEventListener("click", () => {
      drawer.classList.remove("active");
      overlay.style.display = "none";
    });
    const closeBtn = drawer.querySelector(".lb-cart-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        drawer.classList.remove("active");
        overlay.style.display = "none";
      });
    }
    drawer.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cart-action]");
      if (!btn) return;
      const row = e.target.closest(".lb-cart-row");
      if (!row) return;
      const id = row.getAttribute("data-id");
      const item = cart.find(i => String(i.id) === String(id));
      if (!item) return;
      if (btn.dataset.cartAction === "inc") item.qty = (Number(item.qty) || 0) + 1;
      if (btn.dataset.cartAction === "dec") item.qty = (Number(item.qty) || 0) - 1;
      cart = cart.filter(i => (Number(i.qty) || 0) > 0);
      localStorage.setItem(key, JSON.stringify(cart));
      renderCartDrawer();
    });
    const checkoutBtn = document.getElementById("lbCartCheckout");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        window.location.href = welcomePath("customer/checkout/checkout.html");
      });
    }
  }

  if (legacyDrawer && !storeCart) {
    legacyDrawer.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cart-action]");
      if (!btn) return;
      const row = e.target.closest(".cart-row");
      if (!row) return;
      const id = row.getAttribute("data-id");
      const item = cart.find(i => String(i.id) === String(id));
      if (!item) return;
      if (btn.dataset.cartAction === "inc") item.qty = (Number(item.qty) || 0) + 1;
      if (btn.dataset.cartAction === "dec") item.qty = (Number(item.qty) || 0) - 1;
      cart = cart.filter(i => (Number(i.qty) || 0) > 0);
      localStorage.setItem(key, JSON.stringify(cart));
      renderCartDrawer();
    });
  }

  window.lbRefreshHeaderCart = refreshCartFromStorage;
  window.addEventListener("lb-cart-updated", refreshCartFromStorage);
  window.addEventListener("storage", (e) => {
    if (e.key === key || e.key === "lbCart" || e.key === "lbCart_guest") {
      refreshCartFromStorage();
    }
  });

  if (!storeCart) {
    window.toggleCart = (open) => {
      if (!sharedDrawer || !sharedOverlay) return;
      if (open) {
        sharedDrawer.classList.add("active");
        sharedOverlay.style.display = "block";
      } else {
        sharedDrawer.classList.remove("active");
        sharedOverlay.style.display = "none";
      }
    };
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      if (typeof window.openAuth === "function") {
        window.openAuth();
      } else {
        window.location.href = welcomePath("customer/index.html");
      }
    });
  }

  const accountBtn = document.getElementById("accountBtn");
  const userMenu = document.getElementById("userMenu");
  if (accountBtn && userMenu) {
    accountBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userMenu.style.display = userMenu.style.display === "flex" ? "none" : "flex";
    });
    document.addEventListener("click", (e) => {
      if (!userMenu.contains(e.target) && e.target !== accountBtn) {
        userMenu.style.display = "none";
      }
    });
  }

  document.querySelectorAll("[data-action='profile']").forEach(btn => {
    btn.addEventListener("click", () => window.location.href = welcomePath("customer/profile/profile.html"));
  });
  document.querySelectorAll("[data-action='orders']").forEach(btn => {
    btn.addEventListener("click", () => window.location.href = welcomePath("customer/order/customer-orders.html"));
  });
  document.querySelectorAll("[data-action='logout']").forEach(btn => {
    btn.addEventListener("click", () => {
      localStorage.removeItem("lbUser");
      window.location.href = welcomePath("customer/index.html");
    });
  });

  const navItems = document.querySelectorAll(".lb-nav-item");
  if (navItems.length) {
    const path = window.location.pathname;
    navItems.forEach((btn) => {
      const key = btn.getAttribute("data-nav");
      if (!key) return;
      btn.addEventListener("click", () => {
        if (key === "home") window.location.href = welcomePath("customer/index.html");
        if (key === "browse") window.location.href = welcomePath("customer/category.html");
        if (key === "cart") window.toggleCart ? window.toggleCart(true) : window.location.href = welcomePath("customer/checkout/checkout.html");
        if (key === "profile") window.location.href = welcomePath("customer/profile/profile.html");
      });
    });
    const setActive = (k) => navItems.forEach(b => b.classList.toggle("active", b.getAttribute("data-nav") === k));
    if (path.includes("/customer/category")) setActive("browse");
    else if (path.includes("/customer/profile")) setActive("profile");
    else if (path.includes("/customer/checkout")) setActive("cart");
    else setActive("home");
  }

  // On touch devices, avoid sticky focus state after tapping footer controls.
  if (window.matchMedia && window.matchMedia("(hover: none)").matches) {
    const footerHost = document.getElementById("siteFooter");
    if (footerHost) {
      footerHost.addEventListener("click", (e) => {
        const tapControl = e.target.closest(".footer-col a, .footer-help-actions a, .footer-bottom-actions button");
        if (!tapControl) return;
        setTimeout(() => {
          if (document.activeElement === tapControl && typeof tapControl.blur === "function") {
            tapControl.blur();
          }
        }, 0);
      });
    }
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIncludes);
} else {
  initIncludes();
}
