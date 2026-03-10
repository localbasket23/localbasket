(() => {
  let dialogReady = false;
  const ensureDialog = () => {
    if (dialogReady) return;
    dialogReady = true;
    const style = document.createElement("style");
    style.textContent = `
      .lb-dialog-backdrop{
        position: fixed;
        inset: 0;
        background: rgba(15,23,42,0.45);
        backdrop-filter: blur(6px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 16px;
      }
      .lb-dialog{
        width: min(420px, calc(100vw - 32px));
        border-radius: 16px;
        background: #ffffff;
        color: #0f172a;
        border: 1px solid #e2e8f0;
        box-shadow: 0 24px 50px -30px rgba(2,6,23,0.45);
        padding: 18px;
        display: grid;
        gap: 14px;
      }
      .lb-dialog-title{
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.3px;
        text-transform: uppercase;
        color: #fb923c;
      }
      .lb-dialog-message{
        font-size: 14px;
        line-height: 1.4;
        color: inherit;
        white-space: pre-wrap;
      }
      .lb-dialog-actions{
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .lb-dialog-btn{
        min-width: 96px;
        padding: 10px 14px;
        border-radius: 12px;
        border: 1px solid transparent;
        font-weight: 800;
        cursor: pointer;
      }
      .lb-dialog-btn.primary{
        background: linear-gradient(135deg, #f97316, #fb923c);
        color: #1f2937;
        box-shadow: 0 10px 18px -14px rgba(251,146,60,0.8);
      }
      .lb-dialog-btn.ghost{
        background: #f1f5f9;
        color: #0f172a;
        border-color: #e2e8f0;
      }
      html.lb-theme-dark .lb-dialog{
        background: #0f172a;
        color: #e2e8f0;
        border-color: rgba(148,163,184,0.2);
        box-shadow: 0 26px 50px -30px rgba(2,6,23,0.8);
      }
      html.lb-theme-dark .lb-dialog-title{ color: #fb923c; }
      html.lb-theme-dark .lb-dialog-btn.ghost{
        background: rgba(15,23,42,0.7);
        color: #e2e8f0;
        border-color: rgba(148,163,184,0.25);
      }
      @media (max-width: 600px){
        .lb-dialog{ width: min(360px, calc(100vw - 24px)); padding: 16px; }
        .lb-dialog-actions{ justify-content: stretch; }
        .lb-dialog-btn{ flex: 1 1 auto; }
      }
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement("div");
    backdrop.className = "lb-dialog-backdrop";
    backdrop.innerHTML = `
      <div class="lb-dialog" role="dialog" aria-modal="true">
        <div class="lb-dialog-title">Notice</div>
        <div class="lb-dialog-message"></div>
        <div class="lb-dialog-actions">
          <button class="lb-dialog-btn ghost" data-cancel>Cancel</button>
          <button class="lb-dialog-btn primary" data-ok>OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const titleEl = backdrop.querySelector(".lb-dialog-title");
    const msgEl = backdrop.querySelector(".lb-dialog-message");
    const okBtn = backdrop.querySelector("[data-ok]");
    const cancelBtn = backdrop.querySelector("[data-cancel]");

    let resolver = null;
    let isConfirm = false;

    const close = (val) => {
      backdrop.style.display = "none";
      document.body.style.overflow = "";
      if (resolver) resolver(val);
      resolver = null;
    };

    okBtn.addEventListener("click", () => close(true));
    cancelBtn.addEventListener("click", () => close(false));
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop && isConfirm) close(false);
      if (e.target === backdrop && !isConfirm) close(true);
    });

    window.lbAlert = (message, title = "Notice") => {
      titleEl.textContent = title || "Notice";
      msgEl.textContent = String(message || "");
      cancelBtn.style.display = "none";
      isConfirm = false;
      backdrop.style.display = "flex";
      document.body.style.overflow = "hidden";
      return new Promise((resolve) => { resolver = resolve; });
    };

    window.lbConfirm = (message, title = "Confirm") => {
      titleEl.textContent = title || "Confirm";
      msgEl.textContent = String(message || "");
      cancelBtn.style.display = "inline-flex";
      isConfirm = true;
      backdrop.style.display = "flex";
      document.body.style.overflow = "hidden";
      return new Promise((resolve) => { resolver = resolve; });
    };

    // override alert only (confirm is async; update callers to use lbConfirm)
    window.alert = (msg) => window.lbAlert(msg);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureDialog);
  } else {
    ensureDialog();
  }
})();

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;

  if (
    path.includes("seller") ||
    path.includes("admin") ||
    path.includes("auth")
  ) {
    console.log("Skipping header/footer for auth pages");
    return;
  }

  function ensureSharedStyles() {
    if (document.querySelector('link[data-lb-shared-style="header-footer"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/header-footer.css";
    link.setAttribute("data-lb-shared-style", "header-footer");
    document.head.appendChild(link);
  }

  ensureSharedStyles();

  function applySharedAssetBindings(scope) {
    if (!scope) return;
    scope.querySelectorAll("[data-lb-href]").forEach((el) => {
      const target = (el.getAttribute("data-lb-href") || "").trim();
      if (!target) return;
      el.setAttribute("href", `/welcome/${target.replace(/^\/+/, "")}`);
    });
    scope.querySelectorAll("[data-lb-src]").forEach((el) => {
      const target = (el.getAttribute("data-lb-src") || "").trim();
      if (!target) return;
      el.setAttribute("src", `/welcome/${target.replace(/^\/+/, "")}`);
    });
  }

  function reInitializeUI() {
    const OPEN_LOCATION_FLAG = "lbOpenLocationAfterRedirect";
    const OPEN_CART_FLAG = "lbOpenCartAfterRedirect";
    const escapeHtml = (value) =>
      String(value || "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[ch]));
    const setLocationTicker = (elementId, text, opts = {}) => {
      const target = document.getElementById(elementId);
      if (!target) return;

      const rawText = String(text || "Select Location");
      const safeText = escapeHtml(rawText);
      const spacer = Number(opts.spacer || 32);
      const minOverflow = Number(opts.minOverflow || 6);
      const minSpeed = Number(opts.minSpeed || 7);
      const maxSpeed = Number(opts.maxSpeed || 18);
      const speedDivisor = Number(opts.speedDivisor || 22);

      target.dataset.lbTickerApplying = "1";
      target.innerHTML = `<span class="lb-loc-marquee-track"><span class="lb-loc-copy">${safeText}</span></span>`;
      target.classList.remove("is-marquee");
      target.style.removeProperty("--lb-loc-loop");
      target.style.removeProperty("--lb-loc-speed");

      const track = target.querySelector(".lb-loc-marquee-track");
      const copy = target.querySelector(".lb-loc-copy");
      if (!track) return;

      requestAnimationFrame(() => {
        const copyWidth = Math.ceil(copy ? copy.scrollWidth : track.scrollWidth);
        const overflow = Math.ceil(copyWidth - target.clientWidth);
        if (overflow > minOverflow) {
          const shift = overflow + spacer;
          const speed = Math.max(minSpeed, Math.min(maxSpeed, shift / speedDivisor));
          target.style.setProperty("--lb-loc-loop", String(shift));
          target.style.setProperty("--lb-loc-gap", `${spacer}px`);
          target.style.setProperty("--lb-loc-speed", `${speed}s`);
          target.classList.add("is-marquee");
        }
        target.dataset.lbTickerApplying = "";
      });
    };
    const setMobileLocationTicker = (text) => {
      setLocationTicker("locTextMobile", text, { spacer: 32, minOverflow: 6, minSpeed: 7, maxSpeed: 18, speedDivisor: 22 });
      setSharedMobileHeaderAddress(text);
    };
    const setDesktopLocationTicker = (text) =>
      setLocationTicker("locText", text, { spacer: 26, minOverflow: 8, minSpeed: 8, maxSpeed: 20, speedDivisor: 24 });
    const setSharedMobileHeaderAddress = (text) => {
      const target = document.getElementById("mobileHeaderAddress");
      if (target) target.textContent = String(text || "Select Location");
    };
    const getTimeGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good Morning";
      if (hour < 17) return "Good Afternoon";
      if (hour < 21) return "Good Evening";
      return "Good Night";
    };
    const getMobilePageTitle = (path) => {
      const value = String(path || "").toLowerCase();
      if (value.includes("/customer/store/")) return "Explore Stores";
      if (value.includes("/customer/profile/")) return "My Profile";
      if (value.includes("/customer/order/")) return "My Orders";
      if (value.includes("/customer/support/")) return "Help Center";
      if (value.includes("/customer/checkout/")) return "Checkout";
      if (value.includes("/customer/category")) return "Explore Categories";
      return "LocalBasket";
    };
    const watchLocationTicker = (elementId, opts = {}) => {
      const target = document.getElementById(elementId);
      if (!target || target.dataset.lbTickerWatch === "1") return;
      target.dataset.lbTickerWatch = "1";

      let rafId = 0;
      const reapply = () => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const rawText = String(target.textContent || "").replace(/\s+/g, " ").trim() || "Select Location";
          setLocationTicker(elementId, rawText, opts);
        });
      };

      const observer = new MutationObserver(() => {
        if (target.dataset.lbTickerApplying === "1") return;
        reapply();
      });
      observer.observe(target, { childList: true, characterData: true, subtree: true });
      reapply();
    };
    window.lbSetLocMobileText = setMobileLocationTicker;
    window.lbSetLocDesktopText = setDesktopLocationTicker;

    // Login popup
    if (window.initAuth) {
      window.initAuth();
    }

    // Cart system
    if (window.initCart) {
      window.initCart();
    }

    // Theme toggle
    if (window.initTheme) {
      window.initTheme();
    }
    const mobileThemeSlot = document.getElementById("lbMobileThemeSlot");
    const mobileThemeToggle = document.getElementById("lbThemeToggleBtnMobile");
    if (mobileThemeSlot && mobileThemeToggle) {
      mobileThemeSlot.classList.add("has-toggle");
    }

    const syncHeaderAuth = () => {
      let user = null;
      try {
        user = JSON.parse(localStorage.getItem("lbUser") || "null");
      } catch (err) {
        user = null;
      }

      const loginBtn = document.getElementById("loginBtn");
      const userAccount = document.getElementById("userAccount");
      const userInitials = document.getElementById("userInitials");
      const userFullName = document.getElementById("userFullName");
      const mobileHeaderKicker = document.getElementById("mobileHeaderKicker");
      const mobileHeaderName = document.getElementById("mobileHeaderName");
      const mobileHeaderAction = document.getElementById("mobileHeaderAction");
      const currentPath = String(window.location.pathname || "").toLowerCase();
      const isInnerMobileHeader = document.body.classList.contains("lb-mobile-inner-header");

      const normalizedId = user && (user.id || user.customer_id || user._id || user.user_id || user.customerId);
      if (user && !user.id && normalizedId) {
        user.id = normalizedId;
        try {
          localStorage.setItem("lbUser", JSON.stringify(user));
        } catch (err) {
          // ignore storage failures
        }
      }

      const token = String(localStorage.getItem("lbToken") || "").trim();
      const hasUser = !!(
        token ||
        (user && (user.id || user.customer_id || user._id || user.user_id || user.phone || user.email || user.name))
      );

      if (loginBtn) loginBtn.style.display = hasUser ? "none" : "inline-flex";
      if (userAccount) userAccount.style.display = hasUser ? "flex" : "none";
      if (mobileHeaderKicker) mobileHeaderKicker.textContent = getTimeGreeting().toUpperCase();

      if (hasUser) {
        const fullName = String(user.name || user.full_name || user.phone || user.email || "User").trim();
        const firstName = fullName.split(/\s+/).filter(Boolean)[0] || "User";
        const initials = fullName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join("") || "U";
        if (userInitials) userInitials.textContent = initials;
        if (userFullName) userFullName.textContent = fullName;
        if (mobileHeaderName) {
          mobileHeaderName.textContent = isInnerMobileHeader ? getMobilePageTitle(currentPath) : fullName;
        }
        if (mobileHeaderAction) {
          mobileHeaderAction.textContent = "Profile";
          mobileHeaderAction.setAttribute("aria-label", `Open ${firstName} profile`);
          mobileHeaderAction.onclick = () => {
            if (window.viewProfile) window.viewProfile();
            else window.location.href = "/welcome/customer/profile/profile.html";
          };
        }
      } else {
        if (userInitials) userInitials.textContent = "";
        if (userFullName) userFullName.textContent = "Welcome!";
        if (mobileHeaderName) {
          mobileHeaderName.textContent = isInnerMobileHeader ? getMobilePageTitle(currentPath) : "Customer";
        }
        if (mobileHeaderAction) {
          mobileHeaderAction.textContent = "Login";
          mobileHeaderAction.setAttribute("aria-label", "Open login");
          mobileHeaderAction.onclick = () => {
            if (window.openAuth) window.openAuth();
            else document.getElementById("loginBtn")?.click();
          };
        }
      }
    };

    syncHeaderAuth();
    if (!document.body.dataset.lbGreetingClockBound) {
      window.setInterval(() => {
        const mobileHeaderKicker = document.getElementById("mobileHeaderKicker");
        if (mobileHeaderKicker) mobileHeaderKicker.textContent = getTimeGreeting().toUpperCase();
      }, 60000);
      document.body.dataset.lbGreetingClockBound = "1";
    }

    // Navbar buttons
    document.querySelectorAll("[data-login]")
      .forEach(btn => btn.onclick = () =>
        document.getElementById("authModal")?.classList.add("active")
      );

    const savedAddress = String(localStorage.getItem("lbAddr") || "").trim();
    if (savedAddress) {
      setDesktopLocationTicker(savedAddress);
      setMobileLocationTicker(savedAddress);
      setSharedMobileHeaderAddress(savedAddress);
    }
    if (!savedAddress) setSharedMobileHeaderAddress("Select Location");
    watchLocationTicker("locText", { spacer: 26, minOverflow: 8, minSpeed: 8, maxSpeed: 20, speedDivisor: 24 });
    watchLocationTicker("locTextMobile", { spacer: 32, minOverflow: 6, minSpeed: 7, maxSpeed: 18, speedDivisor: 22 });

    const goBackSafe = () => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.href = "/welcome/customer/index.html";
    };

    const currentPath = String(window.location.pathname || "").toLowerCase();
    const isHomePage =
      currentPath.endsWith("/welcome/customer/index.html") ||
      currentPath === "/welcome/customer/index.html";
    const isCategoryPage = currentPath.includes("/welcome/customer/category");
    document.body.classList.toggle("lb-mobile-inner-header", !isHomePage && !isCategoryPage);

    ["lbHeaderBackBtn", "lbHeaderBackBtnMobile", "mobileHeaderInlineBack"].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.style.display = isHomePage ? "none" : "inline-flex";
      if (btn.dataset.lbBackBound) return;
      btn.addEventListener("click", goBackSafe);
      btn.dataset.lbBackBound = "1";
    });

    const openLocation = () => {
      const modal = document.getElementById("locationModal");
      if (modal) {
        modal.style.display = "flex";
        window.dispatchEvent(new Event("lb-location-modal-opened"));
        return;
      }

      if (window.getLocation) {
        window.getLocation();
        return;
      }

      try {
        sessionStorage.setItem(OPEN_LOCATION_FLAG, "1");
      } catch (err) {
        // ignore storage failures
      }
      window.location.href = "/welcome/customer/index.html";
    };

    ["locBtn", "mobileLocBtn"].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn || btn.dataset.lbLocBound) return;
      btn.addEventListener("click", openLocation);
      btn.dataset.lbLocBound = "1";
    });
    const mobileHeaderSummary = document.getElementById("mobileHeaderSummary");
    if (mobileHeaderSummary) {
      const isInnerMobileHeader = document.body.classList.contains("lb-mobile-inner-header");
      if (!isInnerMobileHeader && !mobileHeaderSummary.dataset.lbLocBound) {
        mobileHeaderSummary.addEventListener("click", openLocation);
        mobileHeaderSummary.dataset.lbLocBound = "1";
      }
    }

    const openCart = () => {
      if (typeof window.toggleCart === "function") {
        window.toggleCart(true);
        return;
      }

      const drawer = document.getElementById("cartDrawer");
      const overlay = document.getElementById("cartOverlay");
      if (drawer && overlay) {
        drawer.classList.add("active");
        overlay.style.display = "block";
        return;
      }

      const sharedDrawer = document.getElementById("lbCartDrawer");
      const sharedOverlay = document.getElementById("lbCartOverlay");
      if (sharedDrawer && sharedOverlay) {
        sharedDrawer.classList.add("active");
        sharedOverlay.style.display = "block";
      }
    };

    ["cartPill"].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn || btn.dataset.lbCartBound) return;
      btn.style.cursor = "pointer";
      btn.addEventListener("click", openCart);
      btn.dataset.lbCartBound = "1";
    });

    const isUserLoggedIn = () => {
      try {
        const raw = localStorage.getItem("lbUser");
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return !!(parsed && (parsed.id || parsed.customer_id || parsed.phone || parsed.email));
      } catch (err) {
        return false;
      }
    };

    const openLoginPopup = () => {
      if (window.openAuth) {
        window.openAuth();
        return;
      }
      const loginBtn = document.getElementById("loginBtn");
      if (loginBtn) loginBtn.click();
    };

    const navItems = document.querySelectorAll(".lb-nav-item[data-nav]");
    if (navItems.length) {
      navItems.forEach((btn) => {
        if (btn.dataset.lbNavBound) return;
        const key = String(btn.getAttribute("data-nav") || "").trim();
        if (!key) return;
        btn.addEventListener("click", () => {
          if (key === "home") window.location.href = "/welcome/customer/index.html";
          if (key === "browse") window.location.href = "/welcome/customer/category.html";
          if (key === "cart") openCart();
          if (key === "profile") {
            if (!isUserLoggedIn()) {
              openLoginPopup();
              return;
            }
            window.location.href = "/welcome/customer/profile/profile.html";
          }
        });
        btn.dataset.lbNavBound = "1";
      });

      const currentPath = String(window.location.pathname || "").toLowerCase();
      let activeKey = "home";
      if (currentPath.includes("/customer/category")) activeKey = "browse";
      else if (currentPath.includes("/customer/profile")) activeKey = "profile";
      else if (currentPath.includes("/customer/checkout")) activeKey = "cart";

      navItems.forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-nav") === activeKey);
      });
    }

    const accountBtn = document.getElementById("accountBtn");
    const userMenu = document.getElementById("userMenu");
    const userAccount = document.getElementById("userAccount");

    if (accountBtn && !accountBtn.dataset.lbAccountBound) {
      accountBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const hasStoredUser = isUserLoggedIn();
        const isVisibleLoggedIn =
          !!(userAccount && getComputedStyle(userAccount).display !== "none");
        const isLoggedIn = hasStoredUser || isVisibleLoggedIn;

        if (!isLoggedIn) {
          openLoginPopup();
          return;
        }

        if (!userMenu) return;
        const isOpen = userMenu.style.display === "flex";
        userMenu.style.display = isOpen ? "none" : "flex";
      });
      accountBtn.dataset.lbAccountBound = "1";
    }

    if (userMenu && !userMenu.dataset.lbMenuActionBound) {
      userMenu.addEventListener("click", (e) => {
        const actionBtn = e.target.closest("button[data-action]");
        if (!actionBtn) return;
        const action = String(actionBtn.getAttribute("data-action") || "").trim();

        if (action === "profile") {
          if (window.viewProfile) window.viewProfile();
          else window.location.href = "/welcome/customer/profile/profile.html";
        }
        if (action === "orders") {
          if (window.viewOrders) window.viewOrders();
          else window.location.href = "/welcome/customer/order/customer-orders.html";
        }
        if (action === "logout") {
          if (window.logoutUser) window.logoutUser();
          else {
            localStorage.removeItem("lbUser");
            localStorage.removeItem("lbToken");
            userMenu.style.display = "none";
            syncHeaderAuth();
            window.dispatchEvent(new Event("lb-auth-updated"));
          }
        }
      });
      userMenu.dataset.lbMenuActionBound = "1";
    }

    if (!document.body.dataset.lbAccountOutsideBound) {
      window.addEventListener("click", (e) => {
        const menu = document.getElementById("userMenu");
        if (!menu) return;
        if (e.target.closest("#accountBtn") || e.target.closest("#userMenu")) return;
        menu.style.display = "none";
      });
      document.body.dataset.lbAccountOutsideBound = "1";
    }

    if (!document.body.dataset.lbAuthSyncBound) {
      window.addEventListener("lb-auth-updated", syncHeaderAuth);
      window.addEventListener("storage", (e) => {
        if (e.key === "lbUser" || e.key === "lbToken") syncHeaderAuth();
      });
      document.body.dataset.lbAuthSyncBound = "1";
    }

    const welcomePath = (suffix) => `/welcome/${String(suffix || "").replace(/^\/+/, "")}`;

    if (!document.body.dataset.lbHrefDelegateBound) {
      document.addEventListener("click", (e) => {
        const el = e.target.closest("[data-lb-href]");
        if (!el) return;
        const target = String(el.getAttribute("data-lb-href") || "").trim();
        if (!target) return;
        e.preventDefault();
        window.location.href = welcomePath(target);
      });
      document.body.dataset.lbHrefDelegateBound = "1";
    }

    const sellerBtn = document.getElementById("lbFooterSellerBtn");
    if (sellerBtn && !sellerBtn.dataset.lbBound) {
      sellerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = welcomePath("seller/seller-auth/seller-auth.html");
      });
      sellerBtn.dataset.lbBound = "1";
    }

    const ADMIN_AUTH_KEY = "lbAdminAuth";
    const ADMIN_LOGIN_REDIRECT_FLAG = "lbOpenAdminLoginAfterRedirect";
    const ADMIN_RETURN_PATH_KEY = "lbAdminReturnPath";
    const adminBtn = document.getElementById("lbAdminLoginBtn");
    const adminOverlay = document.getElementById("lbAdminPopupOverlay");
    const adminClose = document.getElementById("lbAdminPopupClose");
    const adminForm = document.getElementById("lbAdminPopupForm");
    const adminUserInput = document.getElementById("lbAdminUser");
    const adminPassInput = document.getElementById("lbAdminPass");
    const adminError = document.getElementById("lbAdminPopupError");

    const getAdminAuth = () => {
      try {
        const raw = localStorage.getItem(ADMIN_AUTH_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        const now = Date.now();
        const expiresAt = Number(parsed.expiresAt || 0);
        if (expiresAt && now > expiresAt) {
          localStorage.removeItem(ADMIN_AUTH_KEY);
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    };

    const saveAdminAuth = (userId) => {
      const now = Date.now();
      const session = {
        userId: String(userId || "admin").trim() || "admin",
        loggedInAt: now,
        expiresAt: now + (12 * 60 * 60 * 1000)
      };
      localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(session));
    };

    const goAdminDashboard = () => {
      let target = welcomePath("admin/admin.html");
      try {
        const saved = String(sessionStorage.getItem(ADMIN_RETURN_PATH_KEY) || "").trim();
        if (saved.startsWith("/welcome/admin/")) {
          target = saved;
        }
        sessionStorage.removeItem(ADMIN_RETURN_PATH_KEY);
      } catch {
        // ignore storage errors
      }
      window.location.href = target;
    };

    const openAdminPopup = () => {
      if (!adminOverlay) {
        try {
          sessionStorage.setItem(ADMIN_LOGIN_REDIRECT_FLAG, "1");
        } catch {
          // ignore storage errors
        }
        window.location.href = welcomePath("customer/index.html");
        return;
      }
      adminOverlay.hidden = false;
      document.body.style.overflow = "hidden";
      if (adminError) adminError.textContent = "";
      if (adminUserInput) adminUserInput.focus();
    };

    const closeAdminPopup = () => {
      if (!adminOverlay) return;
      adminOverlay.hidden = true;
      document.body.style.overflow = "";
      if (adminError) adminError.textContent = "";
      if (adminForm) adminForm.reset();
    };

    if (adminBtn && !adminBtn.dataset.lbBound) {
      adminBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openAdminPopup();
      });
      adminBtn.dataset.lbBound = "1";
    }
    if (adminClose && !adminClose.dataset.lbBound) {
      adminClose.addEventListener("click", closeAdminPopup);
      adminClose.dataset.lbBound = "1";
    }
    if (adminOverlay && !adminOverlay.dataset.lbBound) {
      adminOverlay.addEventListener("click", (e) => {
        if (e.target === adminOverlay) closeAdminPopup();
      });
      adminOverlay.dataset.lbBound = "1";
    }
    if (adminForm && !adminForm.dataset.lbBound) {
      adminForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const userId = String(adminUserInput?.value || "").trim();
        const pass = String(adminPassInput?.value || "").trim();
        if (userId === "shubham" && pass === "1234") {
          saveAdminAuth(userId);
          closeAdminPopup();
          goAdminDashboard();
          return;
        }
        if (adminError) adminError.textContent = "Invalid ID or password.";
      });
      adminForm.dataset.lbBound = "1";
    }
    if (!document.body.dataset.lbAdminEscBound) {
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const overlay = document.getElementById("lbAdminPopupOverlay");
          if (overlay && !overlay.hidden) {
            overlay.hidden = true;
            document.body.style.overflow = "";
          }
        }
      });
      document.body.dataset.lbAdminEscBound = "1";
    }

    try {
      if (sessionStorage.getItem(ADMIN_LOGIN_REDIRECT_FLAG) === "1") {
        sessionStorage.removeItem(ADMIN_LOGIN_REDIRECT_FLAG);
        openAdminPopup();
      }
    } catch {
      // ignore storage errors
    }
  }

  async function loadHeader() {
    const headerContainer = document.getElementById("header");
    if (!headerContainer) return;

    const res = await fetch("/components/header.html");
    const html = await res.text();
    headerContainer.innerHTML = html;
    reInitializeUI();
    applySharedAssetBindings(headerContainer);
  }

  async function loadFooter() {
    const footerContainer = document.getElementById("footer");
    if (!footerContainer) return;

    const res = await fetch("/components/footer.html");
    const html = await res.text();
    footerContainer.innerHTML = html;
    applySharedAssetBindings(footerContainer);
    reInitializeUI();
  }
  await loadHeader();
  await loadFooter();

});
