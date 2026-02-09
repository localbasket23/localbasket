(function () {
  const page = (location.pathname.split("/").pop() || "admin.html").toLowerCase();

  const menu = [
    { file: "admin.html", icon: "fa-chart-pie", label: "Dashboard" },
    { file: "admin-sellers.html", icon: "fa-user-check", label: "Seller Verification" },
    { file: "admin-products.html", icon: "fa-box-open", label: "Products" },
    { file: "admin-orders.html", icon: "fa-shopping-cart", label: "Orders" },
    { file: "admin-payments.html", icon: "fa-wallet", label: "Payments" },
    { file: "admin-audit.html", icon: "fa-clipboard-list", label: "Audit Logs" },
    { file: "admin-reports.html", icon: "fa-chart-line", label: "Reports" },
    { file: "admin-categories.html", icon: "fa-tags", label: "Categories" },
    { file: "admin-settings.html", icon: "fa-cog", label: "Settings" }
  ];

  function ensureOverlay() {
    let overlay = document.getElementById("sidebarOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "sidebarOverlay";
      document.body.prepend(overlay);
    }
    overlay.addEventListener("click", closeSidebar);
    return overlay;
  }

  function openSidebar() {
    const sb = document.querySelector(".sidebar");
    const overlay = ensureOverlay();
    if (!sb) return;
    sb.classList.add("open");
    overlay.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    const sb = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (sb) sb.classList.remove("open");
    if (overlay) overlay.classList.remove("show");
    document.body.style.overflow = "auto";
  }

  function toggleSidebarState() {
    const sb = document.querySelector(".sidebar");
    if (!sb) return;
    if (sb.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  window.toggleMenu = toggleSidebarState;
  window.toggleSidebar = toggleSidebarState;

  function bindMobileButtons() {
    document.querySelectorAll(".menu-toggle, .mobile-toggle").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openSidebar();
      });
    });
    document.querySelectorAll(".close-sidebar").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        closeSidebar();
      });
    });
  }

  function renderSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    const items = menu.map(item => {
      const active = page === item.file ? "active" : "";
      return `<button class="${active}" data-link="${item.file}"><i class="fas ${item.icon}"></i> ${item.label}</button>`;
    }).join("");

    sidebar.innerHTML = `
      <button class="close-sidebar" aria-label="Close menu">
        <i class="fas fa-times"></i>
      </button>
      <div class="brand">
        <img src="/welcome/logo2.png" alt="Logo">
        <h2>Admin Panel</h2>
      </div>
      <div class="menu">
        ${items}
        <button data-logout style="margin-top: 18px; background: rgba(255,71,87,0.25);">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    `;

    sidebar.querySelectorAll("button[data-link]").forEach(btn => {
      btn.addEventListener("click", () => {
        location.href = btn.getAttribute("data-link");
      });
    });

    const logoutBtn = sidebar.querySelector("button[data-logout]");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (typeof window.logout === "function") {
          window.logout();
        } else if (confirm("Logout?")) {
          localStorage.clear();
          location.href = "login.html";
        }
      });
    }
  }

  function ensureThemeToggle() {
    const top = document.querySelector(".topbar") || document.querySelector(".top-nav") || document.querySelector(".top-header");
    if (!top || top.querySelector("#themeToggle")) return;

    if (!top.classList.contains("lb-header")) top.classList.add("lb-header");
    let right = top.querySelector(".lb-header-right");
    if (!right) {
      right = document.createElement("div");
      right.className = "lb-header-right";
      top.appendChild(right);
    }

    const holder = document.createElement("div");
    holder.className = "lb-theme-pill";
    holder.innerHTML = `
      <i class="fas fa-moon"></i>
      <label class="lb-switch">
        <input type="checkbox" id="themeToggle">
        <span class="lb-slider"></span>
      </label>
    `;

    right.appendChild(holder);
  }

  function ensureMenuToggle() {
    const top = document.querySelector(".topbar") || document.querySelector(".top-nav") || document.querySelector(".top-header");
    if (!top) return;
    if (!top.classList.contains("lb-header")) top.classList.add("lb-header");
    const left = top.querySelector(".lb-header-left") || top;
    if (left.querySelector(".menu-toggle") || left.querySelector(".mobile-toggle")) return;

    const btn = document.createElement("button");
    btn.className = "menu-toggle";
    btn.innerHTML = '<i class="fas fa-bars"></i>';
    left.prepend(btn);
  }

  function initTheme() {
    const themeToggle = document.getElementById("themeToggle");
    const isDark = localStorage.getItem("theme") === "dark";
    document.body.classList.toggle("dark", isDark);
    if (themeToggle) {
      themeToggle.checked = isDark;
      themeToggle.addEventListener("change", () => {
        const dark = themeToggle.checked;
        document.body.classList.toggle("dark", dark);
        localStorage.setItem("theme", dark ? "dark" : "light");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureOverlay();
    renderSidebar();
    ensureMenuToggle();
    ensureThemeToggle();
    initTheme();
    bindMobileButtons();
  });
})();
