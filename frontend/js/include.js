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

      if (hasUser) {
        const fullName = String(user.name || user.full_name || user.phone || user.email || "User").trim();
        const initials = fullName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join("") || "U";
        if (userInitials) userInitials.textContent = initials;
        if (userFullName) userFullName.textContent = fullName;
      } else {
        if (userInitials) userInitials.textContent = "";
        if (userFullName) userFullName.textContent = "Welcome!";
      }
    };

    syncHeaderAuth();

    // Navbar buttons
    document.querySelectorAll("[data-login]")
      .forEach(btn => btn.onclick = () =>
        document.getElementById("authModal")?.classList.add("active")
      );

    const savedAddress = String(localStorage.getItem("lbAddr") || "").trim();
    if (savedAddress) {
      const desktopLoc = document.getElementById("locText");
      const mobileLoc = document.getElementById("locTextMobile");
      if (desktopLoc) desktopLoc.textContent = savedAddress;
      if (mobileLoc) mobileLoc.textContent = savedAddress;
    }

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

    ["lbHeaderBackBtn", "lbHeaderBackBtnMobile"].forEach((id) => {
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

    const openCart = () => {
      const drawer = document.getElementById("cartDrawer");
      if (window.toggleCart && drawer) {
        window.toggleCart(true);
        return;
      }

      try {
        sessionStorage.setItem(OPEN_CART_FLAG, "1");
      } catch (err) {
        // ignore storage failures
      }
      window.location.href = "/welcome/customer/index.html";
    };

    ["cartPill"].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn || btn.dataset.lbCartBound) return;
      btn.style.cursor = "pointer";
      btn.addEventListener("click", openCart);
      btn.dataset.lbCartBound = "1";
    });

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
          if (key === "profile") window.location.href = "/welcome/customer/profile/profile.html";
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

        const hasStoredUser = (() => {
          try {
            const raw = localStorage.getItem("lbUser");
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            return !!(parsed && (parsed.id || parsed.customer_id || parsed.phone || parsed.email));
          } catch (err) {
            return false;
          }
        })();
        const isVisibleLoggedIn =
          !!(userAccount && getComputedStyle(userAccount).display !== "none");
        const isLoggedIn = hasStoredUser || isVisibleLoggedIn;

        if (!isLoggedIn) {
          if (window.openAuth) {
            window.openAuth();
          } else {
            const loginBtn = document.getElementById("loginBtn");
            if (loginBtn) loginBtn.click();
          }
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
