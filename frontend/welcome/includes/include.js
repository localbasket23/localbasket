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

  const ensureGlobalDarkCustomerStyles = () => {
    if (document.getElementById("lbGlobalDarkCustomerStyles")) return;
    const style = document.createElement("style");
    style.id = "lbGlobalDarkCustomerStyles";
    style.textContent = `
html.lb-theme-dark body {
  background: radial-gradient(1100px 700px at 20% -5%, #13284a 0%, #081428 58%, #061022 100%) !important;
  color: #dbe7fb !important;
}
html.lb-theme-dark .page-shell,
html.lb-theme-dark .checkout-shell,
html.lb-theme-dark .support-wrap,
html.lb-theme-dark .container,
html.lb-theme-dark .dashboard,
html.lb-theme-dark .main-content {
  color: #dbe7fb !important;
}
html.lb-theme-dark .co-card,
html.lb-theme-dark .ty-card,
html.lb-theme-dark .support-hero,
html.lb-theme-dark .support-panel,
html.lb-theme-dark .topic-item,
html.lb-theme-dark .faq-item,
html.lb-theme-dark .profile-card,
html.lb-theme-dark .main-card,
html.lb-theme-dark .sidebar,
html.lb-theme-dark .settings-block,
html.lb-theme-dark .stat-box,
html.lb-theme-dark .order-card,
html.lb-theme-dark .activity-list li,
html.lb-theme-dark .pin-panel,
html.lb-theme-dark .intro-badge,
html.lb-theme-dark .chip,
html.lb-theme-dark .cart-panel,
html.lb-theme-dark .popup,
html.lb-theme-dark .product,
html.lb-theme-dark .store-header,
html.lb-theme-dark .store-info-box,
html.lb-theme-dark .store-info .info-card,
html.lb-theme-dark .checkout-summary,
html.lb-theme-dark .co-confirm-box {
  background: linear-gradient(165deg, #0f1c31, #14233c) !important;
  border-color: rgba(148, 163, 184, 0.32) !important;
  color: #dbe7fb !important;
  box-shadow: 0 18px 30px -20px rgba(2, 6, 23, 0.9) !important;
}
html.lb-theme-dark .store-info-box img,
html.lb-theme-dark .tp-img,
html.lb-theme-dark .store-img-wrap,
html.lb-theme-dark .product img {
  background: #0c172b !important;
}
html.lb-theme-dark h1,
html.lb-theme-dark h2,
html.lb-theme-dark h3,
html.lb-theme-dark h4,
html.lb-theme-dark .section-title,
html.lb-theme-dark .checkout-title,
html.lb-theme-dark .co-confirm-title,
html.lb-theme-dark .ty-title,
html.lb-theme-dark .profile-header h2,
html.lb-theme-dark .store-meta h2,
html.lb-theme-dark .order-id {
  color: #f3f8ff !important;
}
html.lb-theme-dark p,
html.lb-theme-dark .sub,
html.lb-theme-dark .hint,
html.lb-theme-dark .store-note,
html.lb-theme-dark .order-date,
html.lb-theme-dark .co-confirm-text,
html.lb-theme-dark .ty-sub,
html.lb-theme-dark .faq-content,
html.lb-theme-dark .topic-item p,
html.lb-theme-dark .results-meta span,
html.lb-theme-dark .empty {
  color: #9eb0ca !important;
}
html.lb-theme-dark input,
html.lb-theme-dark select,
html.lb-theme-dark textarea,
html.lb-theme-dark .co-input,
html.lb-theme-dark .co-textarea,
html.lb-theme-dark .co-select,
html.lb-theme-dark .search-section input,
html.lb-theme-dark .input-wrapper input,
html.lb-theme-dark .support-form input,
html.lb-theme-dark .support-form textarea,
html.lb-theme-dark .support-form select {
  background: #0f1c31 !important;
  color: #dbe7fb !important;
  border-color: rgba(148, 163, 184, 0.3) !important;
}
html.lb-theme-dark input::placeholder,
html.lb-theme-dark textarea::placeholder {
  color: #8ea1bd !important;
}
html.lb-theme-dark .tab,
html.lb-theme-dark .chip,
html.lb-theme-dark .category-section button,
html.lb-theme-dark .support-btn:not(.primary),
html.lb-theme-dark .ty-btn.ghost,
html.lb-theme-dark .co-confirm-btn.cancel,
html.lb-theme-dark .faq-btn,
html.lb-theme-dark .nav-link,
html.lb-theme-dark .recent-clear {
  background: #12223a !important;
  color: #c8d7ee !important;
  border-color: rgba(148, 163, 184, 0.28) !important;
}
html.lb-theme-dark .tab.active,
html.lb-theme-dark .chip.active,
html.lb-theme-dark .category-section button.active,
html.lb-theme-dark .nav-link.active,
html.lb-theme-dark .support-btn.primary,
html.lb-theme-dark .checkout-btn,
html.lb-theme-dark .ty-btn.primary,
html.lb-theme-dark .co-confirm-btn.ok,
html.lb-theme-dark .add-btn,
html.lb-theme-dark .cart-btn {
  background: linear-gradient(135deg, #ff8a1a, #fb923c) !important;
  color: #ffffff !important;
  border-color: transparent !important;
}
html.lb-theme-dark .meta-pill,
html.lb-theme-dark .store-cat,
html.lb-theme-dark .rating-chip,
html.lb-theme-dark .badge,
html.lb-theme-dark .co-badge,
html.lb-theme-dark .ty-pill,
html.lb-theme-dark .status,
html.lb-theme-dark .timeline span {
  background: rgba(255, 138, 26, 0.14) !important;
  border-color: rgba(255, 186, 114, 0.46) !important;
  color: #ffd29f !important;
}
html.lb-theme-dark .cart-item,
html.lb-theme-dark .table-row,
html.lb-theme-dark .pref-row,
html.lb-theme-dark .order-card,
html.lb-theme-dark .timeline span {
  border-color: rgba(148, 163, 184, 0.3) !important;
}
html.lb-theme-dark .status.processing { color: #fbbf24 !important; }
html.lb-theme-dark .status.shipped { color: #7dd3fc !important; }
html.lb-theme-dark .status.delivered { color: #86efac !important; }
html.lb-theme-dark .status.cancelled { color: #fca5a5 !important; }
`;
    document.head.appendChild(style);
  };

  ensureGlobalDarkCustomerStyles();

  // Derive include and welcome bases from the script URL so paths work regardless of hosting root.
  const includeBase = (() => {
    try {
      const script =
        document.currentScript ||
        Array.from(document.querySelectorAll("script[src]")).find((s) => s.src.includes("include.js"));
      if (script && script.src) return new URL("./", script.src).href;
    } catch {}
    try {
      return new URL("../includes/", window.location.href).href;
    } catch {
      return null;
    }
  })();
  const welcomeBase = includeBase ? includeBase.replace(/includes\/?$/, "") : null;
  const welcomePath = (suffix) => {
    const clean = String(suffix || "").replace(/^\/+/, "");
    if (welcomeBase) return `${welcomeBase}${clean}`;
    return `/welcome/${clean}`;
  };
  const includeCandidates = (name) => {
    // Prefer root-based components so nested routes fetch correctly on Vercel.
    const candidates = [`/components/${name}`];
    if (includeBase) candidates.push(`${includeBase}${name}`);
    candidates.push(`${welcomePath("includes/")}${name}`);
    return candidates;
  };
  const hostName = String(window.location.hostname || "").trim();
  const isPrivateLanHost = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostName);
  const isLocalHost = ["localhost", "127.0.0.1"].includes(hostName) || isPrivateLanHost || window.location.protocol === "file:";
  const isVercelHost = hostName.endsWith(".vercel.app");
  const localOrigin = window.location.protocol === "file:" ? "http://localhost:5000" : `${window.location.protocol}//${hostName}:5000`;
  const hostedOrigin = window.location.origin;
  const API_BASE = isLocalHost
    ? `${window.API_BASE_URL}/api`
    : (isVercelHost ? `${window.API_BASE_URL}/api` : `${window.API_BASE_URL}/api`);
  const THEME_KEY = "lbThemeMode";
  const isMobileViewport = () =>
    !!(window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
  const getThemeToggles = () =>
    Array.from(document.querySelectorAll("#themeToggleBtn, #lbThemeToggleBtnMobile"));
  const placeThemeToggle = () => {
    const mobileSlot = document.getElementById("lbMobileThemeSlot");
    if (!mobileSlot) return;
    mobileSlot.classList.add("has-toggle");
  };
  const resolveInitialTheme = () => {
    const saved = String(localStorage.getItem(THEME_KEY) || "").trim().toLowerCase();
    if (saved === "dark" || saved === "light") return saved;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  };
  const applyThemeMode = (mode) => {
    const dark = String(mode || "").toLowerCase() === "dark";
    document.documentElement.classList.toggle("lb-theme-dark", dark);
    getThemeToggles().forEach((toggle) => {
      toggle.setAttribute("aria-pressed", dark ? "true" : "false");
    });
  };
  const initThemeToggle = () => {
    applyThemeMode(resolveInitialTheme());
    placeThemeToggle();
    const bindToggle = (toggle) => {
      if (!toggle || toggle.dataset.bound === "1") return;
      const track = toggle.querySelector(".theme-toggle-track");
      if (track) {
        let thumb = track.querySelector(".theme-toggle-thumb");
        if (!thumb) {
          thumb = document.createElement("span");
          thumb.className = "theme-toggle-thumb";
          track.appendChild(thumb);
        }
        thumb.style.display = "block";
        thumb.style.opacity = "1";
        thumb.style.visibility = "visible";
        thumb.style.pointerEvents = "none";
      }
      toggle.style.display = "inline-flex";
      toggle.style.visibility = "visible";
      toggle.style.opacity = "1";
      toggle.dataset.bound = "1";
      toggle.addEventListener("click", () => {
        const dark = !document.documentElement.classList.contains("lb-theme-dark");
        const mode = dark ? "dark" : "light";
        localStorage.setItem(THEME_KEY, mode);
        applyThemeMode(mode);
      });
    };
    getThemeToggles().forEach(bindToggle);
  };
  const handleThemeTogglePlacement = () => {
    placeThemeToggle();
    getThemeToggles().forEach((toggle) => {
      toggle.style.display = "inline-flex";
    });
  };

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
        const loop = copyWidth + spacer;
        const speed = Math.max(minSpeed, Math.min(maxSpeed, loop / speedDivisor));
        track.innerHTML = `<span class="lb-loc-copy">${safeText}</span><span class="lb-loc-gap" aria-hidden="true" style="display:inline-block;min-width:${spacer}px;"></span><span class="lb-loc-copy" aria-hidden="true">${safeText}</span>`;
        target.style.setProperty("--lb-loc-loop", String(loop));
        target.style.setProperty("--lb-loc-speed", `${speed}s`);
        target.classList.add("is-marquee");
      }
    });
  };

  const setMobileLocationTicker = (text) => {
    setLocationTicker("locTextMobile", text, { spacer: 32, minOverflow: 6, minSpeed: 7, maxSpeed: 18, speedDivisor: 22 });
  };
  const setDesktopLocationTicker = (text) => {
    setLocationTicker("locText", text, { spacer: 26, minOverflow: 8, minSpeed: 8, maxSpeed: 20, speedDivisor: 24 });
  };
  window.lbSetLocMobileText = setMobileLocationTicker;
  window.lbSetLocDesktopText = setDesktopLocationTicker;

  const getDefaultTimeZone = () => "Asia/Kolkata";
  const isValidTimeZone = (timeZone) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: String(timeZone || "") }).format(new Date(0));
      return true;
    } catch {
      return false;
    }
  };
  const getAppTimeZone = () => {
    const candidate = getDefaultTimeZone();
    return isValidTimeZone(candidate) ? candidate : "Asia/Kolkata";
  };
  const getHourInTimeZone = (timeZone) => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hour12: false,
        timeZone: String(timeZone || "Asia/Kolkata")
      }).formatToParts(new Date());
      const hourPart = parts.find((p) => p.type === "hour")?.value;
      const hour = Number(hourPart);
      return Number.isFinite(hour) ? hour : new Date().getHours();
    } catch {
      return new Date().getHours();
    }
  };
  const getTimeGreeting = () => {
    const hour = getHourInTimeZone(getAppTimeZone());
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    if (hour < 21) return "Evening";
    return "Night";
  };

  const syncHeaderLocation = () => {
    const loc = localStorage.getItem("lbAddr") || "Select Location";
    setDesktopLocationTicker(loc);
    setMobileLocationTicker(loc);
  };

  const ensureMobileLocationRow = () => {
    const headerHost = document.getElementById("siteHeader");
    if (!headerHost) return;

    let row = headerHost.querySelector(".mobile-loc-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "mobile-loc-row";
      row.innerHTML = `
        <button class="lb-header-back" id="lbHeaderBackBtn" type="button" aria-label="Go back">
          <span>&larr;</span>
        </button>
        <button class="mobile-loc-btn" id="mobileLocBtn" type="button">
          <span class="pill">Location</span>
          <span id="locTextMobile">Select Location</span>
        </button>
      `;
      headerHost.appendChild(row);
    }

    const legacyBack = row.querySelector("#lbHeaderBackBtnMobile");
    if (legacyBack && !row.querySelector("#lbHeaderBackBtn")) {
      legacyBack.id = "lbHeaderBackBtn";
      legacyBack.classList.remove("mobile");
    }

    if (!row.querySelector("#mobileLocBtn")) {
      const locBtn = document.createElement("button");
      locBtn.className = "mobile-loc-btn";
      locBtn.id = "mobileLocBtn";
      locBtn.type = "button";
      locBtn.innerHTML = `<span class="pill">Location</span><span id="locTextMobile">Select Location</span>`;
      row.appendChild(locBtn);
    }

    row.style.display = "flex";
  };

  const syncHeaderAuth = () => {
    const normalizeThemeTogglePlacement = () => {
      placeThemeToggle();
    };

    const ensureHeaderAccountNode = () => {
      let account = document.getElementById("userAccount");
      const navActions = document.querySelector(".nav-actions");
      if (!navActions) return null;
      const loginWrap = navActions.querySelector(".login-theme-wrap");
      const placeAfterLoginWrap = () => {
        if (!account) return;
        if (loginWrap && loginWrap.parentElement === navActions) {
          if (loginWrap.nextSibling) navActions.insertBefore(account, loginWrap.nextSibling);
          else navActions.appendChild(account);
        } else {
          navActions.appendChild(account);
        }
      };

      if (account) {
        // Heal old/cached layout where account was mounted inside login-theme-wrap.
        if (loginWrap && account.parentElement === loginWrap) {
          placeAfterLoginWrap();
        }
        return account;
      }

      account = document.createElement("div");
      account.id = "userAccount";
      account.className = "user-account";
      account.style.display = "none";
      account.innerHTML = `
        <button class="user-avatar" id="accountBtn" type="button">
          <span id="userInitials">A</span>
        </button>
        <div class="user-menu" id="userMenu">
          <p id="userFullName">Welcome!</p>
          <button type="button" data-action="profile">My Profile</button>
          <button type="button" data-action="orders">My Orders</button>
          <button type="button" data-action="logout" style="color: var(--danger);">Logout</button>
        </div>
      `;
      placeAfterLoginWrap();
      return account;
    };

    normalizeThemeTogglePlacement();
    ensureHeaderAccountNode();
    const user = JSON.parse(localStorage.getItem("lbUser") || "null");
    const token = String(localStorage.getItem("lbToken") || "").trim();
    const loginBtn = document.getElementById("loginBtn");
    const loginWrap = document.querySelector(".login-theme-wrap");
    const userAccount = document.getElementById("userAccount");
    const userInitials = document.getElementById("userInitials");
    const userFullName = document.getElementById("userFullName");
    const mobileHeaderKicker = document.getElementById("mobileHeaderKicker");
    const mobileGreetingEyebrow = document.getElementById("mobileGreetingEyebrow");
    const displayNameRaw = user && (
      user.name ||
      user.fullName ||
      user.username ||
      user.email ||
      user.phone ||
      user.mobile ||
      ""
    );
    const displayName = String(displayNameRaw || "").trim();
    const hasSession = !!(
      token ||
      (user && (user.id || user._id || user.email || user.phone || user.mobile || displayName))
    );

    const timeGreeting = getTimeGreeting();
    if (mobileHeaderKicker) mobileHeaderKicker.textContent = timeGreeting;
    if (mobileGreetingEyebrow) mobileGreetingEyebrow.textContent = timeGreeting;

    if (hasSession) {
      if (loginBtn) loginBtn.style.display = "none";
      if (loginWrap && !loginWrap.querySelector("#themeToggleBtn")) loginWrap.style.display = "none";
      if (userAccount) userAccount.style.display = "inline-flex";
      const initialsSource = displayName.includes("@")
        ? displayName.split("@")[0]
        : displayName;
      const initials = String(initialsSource || "Account")
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      if (userInitials) userInitials.textContent = initials || "A";
      if (userFullName) userFullName.textContent = displayName || "Account";
    } else {
      if (loginBtn) loginBtn.style.display = "flex";
      if (loginWrap) loginWrap.style.display = "inline-flex";
      if (userAccount) userAccount.style.display = "none";
    }
  };

  if (!document.body.dataset.lbGreetingClockBound) {
    window.setInterval(() => {
      const mobileHeaderKicker = document.getElementById("mobileHeaderKicker");
      const mobileGreetingEyebrow = document.getElementById("mobileGreetingEyebrow");
      const timeGreeting = getTimeGreeting();
      if (mobileHeaderKicker) mobileHeaderKicker.textContent = timeGreeting;
      if (mobileGreetingEyebrow) mobileGreetingEyebrow.textContent = timeGreeting;
    }, 60000);
    document.body.dataset.lbGreetingClockBound = "1";
  }

  const ensureGlobalUtilityStyles = () => {
    if (document.getElementById("lbGlobalUtilityStyles")) return;
    const style = document.createElement("style");
    style.id = "lbGlobalUtilityStyles";
    style.textContent = `
.lb-global-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;z-index:5500;padding:14px}
.lb-global-card{background:#fff;border-radius:20px;max-width:420px;width:100%;padding:20px;box-shadow:0 22px 40px -20px rgba(0,0,0,.42)}
.lb-global-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.lb-global-head h3{margin:0;font-size:24px;font-weight:800}
.lb-global-x{width:34px;height:34px;border:none;border-radius:999px;background:#f1f5f9;cursor:pointer;font-size:20px}
.lb-global-input{width:100%;height:44px;border:1px solid #e2e8f0;border-radius:12px;padding:0 12px;font-size:14px;margin:8px 0;background:#f8fafc}
.lb-global-row{display:flex;gap:8px}
.lb-global-btn{height:42px;border:none;border-radius:12px;padding:0 14px;font-weight:800;cursor:pointer}
.lb-global-btn.primary{background:#ff8a1a;color:#fff}
.lb-global-btn.soft{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}
.lb-global-note{font-size:12px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin:8px 0}
.lb-global-card h3{color:#0f172a}
html.lb-theme-dark .lb-global-card{background:linear-gradient(165deg,#0f1c31,#14233c);border:1px solid rgba(148,163,184,.32);color:#dbe7fb}
html.lb-theme-dark .lb-global-card h3{color:#f3f8ff}
html.lb-theme-dark .lb-global-x{background:#12223a;color:#dbe7fb;border:1px solid rgba(148,163,184,.3)}
html.lb-theme-dark .lb-global-note{background:#0f1c31;color:#9eb0ca;border-color:rgba(148,163,184,.3)}
html.lb-theme-dark .lb-global-input{background:#0f1c31;color:#dbe7fb;border-color:rgba(148,163,184,.3)}
html.lb-theme-dark .lb-global-input::placeholder{color:#8ea1bd}
html.lb-theme-dark .lb-global-btn.soft{background:#12223a;color:#ffd29f;border-color:rgba(255,186,114,.42)}
html.lb-theme-dark .lb-global-btn.primary{background:linear-gradient(135deg,#ff8a1a,#fb923c);color:#fff}
`;
    document.head.appendChild(style);
  };

  const ensureGlobalLocationModal = () => {
    let modal = document.getElementById("lbGlobalLocationModal");
    if (modal) return modal;
    ensureGlobalUtilityStyles();
    modal = document.createElement("div");
    modal.id = "lbGlobalLocationModal";
    modal.className = "lb-global-overlay";
    modal.innerHTML = `
      <div class="lb-global-card" onclick="event.stopPropagation()">
        <div class="lb-global-head">
          <h3>Change Location</h3>
          <button class="lb-global-x" type="button" aria-label="Close">&times;</button>
        </div>
        <div class="lb-global-note" id="lbGlobalLocMsg">Use current location or enter pincode.</div>
        <div class="lb-global-row">
          <button class="lb-global-btn soft" id="lbGlobalDetectLocBtn" type="button">Use Current Location</button>
          <button class="lb-global-btn soft" id="lbGlobalImproveLocBtn" type="button">Improve Accuracy</button>
        </div>
        <div class="lb-global-row" style="margin-top:8px;">
          <input class="lb-global-input" id="lbGlobalPinInput" type="text" placeholder="Enter 6-digit pincode" style="margin:0;flex:1;">
          <button class="lb-global-btn primary" id="lbGlobalPinApplyBtn" type="button">Apply</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => { modal.style.display = "none"; document.body.style.overflow = ""; };
    const msgEl = () => document.getElementById("lbGlobalLocMsg");
    const setMsg = (text) => { const el = msgEl(); if (el) el.textContent = text; };
    const setLocation = (pincode, area) => {
      if (!pincode) return;
      localStorage.setItem("lbPin", String(pincode));
      localStorage.setItem("lbAddr", area ? `Area: ${area}` : `Pincode: ${pincode}`);
      localStorage.setItem("lbLocUpdatedAt", new Date().toISOString());
      syncHeaderLocation();
      window.dispatchEvent(new Event("lb-location-updated"));
      close();
    };

    const detectLocation = async (forceHigh) => {
      if (!navigator.geolocation) {
        setMsg("Geolocation is not supported on this browser.");
        return;
      }
      setMsg("Detecting your location...");
      const getPos = () => new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: !!forceHigh,
          timeout: forceHigh ? 18000 : 9000,
          maximumAge: forceHigh ? 0 : 45000
        });
      });
      try {
        const pos = await getPos();
        const lat = Number(pos?.coords?.latitude || 0);
        const lon = Number(pos?.coords?.longitude || 0);
        const res = await fetch(`${API_BASE}/location/nearby-stores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: lat, longitude: lon })
        });
        const data = await res.json().catch(() => ({}));
        if (!data?.success || !data?.pincode) throw new Error("Pincode not found");
        setLocation(data.pincode, data.area || "");
      } catch {
        setMsg("Unable to detect precise location. Enter pincode manually.");
      }
    };

    const closeBtn = modal.querySelector(".lb-global-x");
    const pinBtn = document.getElementById("lbGlobalPinApplyBtn");
    const pinInput = document.getElementById("lbGlobalPinInput");
    const detectBtn = document.getElementById("lbGlobalDetectLocBtn");
    const improveBtn = document.getElementById("lbGlobalImproveLocBtn");
    if (closeBtn) closeBtn.addEventListener("click", close);
    modal.addEventListener("click", close);
    if (pinInput) {
      pinInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        if (pinBtn) pinBtn.click();
      });
    }
    if (pinBtn) {
      pinBtn.addEventListener("click", () => {
        const pin = String(pinInput?.value || "").trim().replace(/\D/g, "");
        if (!/^\d{6}$/.test(pin)) {
          setMsg("Enter a valid 6-digit pincode.");
          return;
        }
        setLocation(pin, "");
      });
    }
    if (detectBtn) detectBtn.addEventListener("click", () => detectLocation(false));
    if (improveBtn) improveBtn.addEventListener("click", () => detectLocation(true));
    return modal;
  };

  const ensureGlobalAuthModal = () => {
    let modal = document.getElementById("lbGlobalAuthModal");
    if (modal) return modal;
    ensureGlobalUtilityStyles();
    modal = document.createElement("div");
    modal.id = "lbGlobalAuthModal";
    modal.className = "lb-global-overlay";
    modal.innerHTML = `
      <div class="lb-global-card" onclick="event.stopPropagation()">
        <div class="lb-global-head">
          <h3>Log In</h3>
          <button class="lb-global-x" type="button" aria-label="Close">&times;</button>
        </div>
        <div class="lb-global-note" id="lbGlobalAuthMsg">Use your registered phone/email and password.</div>
        <input class="lb-global-input" id="lbGlobalAuthIdentifier" type="text" placeholder="Phone or Email">
        <input class="lb-global-input" id="lbGlobalAuthPassword" type="password" placeholder="Password">
        <button class="lb-global-btn primary" id="lbGlobalAuthSubmit" type="button" style="width:100%;">Continue</button>
      </div>
    `;
    document.body.appendChild(modal);
    const close = () => { modal.style.display = "none"; document.body.style.overflow = ""; };
    const setMsg = (text) => {
      const el = document.getElementById("lbGlobalAuthMsg");
      if (el) el.textContent = text;
    };
    const closeBtn = modal.querySelector(".lb-global-x");
    const submitBtn = document.getElementById("lbGlobalAuthSubmit");
    const idInput = document.getElementById("lbGlobalAuthIdentifier");
    const passInput = document.getElementById("lbGlobalAuthPassword");
    if (closeBtn) closeBtn.addEventListener("click", close);
    modal.addEventListener("click", close);
    if (passInput) {
      passInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        if (submitBtn) submitBtn.click();
      });
    }
    if (submitBtn) {
      submitBtn.addEventListener("click", async () => {
        const identifier = String(idInput?.value || "").trim();
        const password = String(passInput?.value || "").trim();
        if (!identifier || !password) {
          setMsg("Phone/email and password are required.");
          return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = "Logging in...";
        try {
          const res = await fetch(`${API_BASE}/customer/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data?.success || !data?.user) throw new Error(data?.message || "Login failed");
          localStorage.setItem("lbUser", JSON.stringify(data.user));
          if (data.token) localStorage.setItem("lbToken", data.token);
          syncHeaderAuth();
          window.dispatchEvent(new Event("lb-auth-updated"));
          close();
        } catch (err) {
          setMsg(String(err?.message || "Unable to login. Please try again."));
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = "Continue";
        }
      });
    }
    return modal;
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
  ensureMobileLocationRow();
  initThemeToggle();

  document.body.classList.add("lb-with-footer");
  const hasMain = !!document.querySelector("main");
  document.body.classList.toggle("lb-no-main-footer", !hasMain);

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


  syncHeaderLocation();

  const user = JSON.parse(localStorage.getItem("lbUser") || "null");
  const loginBtn = document.getElementById("loginBtn");
  const userAccount = document.getElementById("userAccount");
  const userInitials = document.getElementById("userInitials");
  const userFullName = document.getElementById("userFullName");

  syncHeaderAuth();

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
      window.dispatchEvent(new Event("lb-location-modal-opened"));
    } else {
      const globalModal = ensureGlobalLocationModal();
      if (!globalModal) return;
      globalModal.style.display = "flex";
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new Event("lb-location-modal-opened"));
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

  const adminLoginBtn = document.getElementById("lbAdminLoginBtn");
  const adminPopupOverlay = document.getElementById("lbAdminPopupOverlay");
  const adminPopupClose = document.getElementById("lbAdminPopupClose");
  const adminPopupForm = document.getElementById("lbAdminPopupForm");
  const adminUserInput = document.getElementById("lbAdminUser");
  const adminPassInput = document.getElementById("lbAdminPass");
  const adminPopupError = document.getElementById("lbAdminPopupError");
  const openAdminPopup = () => {
    if (!adminPopupOverlay) return;
    adminPopupOverlay.hidden = false;
    if (adminPopupError) adminPopupError.textContent = "";
    if (adminPopupForm) adminPopupForm.reset();
    if (adminUserInput) adminUserInput.focus();
    document.body.style.overflow = "hidden";
  };
  const closeAdminPopup = () => {
    if (!adminPopupOverlay) return;
    adminPopupOverlay.hidden = true;
    if (adminPopupError) adminPopupError.textContent = "";
    document.body.style.overflow = "";
  };
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener("click", openAdminPopup);
  }
  if (adminPopupClose) {
    adminPopupClose.addEventListener("click", closeAdminPopup);
  }
  if (adminPopupOverlay) {
    adminPopupOverlay.addEventListener("click", (e) => {
      if (e.target === adminPopupOverlay) closeAdminPopup();
    });
  }
  if (adminPopupForm) {
    adminPopupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const userId = String(adminUserInput?.value || "").trim();
      const pass = String(adminPassInput?.value || "").trim();
      if (userId === "shubham" && pass === "1234") {
        closeAdminPopup();
        window.location.href = welcomePath("admin/admin.html");
        return;
      }
      if (adminPopupError) adminPopupError.textContent = "Invalid ID or password.";
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && adminPopupOverlay && !adminPopupOverlay.hidden) {
      closeAdminPopup();
    }
  });

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
  const currentPath = String(window.location.pathname || "").toLowerCase();
  const isHomePage = currentPath.endsWith("/customer/index.html") || currentPath.endsWith("/welcome/customer/index.html");
  [headerBackBtn, headerBackBtnMobile].forEach((btn) => {
    if (!btn) return;
    btn.style.display = isHomePage ? "none" : "inline-flex";
    btn.addEventListener("click", goBackSafe);
  });

  const floatingBackBtn = document.querySelector(".lb-back-btn");
  if (floatingBackBtn) floatingBackBtn.remove();

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
  window.addEventListener("lb-location-updated", syncHeaderLocation);
  window.addEventListener("lb-auth-updated", syncHeaderAuth);
  window.addEventListener("resize", () => {
    syncHeaderAuth();
    handleThemeTogglePlacement();
  }, { passive: true });
  window.addEventListener("storage", (e) => {
    if (e.key === key || e.key === "lbCart" || e.key === "lbCart_guest") {
      refreshCartFromStorage();
    }
    if (e.key === "lbAddr") syncHeaderLocation();
    if (e.key === "lbUser" || e.key === "lbToken") syncHeaderAuth();
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
        const globalModal = ensureGlobalAuthModal();
        if (!globalModal) return;
        globalModal.style.display = "flex";
        document.body.style.overflow = "hidden";
      }
    });
  }

  const accountBtn = document.getElementById("accountBtn");
  const userMenu = document.getElementById("userMenu");
  const isUserLoggedIn = () => {
    try {
      const raw = localStorage.getItem("lbUser");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed && (parsed.id || parsed.customer_id || parsed.phone || parsed.email));
    } catch {
      return false;
    }
  };
  const openLoginPopup = () => {
    if (typeof window.openAuth === "function") {
      window.openAuth();
      return;
    }
    if (loginBtn) loginBtn.click();
  };
  if (accountBtn && userMenu) {
    accountBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isUserLoggedIn()) {
        openLoginPopup();
        return;
      }
      userMenu.style.display = userMenu.style.display === "flex" ? "none" : "flex";
    });
    document.addEventListener("click", (e) => {
      if (!userMenu.contains(e.target) && !e.target.closest("#accountBtn")) {
        userMenu.style.display = "none";
      }
    });
  }

  document.querySelectorAll("[data-action='profile']").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!isUserLoggedIn()) {
        openLoginPopup();
        return;
      }
      window.location.href = welcomePath("customer/profile/profile.html");
    });
  });
  document.querySelectorAll("[data-action='orders']").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!isUserLoggedIn()) {
        openLoginPopup();
        return;
      }
      window.location.href = welcomePath("customer/order/customer-orders.html");
    });
  });
  document.querySelectorAll("[data-action='logout']").forEach(btn => {
    btn.addEventListener("click", () => {
      localStorage.removeItem("lbUser");
      localStorage.removeItem("lbToken");
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
        if (key === "profile") {
          if (!isUserLoggedIn()) {
            openLoginPopup();
            return;
          }
          window.location.href = welcomePath("customer/profile/profile.html");
        }
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
