(function () {
  var OPEN_AUTH_FLAG = "lbOpenAuthAfterRedirect";

  function getAuthContainer() {
    return document.getElementById("authOverlay") || document.getElementById("authModal");
  }

  function isCustomerHome() {
    var p = String(window.location.pathname || "").toLowerCase();
    return p.endsWith("/welcome/customer/index.html") || p === "/welcome/customer/index.html";
  }

  function openAuthPopup() {
    var authContainer = getAuthContainer();
    if (authContainer) {
      authContainer.style.display = "flex";
      authContainer.classList.add("active");
      return true;
    }

    return false;
  }

  function bindLoginButtons() {
    var triggers = document.querySelectorAll("#loginBtn, [data-login]");
    triggers.forEach(function (btn) {
      if (!btn || btn.dataset.lbAuthBound) return;
      btn.addEventListener("click", function (e) {
        if (e) e.preventDefault();
        var opened = openAuthPopup();
        if (!opened) {
          try {
            sessionStorage.setItem(OPEN_AUTH_FLAG, "1");
          } catch (err) {
            // ignore storage failures
          }
          if (!isCustomerHome()) {
            window.location.href = "/welcome/customer/index.html";
          }
        }
      });
      btn.dataset.lbAuthBound = "1";
    });
  }

  function initAuth() {
    bindLoginButtons();
    try {
      if (sessionStorage.getItem(OPEN_AUTH_FLAG) === "1") {
        sessionStorage.removeItem(OPEN_AUTH_FLAG);
        openAuthPopup();
      }
    } catch (err) {
      // ignore storage failures
    }
  }

  window.initAuth = initAuth;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }

  var headerHost = document.getElementById("header");
  if (headerHost && "MutationObserver" in window) {
    var observer = new MutationObserver(function () {
      bindLoginButtons();
    });
    observer.observe(headerHost, { childList: true, subtree: true });
  }
})();
