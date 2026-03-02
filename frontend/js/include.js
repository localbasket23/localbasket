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
  }
  await loadHeader();
  await loadFooter();

});
